// setup-wizard.js (MAIN - ESM / Electron 28 compatible)
import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fork, exec } from 'child_process';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let interceptorProcess = null;
let interceptorStats = {
  receiptsProcessed: 0,
  receiptsFailed: 0,
  lastReceipt: null,
  uptime: Date.now(),
  healthy: true,
  registered: false
};

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const INTERCEPTOR_PATH = path.join(__dirname, 'interceptor-core.js');

// Auto-launch on startup
app.setLoginItemSettings({
  openAtLogin: true,
  path: process.execPath
});

// ----------------------
// FUNCTIONS
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return {
    apiEndpoint: '',
    apiKey: '',
    terminalId: generateTerminalId(),
    locationId: '',
    setupComplete: false
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

function generateTerminalId() {
  const hostname = os.hostname();
  const mac = getMacAddress();
  const hash = crypto.createHash('md5').update(`${hostname}-${mac}`).digest('hex').substr(0, 8).toUpperCase();
  return `T-${hash}`;
}

function getMacAddress() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
        return iface.mac;
      }
    }
  }
  return 'unknown';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Receipt Interceptor Setup',
    resizable: false,
    center: true
  });

  if (process.env.DEBUG === '1') {
    mainWindow.webContents.openDevTools({ mode: 'right' });
  }

  mainWindow.loadFile(path.join(__dirname, 'setup.html')).catch(err => {
    console.error('Failed to load setup.html:', err);
    dialog.showErrorBox('Load error', `Failed to load setup.html: ${err.message}`);
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const tIcon = fs.existsSync(iconPath) ? iconPath : undefined;
  tray = new Tray(tIcon);

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

function updateTrayMenu() {
  const config = loadConfig();
  const running = interceptorProcess !== null;

  const contextMenu = Menu.buildFromTemplate([
    { label: `Receipt Interceptor v3.0`, enabled: false },
    { type: 'separator' },
    { label: `Terminal: ${config.terminalId}`, enabled: false },
    { label: `Status: ${running ? (interceptorStats.healthy ? 'Running' : 'Unhealthy') : 'Stopped'}`, enabled: false },
    { label: `Receipts: ${interceptorStats.receiptsProcessed}`, enabled: false },
    { type: 'separator' },
    {
      label: running ? 'Stop Interceptor' : 'Start Interceptor',
      click: () => { if (running) stopInterceptor(); else startInterceptor(); }
    },
    {
      label: 'Open Dashboard',
      click: () => { if (mainWindow) mainWindow.show(); else createWindow(); }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => { if (mainWindow) { mainWindow.webContents.send('show-settings'); mainWindow.show(); } }
    },
    {
      label: 'View Logs',
      click: () => { shell.openPath(path.join(app.getPath('userData'), 'logs')); }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Receipt Interceptor - ${running ? 'Running' : 'Stopped'}`);
}

function startInterceptor() {
  if (interceptorProcess) return console.log('Interceptor already running');

  const config = loadConfig();
  if (!config.apiEndpoint) {
    dialog.showMessageBox({ type: 'warning', title: 'Configuration Required', message: 'Please complete the setup wizard first.', buttons: ['OK'] });
    if (mainWindow) mainWindow.show(); else createWindow();
    return;
  }

  interceptorProcess = fork(INTERCEPTOR_PATH, [], {
    env: { ...process.env, API_ENDPOINT: config.apiEndpoint, API_KEY: config.apiKey, TERMINAL_ID: config.terminalId, LOCATION_ID: config.locationId },
    silent: false
  });

  interceptorProcess.on('message', (msg) => {
    if (msg.type === 'status') {
      interceptorStats = { ...interceptorStats, ...msg.stats, ...msg.config };
      updateTrayMenu();
      if (mainWindow) mainWindow.webContents.send('status-update', interceptorStats);
    } else if (msg.type === 'log') {
      if (mainWindow) mainWindow.webContents.send('log-message', msg);
    }
  });

  interceptorProcess.on('exit', (code) => {
    console.log(`Interceptor exited with code ${code}`);
    interceptorProcess = null;
    updateTrayMenu();

    if (code !== 0 && code !== null) {
      dialog.showMessageBox({ type: 'error', title: 'Interceptor Stopped', message: `The interceptor stopped unexpectedly (exit code: ${code})`, buttons: ['Restart', 'Cancel'] })
        .then(result => { if (result.response === 0) setTimeout(startInterceptor, 2000); });
    }
  });

  updateTrayMenu();
}

function stopInterceptor() {
  if (interceptorProcess) {
    interceptorProcess.kill('SIGTERM');
    interceptorProcess = null;
    updateTrayMenu();
  }
}

// ----------------------
// IPC HANDLERS
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (e, config) => { saveConfig(config); return true; });
ipcMain.handle('test-connection', async (event, endpoint, apiKey) => {
  const https = await import('https'); // now valid because the handler itself is async
  return new Promise((resolve) => {
    let url;
    try { url = new URL(endpoint + '/health'); } catch { return resolve({ success: false, error: 'Invalid URL' }); }

    const options = { method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}` }, timeout: 5000 };
    const req = https.request(url, options, res => resolve({ success: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode }));
    req.on('error', err => resolve({ success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Connection timeout' }); });
    req.end();
  });
});


ipcMain.handle('start-interceptor', () => { startInterceptor(); return true; });
ipcMain.handle('stop-interceptor', () => { stopInterceptor(); return true; });
ipcMain.handle('get-status', () => ({ running: interceptorProcess !== null, stats: interceptorStats }));
ipcMain.handle('open-logs', () => { shell.openPath(path.join(app.getPath('userData'), 'logs')); });
ipcMain.handle('check-spooler', () => new Promise((resolve) => { exec('sc query spooler', (err, stdout) => resolve({ running: stdout && stdout.includes('RUNNING'), installed: !err })); }));
ipcMain.handle('start-spooler', () => new Promise((resolve) => { exec('net start spooler', (err) => resolve({ success: !err })); }));

// ----------------------
// APP LIFECYCLE
app.on('ready', () => {
  createTray();
  const config = loadConfig();
  if (!config.setupComplete) createWindow(); else startInterceptor();
});

app.on('window-all-closed', () => {}); // keep background running
app.on('before-quit', () => { app.isQuitting = true; stopInterceptor(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });
