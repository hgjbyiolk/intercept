const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const UPDATE_CHECK_URL = process.env.UPDATE_URL || 'https://your-api.com/updates/latest';
const CURRENT_VERSION = '3.0.0';

class AutoUpdater {
  constructor() {
    this.updateCheckInterval = 3600000; // 1 hour
    this.updateAvailable = false;
    this.downloadProgress = 0;
  }

  async checkForUpdates() {
    try {
      const response = await this.makeRequest(UPDATE_CHECK_URL, 'GET');

      if (response.version && this.compareVersions(response.version, CURRENT_VERSION) > 0) {
        this.updateAvailable = true;
        return {
          available: true,
          version: response.version,
          downloadUrl: response.downloadUrl,
          releaseNotes: response.releaseNotes,
          mandatory: response.mandatory || false
        };
      }

      return { available: false };
    } catch (error) {
      console.error('Update check failed:', error.message);
      return { available: false, error: error.message };
    }
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    return 0;
  }

  async downloadUpdate(downloadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(require('os').tmpdir(), 'ReceiptInterceptor-Update.exe');

      const file = fs.createWriteStream(tempPath);

      https.get(downloadUrl, (response) => {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const progress = (downloaded / totalSize) * 100;
          this.downloadProgress = progress;

          if (onProgress) {
            onProgress(progress);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(tempPath);
        });
      }).on('error', (error) => {
        fs.unlink(tempPath, () => {});
        reject(error);
      });
    });
  }

  async installUpdate(updatePath) {
    return new Promise((resolve, reject) => {
      // Launch installer and exit current app
      exec(`"${updatePath}" /S`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
          // Exit app to allow update
          process.exit(0);
        }
      });
    });
  }

  makeRequest(url, method = 'GET') {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'User-Agent': `ReceiptInterceptor/${CURRENT_VERSION}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ status: 'ok' });
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);

      req.end();
    });
  }

  startAutoUpdateCheck(onUpdateAvailable) {
    // Initial check
    this.checkForUpdates().then(update => {
      if (update.available && onUpdateAvailable) {
        onUpdateAvailable(update);
      }
    });

    // Periodic checks
    setInterval(() => {
      this.checkForUpdates().then(update => {
        if (update.available && onUpdateAvailable) {
          onUpdateAvailable(update);
        }
      });
    }, this.updateCheckInterval);
  }
}

module.exports = AutoUpdater;
