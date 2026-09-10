import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDraftSaveQueue } from '../lib/draft-save-queue'
import { trackSave } from '../lib/save-events'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(r => { resolve = r })
  return { promise, resolve }
}

test('latest draft survives a failed write and can be retried', async () => {
  let failing = true
  let draft: string | undefined
  const states: string[] = []
  const queue = createDraftSaveQueue({
    initial: '', delay: 60_000,
    save: async () => { if (failing) throw new Error('Offline') },
    onDraft: value => { draft = value },
    onSaved: () => { draft = undefined },
    onState: state => states.push(state),
  })
  queue.update('Keep my typing')
  await assert.rejects(queue.flush(), /Offline/)
  assert.equal(draft, 'Keep my typing')
  assert.equal(queue.dirty(), true)
  assert.equal(states.at(-1), 'error')
  failing = false
  await queue.flush()
  assert.equal(draft, undefined)
  assert.equal(queue.dirty(), false)
})

test('navigation flush includes newer typing without overlapping writes', async () => {
  const first = deferred()
  const values: string[] = []
  let active = 0
  const queue = createDraftSaveQueue({
    initial: '', delay: 60_000,
    save: async value => {
      assert.equal(++active, 1)
      values.push(value)
      if (value === 'old') await first.promise
      active--
    },
    onDraft() {}, onSaved() {}, onState() {},
  })
  queue.update('old')
  const flushing = queue.flush()
  queue.update('new')
  const navigation = queue.flush()
  first.resolve()
  await Promise.all([flushing, navigation])
  assert.deepEqual(values, ['old', 'new'])
  assert.equal(queue.dirty(), false)
})

test('discard cancels the debounce and does not resend an in-flight write', async () => {
  const first = deferred()
  const values: string[] = []
  const queue = createDraftSaveQueue({
    initial: '', delay: 60_000,
    save: async value => { values.push(value); await first.promise },
    onDraft() {}, onSaved() {}, onState() {},
  })
  queue.update('already sent')
  const flushing = queue.flush()
  queue.update('discard this')
  const discarded = queue.discard()
  first.resolve()
  await Promise.all([flushing, discarded])
  await queue.flush()
  assert.deepEqual(values, ['already sent'])
  assert.equal(queue.dirty(), false)
})

test('failed save emits an error, never a saved event', async () => {
  const target = new EventTarget()
  const events: string[] = []
  for (const name of ['save:start', 'save:end', 'save:error']) target.addEventListener(name, () => events.push(name))
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target })
  try {
    await assert.rejects(trackSave(Promise.reject(new Error('Offline'))), /Offline/)
    assert.deepEqual(events, ['save:start', 'save:error'])
    events.length = 0
    await trackSave(Promise.resolve())
    assert.deepEqual(events, ['save:start', 'save:end'])
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
