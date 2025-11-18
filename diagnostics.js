const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class DiagnosticsTool {
  constructor() {
    this.checks = [];
  }

  async runFullDiagnostics() {
    const results = {
      timestamp: new Date().toISOString(),
      system: await this.getSystemInfo(),
      printSpooler: await this.checkPrintSpooler(),
      network: await this.checkNetwork(),
      diskSpace: await this.checkDiskSpace(),
      permissions: await this.checkPermissions(),
      configuration: await this.checkConfiguration(),
      apiConnectivity: await this.checkAPIConnectivity(),
      recentErrors: await this.getRecentErrors(),
      recommendations: []
    };

    results.recommendations = this.generateRecommendations(results);
    results.overallHealth = this.calculateHealth(results);

    return results;
  }

  async getSystemInfo() {
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: os.cpus()[0]?.model || 'Unknown',
      nodeVersion: process.version
    };
  }

  async checkPrintSpooler() {
    return new Promise((resolve) => {
      exec('sc query spooler', (error, stdout, stderr) => {
        const running = stdout.includes('RUNNING');
        const state = stdout.match(/STATE\s+:\s+\d+\s+(\w+)/)?.[1] || 'UNKNOWN';

        resolve({
          healthy: running,
          state,
          autoStart: stdout.includes('AUTO_START'),
          error: error ? error.message : null
        });
      });
    });
  }

  async checkNetwork() {
    return new Promise((resolve) => {
      const https = require('https');

      const startTime = Date.now();

      const req = https.get('https://www.google.com', (res) => {
        const latency = Date.now() - startTime;

        resolve({
          healthy: res.statusCode === 200,
          latency,
          statusCode: res.statusCode
        });
      });

      req.on('error', (error) => {
        resolve({
          healthy: false,
          error: error.message,
          latency: Date.now() - startTime
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          healthy: false,
          error: 'Connection timeout',
          latency: 5000
        });
      });
    });
  }

  async checkDiskSpace() {
    return new Promise((resolve) => {
      exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
        if (error) {
          resolve({ healthy: false, error: error.message });
          return;
        }

        const lines = stdout.trim().split('\n').slice(1);
        const drives = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1]);
            const total = parseInt(parts[2]);
            return {
              drive: parts[0],
              total,
              free,
              used: total - free,
              percentFree: ((free / total) * 100).toFixed(2)
            };
          }
          return null;
        }).filter(Boolean);

        const cDrive = drives.find(d => d.drive.startsWith('C'));
        const healthy = cDrive ? parseFloat(cDrive.percentFree) > 10 : true;

        resolve({
          healthy,
          drives,
          warning: !healthy ? 'Low disk space on C: drive' : null
        });
      });
    });
  }

  async checkPermissions() {
    const testPaths = [
      'C:\\Windows\\System32\\spool\\PRINTERS',
      process.env.APPDATA,
      process.env.TEMP
    ];

    const results = [];

    for (const testPath of testPaths) {
      try {
        const canRead = fs.existsSync(testPath);
        const stats = canRead ? fs.statSync(testPath) : null;

        results.push({
          path: testPath,
          readable: canRead,
          writable: canRead && this.testWrite(testPath),
          isDirectory: stats?.isDirectory() || false
        });
      } catch (error) {
        results.push({
          path: testPath,
          readable: false,
          writable: false,
          error: error.message
        });
      }
    }

    const healthy = results.every(r => r.readable);

    return {
      healthy,
      checks: results
    };
  }

  testWrite(dirPath) {
    const testFile = path.join(dirPath, `.test-${Date.now()}`);
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  async checkConfiguration() {
    const configPath = path.join(process.env.APPDATA || process.cwd(), 'ReceiptInterceptor', 'config.json');

    try {
      if (!fs.existsSync(configPath)) {
        return {
          healthy: false,
          exists: false,
          error: 'Configuration file not found'
        };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const issues = [];
      if (!config.apiEndpoint) issues.push('API endpoint not configured');
      if (!config.apiKey) issues.push('API key not configured');
      if (!config.terminalId) issues.push('Terminal ID not set');

      return {
        healthy: issues.length === 0,
        exists: true,
        configured: config.setupComplete || false,
        issues,
        terminalId: config.terminalId
      };
    } catch (error) {
      return {
        healthy: false,
        exists: true,
        error: 'Failed to read configuration: ' + error.message
      };
    }
  }

  async checkAPIConnectivity() {
    const configPath = path.join(process.env.APPDATA || process.cwd(), 'ReceiptInterceptor', 'config.json');

    try {
      if (!fs.existsSync(configPath)) {
        return {
          healthy: false,
          error: 'Configuration not found'
        };
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (!config.apiEndpoint) {
        return {
          healthy: false,
          error: 'API endpoint not configured'
        };
      }

      return await this.testAPIConnection(config.apiEndpoint, config.apiKey);
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  async testAPIConnection(endpoint, apiKey) {
    return new Promise((resolve) => {
      const https = require('https');
      const url = new URL(endpoint + '/health');

      const startTime = Date.now();

      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 5000
      };

      const req = https.request(url, options, (res) => {
        const latency = Date.now() - startTime;

        resolve({
          healthy: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          latency
        });
      });

      req.on('error', (error) => {
        resolve({
          healthy: false,
          error: error.message,
          latency: Date.now() - startTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          healthy: false,
          error: 'Connection timeout',
          latency: 5000
        });
      });

      req.end();
    });
  }

  async getRecentErrors() {
    const logPath = path.join(process.env.APPDATA || process.cwd(), 'ReceiptInterceptor', 'logs');

    try {
      if (!fs.existsSync(logPath)) {
        return { errors: [], count: 0 };
      }

      const files = fs.readdirSync(logPath).filter(f => f.endsWith('.log'));
      if (files.length === 0) {
        return { errors: [], count: 0 };
      }

      // Read most recent log file
      files.sort().reverse();
      const latestLog = path.join(logPath, files[0]);
      const content = fs.readFileSync(latestLog, 'utf8');

      const errorLines = content.split('\n')
        .filter(line => line.includes('[ERROR]'))
        .slice(-10)
        .map(line => {
          const match = line.match(/\[(.*?)\]\s*\[ERROR\]\s*(.*)/);
          return match ? {
            timestamp: match[1],
            message: match[2]
          } : null;
        })
        .filter(Boolean);

      return {
        errors: errorLines,
        count: errorLines.length,
        logFile: latestLog
      };
    } catch (error) {
      return {
        errors: [],
        count: 0,
        error: error.message
      };
    }
  }

  generateRecommendations(results) {
    const recommendations = [];

    if (!results.printSpooler.healthy) {
      recommendations.push({
        priority: 'high',
        category: 'Print Spooler',
        issue: 'Print Spooler is not running',
        solution: 'Start the Print Spooler service using: net start spooler'
      });
    }

    if (!results.network.healthy) {
      recommendations.push({
        priority: 'high',
        category: 'Network',
        issue: 'Network connectivity issues detected',
        solution: 'Check your internet connection and firewall settings'
      });
    }

    if (!results.configuration.healthy) {
      recommendations.push({
        priority: 'high',
        category: 'Configuration',
        issue: results.configuration.issues?.join(', ') || 'Configuration incomplete',
        solution: 'Complete the setup wizard to configure the interceptor'
      });
    }

    if (!results.apiConnectivity.healthy) {
      recommendations.push({
        priority: 'high',
        category: 'API',
        issue: 'Cannot connect to API endpoint',
        solution: 'Verify API endpoint and key in settings. Check firewall rules.'
      });
    }

    if (results.diskSpace.healthy === false) {
      recommendations.push({
        priority: 'medium',
        category: 'Disk Space',
        issue: results.diskSpace.warning || 'Low disk space',
        solution: 'Free up disk space on your system drive'
      });
    }

    if (!results.permissions.healthy) {
      recommendations.push({
        priority: 'medium',
        category: 'Permissions',
        issue: 'Insufficient file system permissions',
        solution: 'Run the application as Administrator'
      });
    }

    if (results.recentErrors.count > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Errors',
        issue: `${results.recentErrors.count} recent errors detected`,
        solution: 'Review error logs and contact support if issues persist'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'System',
        issue: 'No issues detected',
        solution: 'System is operating normally'
      });
    }

    return recommendations;
  }

  calculateHealth(results) {
    const checks = [
      results.printSpooler.healthy,
      results.network.healthy,
      results.diskSpace.healthy,
      results.permissions.healthy,
      results.configuration.healthy,
      results.apiConnectivity.healthy
    ];

    const healthyCount = checks.filter(Boolean).length;
    const percentage = (healthyCount / checks.length) * 100;

    let status = 'good';
    if (percentage < 50) status = 'critical';
    else if (percentage < 80) status = 'warning';

    return {
      status,
      percentage: percentage.toFixed(0),
      healthyChecks: healthyCount,
      totalChecks: checks.length
    };
  }

  async exportDiagnosticReport() {
    const results = await this.runFullDiagnostics();

    const reportPath = path.join(
      process.env.TEMP || os.tmpdir(),
      `diagnostic-report-${Date.now()}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    return reportPath;
  }
}

module.exports = DiagnosticsTool;
