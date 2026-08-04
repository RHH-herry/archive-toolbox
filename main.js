const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let splashWin = null;
let mainWin = null;
let splashShownAt = 0;
let mainRevealed = false;

const SPLASH_MIN_MS = 1500; // 启动动画最短展示时长（毫秒）
const FORCE_SHOW_MS = 6000;  // 无论加载如何，超时强制显示主窗口

/* 性能说明：不在此禁用硬件加速——真机有 GPU 时渲染更流畅。
   仅当在无桌面/虚拟机会话（headless）中调试时，用命令行参数 --disable-gpu 临时关闭。 */

/* ---------------- 启动动画窗口（透明，圆角玻璃面，无阴影垫） ---------------- */
function createSplash() {
  splashShownAt = Date.now();
  splashWin = new BrowserWindow({
    width: 480,
    height: 380,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    center: true,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWin.loadFile(path.join(__dirname, 'splash.html'));
  splashWin.once('ready-to-show', () => {
    if (!splashWin.isDestroyed()) splashWin.show();
  });
  splashWin.on('closed', () => { splashWin = null; });
  return splashWin;
}

function sendSplash(p) {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.webContents.send('splash-progress', p);
  }
}

function dismissSplash() {
  if (splashWin && !splashWin.isDestroyed()) splashWin.destroy();
  splashWin = null;
}

/* 主窗口就绪后：保证动画展示满最短时长 → 淡出 → 显示主窗口 */
function revealMain() {
  if (mainRevealed) return;
  mainRevealed = true;
  if (!mainWin || mainWin.isDestroyed()) return;

  const elapsed = Date.now() - splashShownAt;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  sendSplash(100);
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.webContents.send('splash-complete'); // splash.html 内做淡出
  }
  setTimeout(() => {
    dismissSplash();
    if (mainWin.isDestroyed()) return;
    mainWin.show();
    mainWin.focus();
  }, Math.max(wait, 300) + 500); // +500ms 给淡出动画留时间
}

/* ---------------- 主窗口：透明 + 圆角外壳，下面不垫任何东西 ---------------- */
function createMain() {
  mainWin = new BrowserWindow({
    title: '归档',
    width: 960,
    height: 680,
    minWidth: 700,
    minHeight: 480,
    center: true,
    frame: false,
    show: false,
    // 透明窗口 + 前端圆角外壳（.window 圆角 + 无投影）→ 真正"只要圆角、下面无垫"
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 最大化/还原状态同步给渲染进程：切换圆角外壳与绿按钮图标
  const sendMaxState = () => {
    if (!mainWin || mainWin.isDestroyed()) return;
    mainWin.webContents.send('win:state', { maximized: mainWin.isMaximized() });
  };
  mainWin.on('maximize', sendMaxState);
  mainWin.on('unmaximize', sendMaxState);

  // 窗口控制
  ipcMain.on('win:min', (e) => e.sender.getOwnerBrowserWindow().minimize());
  ipcMain.on('win:max', (e) => {
    const w = e.sender.getOwnerBrowserWindow();
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.on('win:close', (e) => e.sender.getOwnerBrowserWindow().close());

  // 加载进度 → splash 进度条
  mainWin.webContents.on('did-start-loading', () => sendSplash(30));
  mainWin.webContents.on('dom-ready', () => sendSplash(60));
  mainWin.webContents.on('did-finish-load', () => {
    sendSplash(88);
    sendMaxState();
  });

  // 三重兜底：任一先到即显示主窗口
  mainWin.once('ready-to-show', revealMain);
  mainWin.webContents.once('did-finish-load', revealMain);
  setTimeout(revealMain, FORCE_SHOW_MS);

  mainWin.on('closed', () => { mainWin = null; });
  mainWin.loadFile(path.join(__dirname, 'index.html'));
  return mainWin;
}

app.whenReady().then(() => {
  createSplash();
  createMain();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
