const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('win:min'),
  maximize: () => ipcRenderer.send('win:max'),
  close: () => ipcRenderer.send('win:close'),
  onMaximizedChange: (cb) => {
    ipcRenderer.on('win:state', (_e, s) => cb(s));
  },
  onSplashProgress: (cb) => {
    ipcRenderer.on('splash-progress', (_e, p) => cb(p));
  },
  onSplashComplete: (cb) => {
    ipcRenderer.on('splash-complete', () => cb());
  },
});