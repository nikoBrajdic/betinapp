import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const member = '00000000-0000-4000-8000-000000000001'
const outsider = '00000000-0000-4000-8000-000000000002'
const candidate = '00000000-0000-4000-8000-000000000003'
async function asUser(id: string | null) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ''])
  await db.exec(`set role ${id ? 'authenticated' : 'anon'}`)
}
async function sqlFile(file: string) { await db.exec(await readFile(new URL(`../scripts/${file}`, import.meta.url), 'utf8')) }

before(async () => {
  // Minimal Supabase auth/storage harness; app tables use the actual migrations.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select jsonb_build_object('email', email) from auth.users where id = auth.uid() $$;
    create table storage.buckets(id text primary key, name text, public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated;
  `)
  await sqlFile('001_create_tables.sql')
  await sqlFile('002_enable_rls.sql')
  await sqlFile('004_create_auth_tables.sql')
  await sqlFile('010_consolidated_final_migration.sql')
  await sqlFile('014_fix_allowlist_rls.sql')
  await sqlFile('020_create_diary_entries.sql')
  await sqlFile('032_create_season_closings.sql')
  await sqlFile('034_create_inventory.sql')
  await db.query('insert into auth.users(id,email) values ($1,$2),($3,$4),($5,$6)', [member, 'family@example.com', outsider, 'stranger@example.com', candidate, 'new@example.com'])
  // Historical signup trigger creates profiles, including the outsider.
  await db.query('delete from profiles where id=$1', [candidate])
  await db.exec(`insert into allowlist(email,role) values ('family@example.com','superadmin'),('new@example.com','superadmin')`)
  await db.query("update profiles set role='superadmin' where id=$1", [member])
  await db.exec(`insert into notes(title,content) values ('Private note','private');
    grant all on all tables in schema public, storage to anon, authenticated;`)
  await sqlFile('036_household_access.sql')
  await sqlFile('037_atomic_season_lists.sql')
})
after(async () => { await db.close() })

test('anonymous and non-allowlisted accounts cannot read or write household data', async () => {
  for (const id of [null, outsider]) {
    await asUser(id)
    assert.equal((await db.query('select * from notes')).rows.length, 0)
    assert.equal((await db.query('select * from allowlist')).rows.length, 0)
    await assert.rejects(db.exec("insert into notes(title,content) values ('bad','bad')"))
    await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values ('inventory-photos','bad')"))
  }
  await asUser(member)
  assert.equal((await db.query('select * from notes')).rows.length, 1)
  await db.exec("insert into storage.objects(bucket_id,name) values ('inventory-photos','family.webp')")
})

test('new members need approval; they cannot self-approve or insert a profile', async () => {
  await asUser(candidate)
  assert.equal((await db.query('select * from allowlist')).rows.length, 1)
  assert.equal((await db.query('select * from notes')).rows.length, 0)
  await assert.rejects(db.query('select complete_household_signup()'))
  await assert.rejects(db.query("insert into profiles(id,email,role) values ($1,'new@example.com','superadmin')", [candidate]))
  await assert.rejects(db.exec("insert into join_requests(email,status) values ('new@example.com','approved')"))
  await db.exec("insert into join_requests(email,status) values ('new@example.com','pending')")
  await db.exec("update join_requests set status='approved' where email='new@example.com'")
  assert.equal((await db.query<{ status: string }>("select status from join_requests where email='new@example.com'")).rows[0].status, 'pending')
  await asUser(member)
  await db.exec("update join_requests set status='approved' where email='new@example.com'")
  await asUser(candidate)
  await db.exec('select complete_household_signup()')
  assert.equal((await db.query('select * from notes')).rows.length, 1)
  await asUser(member)
  await db.exec("delete from allowlist where email='new@example.com'")
  await asUser(candidate)
  assert.equal((await db.query('select * from notes')).rows.length, 0)
})

test('new years copy customized tasks unchecked and repeated creation is idempotent', async () => {
  await asUser(member)
  const template = [{ area: 'House', title: 'Lock door' }]
  const create = async (year: number) => (await db.query<{ id: string }>(
    "select ensure_season_closing($1, 'apartman', $2::jsonb) as id", [year, JSON.stringify(template)],
  )).rows[0].id
  const first = await create(2026)
  await db.query("update season_tasks set title='Lock the new door', done=true, done_at=now() where closing_id=$1", [first])
  const next = await create(2027)
  assert.equal(await create(2027), next)
  const { rows } = await db.query<{ title: string; done: boolean; done_at: string | null }>('select title,done,done_at from season_tasks where closing_id=$1', [next])
  assert.deepEqual(rows, [{ title: 'Lock the new door', done: false, done_at: null }])
  await db.query('delete from season_tasks where closing_id=$1', [next])
  const empty = await create(2028)
  assert.equal((await db.query('select * from season_tasks where closing_id=$1', [empty])).rows.length, 0)
})

test('checklist writes roll back on failure and preserve concurrent additions and ticks', async () => {
  await asUser(member)
  const closing = (await db.query<{ id: string }>("select ensure_season_closing(2026,'kuca','[]') as id")).rows[0].id
  const other = (await db.query<{ id: string }>("select ensure_season_closing(2026,'garsonjera','[]') as id")).rows[0].id
  const add = async (id: string, title: string) => (await db.query<{ id: string }>('insert into season_tasks(closing_id,area,title) values ($1,\'House\',$2) returning id', [id,title])).rows[0].id
  const original = await add(closing, 'Original')
  const concurrent = await add(closing, 'Added on another phone')
  const foreign = await add(other, 'Other list')
  await db.query('update season_tasks set done=true where id=$1', [original])
  const save = (rows: object[]) => db.query('select save_season_tasks($1,$2::jsonb,$3::uuid[])', [closing, JSON.stringify(rows), [original]])
  await assert.rejects(save([{ id: foreign, area: 'House', title: 'Wrong list' }]), /Checklist changed/)
  assert.equal((await db.query('select * from season_tasks where id=$1', [original])).rows.length, 1)
  // Force an error after deletes, proving the entire RPC rolls back.
  await db.exec(`reset role; alter table season_tasks add constraint test_failure check (title <> 'FAIL'); set role authenticated;`)
  await assert.rejects(save([{ id: 'tmp-new', area: 'House', title: 'FAIL' }]))
  assert.equal((await db.query('select * from season_tasks where id=$1', [original])).rows.length, 1)
  await save([{ id: original, area: 'House', title: 'Edited' }])
  assert.equal((await db.query<{ done: boolean }>('select done from season_tasks where id=$1', [original])).rows[0].done, true)
  const added = [{ id: 'tmp-retry', area: 'House', title: 'One new task' }]
  await save(added)
  await save(added)
  assert.equal((await db.query("select * from season_tasks where closing_id=$1 and title='One new task'", [closing])).rows.length, 1)
  await save([])
  assert.equal((await db.query('select * from season_tasks where id=$1', [original])).rows.length, 0)
  assert.equal((await db.query('select * from season_tasks where id=$1', [concurrent])).rows.length, 1)
})
