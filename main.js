const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let splashWin = null;
let mainWin = null;
let splashShownAt = 0;
let mainRevealed = false;

const SPLASH_MIN_MS = 2400; // 启动动画最短展示时长（毫秒）——不要太快，看清动画
const FORCE_SHOW_MS = 6000;  // 无论加载如何，超时强制显示主窗口

/* 性能说明：不在此禁用硬件加速——真机有 GPU 时渲染更流畅。
   仅当在无桌面/虚拟机会话（headless）中调试时，用命令行参数 --disable-gpu 临时关闭。 */

/* ---------------- 透明窗口兼容开关 ----------------
   背景：主窗口默认使用 transparent:true 实现「只留圆角、下方无衬垫」的外观，
   但少数显卡/驱动组合下透明窗口会出现黑边、闪烁或整窗不可见。
   历史上曾为此改回不透明（9fe8083），后为恢复圆角外观又改了回来（fbd2571），
   等于把该兼容性问题重新引入。这里不再二选一，改为：默认保留圆角视觉，
   遇到渲染异常的用户可用 --opaque 启动参数（或环境变量 ARCHIVE_OPAQUE=1）
   切换为不透明模式，无需重装或改代码。 */
const OPAQUE_MODE =
  process.argv.includes('--opaque') || process.env.ARCHIVE_OPAQUE === '1';

// 不透明模式下的窗口底色，需与 styles.css 的浅色背景一致，避免出现白闪
const OPAQUE_BG = '#fdfeff';

function surfaceOptions() {
  return OPAQUE_MODE
    ? { transparent: false, backgroundColor: OPAQUE_BG }
    : { transparent: true, backgroundColor: '#00000000' };
}

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
    ...surfaceOptions(),
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
    // 用 --opaque / ARCHIVE_OPAQUE=1 可切换为不透明，规避个别驱动的渲染异常
    ...surfaceOptions(),
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

  // 加载进度 → splash 进度条
  mainWin.webContents.on('did-start-loading', () => sendSplash(30));
  mainWin.webContents.on('dom-ready', () => sendSplash(60));
  mainWin.webContents.on('did-finish-load', () => {
    sendSplash(88);
    sendMaxState();
    // 不透明模式：窗口本身是矩形，去掉前端圆角避免四角露出底色形成"假圆角"
    if (OPAQUE_MODE) {
      mainWin.webContents
        .insertCSS('.window{border-radius:0 !important}html,body{background:' + OPAQUE_BG + ' !important}')
        .catch(() => {});
    }
  });

  // 三重兜底：任一先到即显示主窗口
  mainWin.once('ready-to-show', revealMain);
  mainWin.webContents.once('did-finish-load', revealMain);
  setTimeout(revealMain, FORCE_SHOW_MS);

  mainWin.on('closed', () => { mainWin = null; });
  mainWin.loadFile(path.join(__dirname, 'index.html'));
  return mainWin;
}

/* ---------------- 窗口控制 IPC（全局只注册一次） ----------------
   使用官方文档化的 BrowserWindow.fromWebContents()，而不是 webContents 上
   那个未文档化的 owner-window 取窗口方法，避免 Electron 升级时被移除。
   注册在 createMain() 之外，防止窗口重建时监听器重复叠加。 */
function registerWindowControls() {
  const ownerOf = (e) => BrowserWindow.fromWebContents(e.sender);

  ipcMain.on('win:min', (e) => {
    const w = ownerOf(e);
    if (w && !w.isDestroyed()) w.minimize();
  });

  ipcMain.on('win:max', (e) => {
    const w = ownerOf(e);
    if (!w || w.isDestroyed()) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });

  ipcMain.on('win:close', (e) => {
    const w = ownerOf(e);
    if (w && !w.isDestroyed()) w.close();
  });
}

/* 单实例锁：避免重复启动出现多个主窗口 */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });

  app.whenReady().then(() => {
    registerWindowControls();
    createSplash();
    createMain();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* macOS：点击 Dock 图标且没有窗口时重新打开主窗口 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainRevealed = false;
    splashShownAt = Date.now();
    createMain();
    if (mainWin && !mainWin.isDestroyed()) mainWin.show();
  }
});
