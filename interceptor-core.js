const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { exec, execSync } = require('child_process');

// Auto-detect configuration
const CONFIG = {
  version: '3.0.0',
  apiEndpoint: process.env.API_ENDPOINT || '',
  apiKey: process.env.API_KEY || '',
  terminalId: process.env.TERMINAL_ID || generateTerminalId(),
  locationId: process.env.LOCATION_ID || '',
  printSpoolPath: 'C:\\Windows\\System32\\spool\\PRINTERS',
  enableCache: true,
  apiTimeout: 5000,
  retryAttempts: 3,
  healthCheckInterval: 60000,
  autoRegister: true,
  debugMode: process.env.DEBUG === 'true'
};

const STATE = {
  processedJobs: new Map(),
  retryAttempts: new Map(),
  stats: {
    receiptsProcessed: 0,
    receiptsFailed: 0,
    lastReceipt: null,
    uptime: Date.now(),
    apiErrors: 0,
    apiSuccess: 0
  },
  registered: false,
  healthy: true
};

function generateTerminalId() {
  const hostname = os.hostname();
  const mac = getMacAddress();
  const hash = require('crypto').createHash('md5').update(`${hostname}-${mac}`).digest('hex').substr(0, 8).toUpperCase();
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

class PrintJobInterceptor {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.configPath = path.join(process.env.APPDATA || process.cwd(), 'ReceiptInterceptor', 'config.json');
    this.logPath = path.join(process.env.APPDATA || process.cwd(), 'ReceiptInterceptor', 'logs');

    this.ensureDirectories();
    this.loadConfig();
  }

  ensureDirectories() {
    const dirs = [
      path.dirname(this.configPath),
      this.logPath
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const saved = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        Object.assign(CONFIG, saved);
        this.log('Loaded saved configuration');
      }
    } catch (error) {
      this.log('Using default configuration');
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(CONFIG, null, 2));
    } catch (error) {
      this.log(`Failed to save config: ${error.message}`);
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    // Write to log file
    try {
      const logFile = path.join(this.logPath, `interceptor-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, logMessage + '\n');

      // Cleanup old logs (keep last 7 days)
      this.cleanupOldLogs();
    } catch (error) {
      // Silent fail on log write
    }

    // Send status to IPC if available
    if (process.send) {
      process.send({
        type: 'log',
        level,
        message,
        timestamp
      });
    }
  }

  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logPath);
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.logPath, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime.getTime() < cutoff) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      // Silent fail
    }
  }

  async autoRegister() {
    if (!CONFIG.apiEndpoint || STATE.registered) return;

    this.log('Attempting auto-registration with cloud...');

    try {
      const registrationData = {
        terminalId: CONFIG.terminalId,
        hostname: os.hostname(),
        platform: os.platform(),
        version: CONFIG.version,
        macAddress: getMacAddress()
      };

      const response = await this.sendRequest('/register', registrationData, 'POST');

      if (response.apiKey) {
        CONFIG.apiKey = response.apiKey;
        CONFIG.locationId = response.locationId;
        this.saveConfig();
        STATE.registered = true;
        this.log('Successfully registered with cloud');
        return true;
      }
    } catch (error) {
      this.log(`Auto-registration failed: ${error.message}`, 'warn');
    }

    return false;
  }

  async healthCheck() {
    try {
      // Check Windows Print Spooler
      const spoolerRunning = await this.checkSpooler();
      if (!spoolerRunning) {
        this.log('Print Spooler not running, attempting to start...', 'warn');
        await this.startSpooler();
      }

      // Check API connectivity
      if (CONFIG.apiEndpoint) {
        await this.sendRequest('/health', { terminalId: CONFIG.terminalId }, 'GET');
        STATE.stats.apiSuccess++;
      }

      STATE.healthy = true;
      this.sendStatus();
    } catch (error) {
      STATE.healthy = false;
      STATE.stats.apiErrors++;
      this.log(`Health check failed: ${error.message}`, 'error');
    }
  }

  checkSpooler() {
    return new Promise((resolve) => {
      exec('sc query spooler', (error, stdout) => {
        resolve(stdout.includes('RUNNING'));
      });
    });
  }

  startSpooler() {
    return new Promise((resolve) => {
      exec('net start spooler', (error) => {
        resolve(!error);
      });
    });
  }

  extractReceiptText(buffer) {
    let text = '';

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        if (byte === 10) text += '\n';
        else if (byte === 13) text += '\r';
        else if (byte === 9) text += '\t';
        else text += String.fromCharCode(byte);
      }
    }

    return text.trim();
  }

  parseReceiptData(receiptText) {
    if (!receiptText || receiptText.length < 10) return null;

    const lines = receiptText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const items = [];
    let total = 0;
    let receiptId = null;
    let timestamp = new Date().toISOString();

    // Try multiple receipt formats
    for (const line of lines) {
      // Receipt ID patterns
      const receiptMatch = line.match(/(?:receipt|order|invoice)\s*#?\s*:?\s*(\w+)/i);
      if (receiptMatch) receiptId = receiptMatch[1];

      // Total patterns
      const totalMatch = line.match(/total\s*:?\s*\$?(\d+\.?\d*)/i);
      if (totalMatch) total = parseFloat(totalMatch[1]);

      // Item patterns (multiple formats)
      const itemMatch = line.match(/^([^$\d]+?)\s+x?(\d+)?\s*\$?(\d+\.?\d*)$/) ||
                       line.match(/^(\d+)x?\s+([^$\d]+?)\s+\$?(\d+\.?\d*)$/) ||
                       line.match(/^([^$\d]+?)\s+\$?(\d+\.?\d*)$/);

      if (itemMatch) {
        if (itemMatch.length === 4) {
          items.push({
            name: itemMatch[1].trim(),
            quantity: itemMatch[2] ? parseInt(itemMatch[2]) : 1,
            price: parseFloat(itemMatch[3])
          });
        } else if (itemMatch.length === 3) {
          items.push({
            name: itemMatch[1].trim(),
            quantity: 1,
            price: parseFloat(itemMatch[2])
          });
        }
      }
    }

    if (items.length === 0 || total === 0) return null;

    return {
      receiptId: receiptId || `R${Date.now()}`,
      terminalId: CONFIG.terminalId,
      locationId: CONFIG.locationId,
      timestamp,
      items,
      total,
      itemCount: items.length,
      rawContent: receiptText.substring(0, 5000)
    };
  }

  async sendRequest(endpoint, data, method = 'POST') {
    return new Promise((resolve, reject) => {
      const baseUrl = CONFIG.apiEndpoint.replace(/\/+$/, '');
      const url = new URL(baseUrl + endpoint);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const postData = method !== 'GET' ? JSON.stringify(data) : null;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        timeout: CONFIG.apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`,
          'X-Terminal-ID': CONFIG.terminalId,
          'X-Interceptor-Version': CONFIG.version,
          'User-Agent': `ReceiptInterceptor/${CONFIG.version}`
        }
      };

      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = lib.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseData));
            } catch {
              resolve({ status: 'ok' });
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  async sendToCloud(receiptData) {
    return this.sendRequest('/receipt', receiptData, 'POST');
  }

  async processJobFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const fileKey = `${path.basename(filePath)}_${stats.size}_${stats.mtimeMs}`;

      if (STATE.processedJobs.has(fileKey)) return;

      if (stats.size < 50) return;

      const buffer = fs.readFileSync(filePath);
      const receiptText = this.extractReceiptText(buffer);
      const receiptData = this.parseReceiptData(receiptText);

      if (!receiptData) return;

      this.log(`Intercepted receipt: ${receiptData.receiptId} (${receiptData.itemCount} items, $${receiptData.total})`);

      try {
        await this.sendToCloud(receiptData);
        STATE.processedJobs.set(fileKey, Date.now());
        STATE.stats.receiptsProcessed++;
        STATE.stats.lastReceipt = Date.now();
        STATE.stats.apiSuccess++;

        this.log(`Successfully sent receipt ${receiptData.receiptId} to cloud`);
        this.sendStatus();

        // Cleanup old entries
        if (STATE.processedJobs.size > 10000) {
          const entries = Array.from(STATE.processedJobs.entries());
          entries.sort((a, b) => b[1] - a[1]);
          STATE.processedJobs.clear();
          entries.slice(0, 5000).forEach(([key, val]) => {
            STATE.processedJobs.set(key, val);
          });
        }
      } catch (error) {
        const attempts = (STATE.retryAttempts.get(fileKey) || 0) + 1;
        STATE.retryAttempts.set(fileKey, attempts);
        STATE.stats.apiErrors++;

        if (attempts < CONFIG.retryAttempts) {
          this.log(`Retry attempt ${attempts}/${CONFIG.retryAttempts} for ${receiptData.receiptId}: ${error.message}`, 'warn');
        } else {
          this.log(`Failed to send ${receiptData.receiptId} after ${CONFIG.retryAttempts} attempts`, 'error');
          STATE.stats.receiptsFailed++;
          STATE.processedJobs.set(fileKey, Date.now());
          STATE.retryAttempts.delete(fileKey);
        }

        this.sendStatus();
      }
    } catch (error) {
      // Silent fail for file read errors (file may be locked or deleted)
    }
  }

  sendStatus() {
    if (process.send) {
      process.send({
        type: 'status',
        stats: STATE.stats,
        config: {
          terminalId: CONFIG.terminalId,
          locationId: CONFIG.locationId,
          registered: STATE.registered,
          healthy: STATE.healthy,
          apiEndpoint: CONFIG.apiEndpoint
        },
        timestamp: Date.now()
      });
    }
  }

  startMonitoring() {
    if (!this.isWindows) {
      this.log('This interceptor requires Windows', 'error');
      process.exit(1);
    }

    this.log('╔════════════════════════════════════════════════════╗');
    this.log('║     RECEIPT INTERCEPTOR v3.0 - PRODUCTION         ║');
    this.log('╚════════════════════════════════════════════════════╝');
    this.log(`Terminal ID: ${CONFIG.terminalId}`);
    this.log(`Location ID: ${CONFIG.locationId || 'Not registered'}`);
    this.log(`API Endpoint: ${CONFIG.apiEndpoint || 'Not configured'}`);
    this.log(`Print Spool: ${CONFIG.printSpoolPath}`);
    this.log('════════════════════════════════════════════════════');

    const spoolPath = CONFIG.printSpoolPath;

    if (!fs.existsSync(spoolPath)) {
      this.log(`Print spool path not found: ${spoolPath}`, 'error');
      this.log('Windows Print Spooler must be enabled', 'error');
      process.exit(1);
    }

    // Auto-register if needed
    if (CONFIG.autoRegister && CONFIG.apiEndpoint) {
      this.autoRegister();
    }

    // Start monitoring
    const monitorInterval = setInterval(() => {
      try {
        if (fs.existsSync(spoolPath)) {
          const files = fs.readdirSync(spoolPath);

          files.forEach(file => {
            const filePath = path.join(spoolPath, file);
            try {
              const stats = fs.statSync(filePath);
              if (stats.isFile()) {
                this.processJobFile(filePath);
              }
            } catch (e) {
              // File may be locked or deleted
            }
          });
        }
      } catch (error) {
        // Silent error on spool read
      }
    }, 500);

    // Health check interval
    const healthInterval = setInterval(() => {
      this.healthCheck();
    }, CONFIG.healthCheckInterval);

    // Status update interval
    const statusInterval = setInterval(() => {
      this.sendStatus();
    }, 10000);

    this.log('Monitoring print jobs...');
    this.sendStatus();

    // Cleanup on exit
    process.on('SIGINT', () => {
      clearInterval(monitorInterval);
      clearInterval(healthInterval);
      clearInterval(statusInterval);
      this.log('Interceptor stopped');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      clearInterval(monitorInterval);
      clearInterval(healthInterval);
      clearInterval(statusInterval);
      this.log('Interceptor terminated');
      process.exit(0);
    });
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`Uncaught error: ${error.message}`);
  if (process.send) {
    process.send({
      type: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});

// Start if run directly
if (require.main === module) {
  const interceptor = new PrintJobInterceptor();
  interceptor.startMonitoring();
}

module.exports = PrintJobInterceptor;
