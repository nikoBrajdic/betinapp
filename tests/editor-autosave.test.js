import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { useEditorAutosave } from '../hooks/use-editor-autosave.ts'
import { EditorSaveError } from '../components/editor-save-error.tsx'
import { SaveIndicator } from '../components/save-indicator.tsx'
import { trackSave } from '../lib/save-events.ts'

let dom, root, container, editor
beforeEach(() => {
  dom = new JSDOM('<div id="root"></div>', { url: 'https://betinapp.test' })
  for (const key of ['window', 'document', 'localStorage', 'CustomEvent', 'Event', 'HTMLElement']) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] })
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.getElementById('root')
  root = createRoot(container)
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  dom.window.close()
})
function Probe({ save, id = 'notes:test' }) {
  editor = useEditorAutosave(id, { title: 'Original', content: [] }, save)
  return editor.error ? React.createElement(EditorSaveError, { retry: editor.persistNow }) : null
}

test('leaving before the debounce flushes and retains the draft until confirmed', async () => {
  let finish
  const written = []
  await act(async () => root.render(React.createElement(Probe, { save: value => {
    written.push(value)
    return new Promise(resolve => { finish = resolve })
  } })))
  await act(async () => editor.setTitleAndSave('Last keystroke'))
  const closing = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(closing)
  assert.equal(closing.defaultPrevented, true)
  await act(async () => root.unmount())
  root = null
  assert.equal(written[0].title, 'Last keystroke')
  assert.equal(JSON.parse(localStorage.getItem('betinapp-draft:notes:test')).title, 'Last keystroke')
  await act(async () => finish())
  assert.equal(localStorage.getItem('betinapp-draft:notes:test'), null)
})

test('reopening recovers the persisted draft and retry saves it', async () => {
  localStorage.setItem('betinapp-draft:notes:test', JSON.stringify({ title: 'Recovered', content: [] }))
  const written = []
  await act(async () => root.render(React.createElement(Probe, { save: async value => { written.push(value) } })))
  assert.equal(editor.title, 'Recovered')
  await act(async () => editor.persistNow())
  assert.equal(written[0].title, 'Recovered')
  assert.equal(localStorage.getItem('betinapp-draft:notes:test'), null)
})

test('failed editor save shows Retry and keeps the local draft', async () => {
  let offline = true
  await act(async () => root.render(React.createElement(Probe, { save: async () => {
    if (offline) throw new Error('Offline')
  } })))
  await act(async () => editor.setTitleAndSave('Keep this'))
  await act(async () => { await assert.rejects(editor.persistNow(), /Offline/) })
  assert.match(container.textContent, /Retry/)
  assert.equal(JSON.parse(localStorage.getItem('betinapp-draft:notes:test')).title, 'Keep this')
  offline = false
  await act(async () => container.querySelector('button').click())
  assert.equal(editor.error, false)
  assert.equal(editor.hasUnsavedChanges(), false)
  assert.equal(localStorage.getItem('betinapp-draft:notes:test'), null)
})

test('one failed concurrent save cannot be hidden by another successful save', async () => {
  let finish
  await act(async () => root.render(React.createElement(SaveIndicator)))
  let saving
  await act(async () => {
    saving = trackSave(new Promise(resolve => { finish = resolve }))
    await assert.rejects(trackSave(Promise.reject(new Error('Offline'))))
  })
  await act(async () => { finish(); await saving })
  assert.match(container.textContent, /Save failed/)
  assert.doesNotMatch(container.textContent, /^Saved$/)
})
