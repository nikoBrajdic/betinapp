-- Requires 036. Both functions are transactions; failures leave no partial list.
begin;
create or replace function public.ensure_season_closing(p_year int, p_unit text, p_template jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare closing uuid; previous uuid;
begin
  if not public.is_household_member() then raise exception 'Household access required' using errcode = '42501'; end if;
  if p_year not between 2000 and 2200 then raise exception 'Invalid season year'; end if;
  -- Serialize creation of the same year/unit, including seeding its tasks.
  perform pg_advisory_xact_lock(hashtextextended('season:' || p_year || ':' || p_unit, 0));
  select id into closing from public.season_closings where year = p_year and unit = p_unit;
  if closing is not null then return closing; end if;
  select id into previous from public.season_closings where unit = p_unit and year < p_year order by year desc limit 1;
  insert into public.season_closings(year, unit) values (p_year, p_unit) returning id into closing;
  if previous is not null then
    insert into public.season_tasks(closing_id, area, title, sort_order)
      select closing, area, title, sort_order from public.season_tasks where closing_id = previous;
  else
    insert into public.season_tasks(closing_id, area, title, sort_order)
      select closing, item->>'area', item->>'title', ord::int - 1
      from jsonb_array_elements(p_template) with ordinality as t(item, ord);
  end if;
  return closing;
end $$;

create or replace function public.save_season_tasks(p_closing_id uuid, p_rows jsonb, p_original_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare item jsonb; ord bigint;
begin
  if not public.is_household_member() then raise exception 'Household access required' using errcode = '42501'; end if;
  perform 1 from public.season_closings where id = p_closing_id for update;
  if not found then raise exception 'Season list not found'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'Invalid checklist';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r
    where coalesce(trim(r->>'title'), '') = '' or coalesce(trim(r->>'area'), '') = '' or coalesce(r->>'id', '') = '') then
    raise exception 'Checklist rows need an id, area and title';
  end if;
  if (select count(*) from jsonb_array_elements(p_rows)) <>
     (select count(distinct r->>'id') from jsonb_array_elements(p_rows) r) then
    raise exception 'Duplicate checklist row';
  end if;
  -- Reject stale/deleted IDs and IDs from a different list before any writes.
  if exists (select 1 from jsonb_array_elements(p_rows) r where r->>'id' not like 'tmp-%'
    and not exists (select 1 from public.season_tasks t where t.id = (r->>'id')::uuid and t.closing_id = p_closing_id)) then
    raise exception 'Checklist changed; reload before editing';
  end if;
  -- Only remove rows this editor originally saw, preserving concurrent additions.
  delete from public.season_tasks t where t.closing_id = p_closing_id and t.id = any(p_original_ids)
    and not exists (select 1 from jsonb_array_elements(p_rows) r where r->>'id' = t.id::text);
  for item, ord in select * from jsonb_array_elements(p_rows) with ordinality loop
    if item->>'id' like 'tmp-%' then
      -- Deterministic IDs make retrying a committed save safe if its response
      -- was lost in transit. Never reset another person's completion fields.
      insert into public.season_tasks(id, closing_id, area, title, sort_order)
      values (md5(p_closing_id::text || ':' || (item->>'id'))::uuid,
        p_closing_id, item->>'area', item->>'title', ord::int - 1)
      on conflict (id) do update set area = excluded.area, title = excluded.title, sort_order = excluded.sort_order;
    else
      update public.season_tasks set area = item->>'area', title = item->>'title', sort_order = ord::int - 1
      where id = (item->>'id')::uuid and closing_id = p_closing_id;
    end if;
  end loop;
end $$;
revoke all on function public.ensure_season_closing(int, text, jsonb), public.save_season_tasks(uuid, jsonb, uuid[]) from public;
grant execute on function public.ensure_season_closing(int, text, jsonb), public.save_season_tasks(uuid, jsonb, uuid[]) to authenticated;
commit;
