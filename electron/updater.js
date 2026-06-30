const { app, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const log = require('electron-log')

const CHECK_INTERVAL_MS = 30 * 60 * 1000
let checkForUpdatesImpl = null

function setupAutoUpdater(mainWindow) {
  if (!app.isPackaged) {
    checkForUpdatesImpl = async () => false
    return
  }

  log.initialize()
  log.transports.file.level = 'info'
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  let isChecking = false
  let errorNotified = false

  const checkForUpdates = async () => {
    if (isChecking) return
    isChecking = true
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      log.error('[updater] checkForUpdates failed:', error)
    } finally {
      isChecking = false
    }
  }
  checkForUpdatesImpl = checkForUpdates

  autoUpdater.on('checking-for-update', () => {
    log.info('[updater] checking for updates')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('[updater] update available:', info.version)
    void dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available.`,
      detail: 'The update is downloading in the background.',
      buttons: ['OK'],
      defaultId: 0,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(
      `[updater] download ${progress.percent.toFixed(1)}% (${progress.transferred}/${progress.total})`
    )
  })

  autoUpdater.on('update-downloaded', async (info) => {
    log.info('[updater] update downloaded:', info.version)
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'Restart the app now to apply the update.',
      buttons: ['Restart and Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })

    if (result.response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall())
    }
  })

  autoUpdater.on('error', (error) => {
    log.error('[updater] error:', error)
    if (errorNotified) return
    errorNotified = true
    void dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Update Error',
      message: 'Could not check for updates right now.',
      detail: 'The app will keep running normally. Please try again later.',
      buttons: ['OK'],
      defaultId: 0,
    })
  })

  setTimeout(() => {
    void checkForUpdates()
  }, 4000)

  setInterval(() => {
    void checkForUpdates()
  }, CHECK_INTERVAL_MS).unref()
}

async function checkForUpdatesNow() {
  if (!checkForUpdatesImpl) return false
  await checkForUpdatesImpl()
  return true
}

module.exports = { setupAutoUpdater, checkForUpdatesNow }
