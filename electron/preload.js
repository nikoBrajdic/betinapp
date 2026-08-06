const { contextBridge, ipcRenderer } = require('electron')

function applyElectronOverlayClass() {
  const apply = () => {
    document.body.classList.add('electron-titlebar-overlay')
  }

  if (document.body) apply()
  else window.addEventListener('DOMContentLoaded', apply, { once: true })
}

applyElectronOverlayClass()

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
})
