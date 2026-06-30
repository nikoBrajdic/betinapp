const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const path = require('path')
const { setupAutoUpdater, checkForUpdatesNow } = require('./updater')

const APP_URL = process.env.ELECTRON_APP_URL || 'https://betinapp.vercel.app'
const DRAG_REGION_ID = '__betinapp_drag_region__'

function injectDragRegion(win) {
  const dragHeight = 40
  const reservedRight = 140 // Keep clear of Windows caption buttons
  void win.webContents.executeJavaScript(`
    (() => {
      const id = '${DRAG_REGION_ID}';
      if (document.getElementById(id)) return;
      const drag = document.createElement('div');
      drag.id = id;
      drag.style.position = 'fixed';
      drag.style.top = '0';
      drag.style.left = '0';
      drag.style.right = '${reservedRight}px';
      drag.style.height = '${dragHeight}px';
      drag.style.background = 'transparent';
      drag.style.pointerEvents = 'auto';
      drag.style.zIndex = '2147483647';
      drag.style.webkitAppRegion = 'drag';
      document.body.appendChild(drag);
    })();
  `).catch(() => {})
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Betinapp',
    icon: path.join(__dirname, 'icons/icon.png'),
    backgroundColor: '#1a1464',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.loadURL(APP_URL)

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('did-finish-load', () => injectDragRegion(win))

  return win
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  const mainWindow = createWindow()
  setupAutoUpdater(mainWindow)
  ipcMain.handle('app:check-for-updates', async () => checkForUpdatesNow())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
