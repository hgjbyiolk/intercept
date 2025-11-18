// preload.js (Electron 28 compatible)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => {
      try {
        callback(...args);
      } catch (err) {
        console.error('Renderer callback error:', err);
      }
    });
  }
});
