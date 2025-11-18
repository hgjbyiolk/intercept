# Quick Reference Card

## Commands

```bash
npm install              # Install dependencies
npm test                 # Test parser
npm run test-api         # Start mock API server
npm start                # Run GUI (Windows only)
npm run build-win        # Build Windows executable
```

## Files

| File | Purpose | Size |
|------|---------|------|
| `interceptor-core.js` | Receipt processing engine | 16K |
| `setup-wizard.js` | GUI application | 8K |
| `setup.html` | Setup wizard interface | 17K |
| `auto-updater.js` | Update system | 4K |
| `diagnostics.js` | Health monitoring | 12K |
| `test-interceptor.js` | Parser testing | 3K |
| `test-api.js` | Mock API server | 7K |

## Documentation

| File | Read When... |
|------|-------------|
| `START-HERE.md` | First time here |
| `OVERVIEW.md` | Want big picture |
| `HOW-TO-TEST.md` | Ready to test |
| `DEPLOYMENT.md` | Ready to deploy |
| `ARCHITECTURE.md` | Want technical details |
| `SUMMARY.md` | Want complete overview |

## API Endpoints

```javascript
// Required
POST /receipt        // Receive receipt data
GET  /health         // Health check

// Optional
POST /register       // Auto-registration
GET  /updates/latest // Update check
```

## Receipt Format

```json
{
  "receiptId": "R5001",
  "terminalId": "T-A3F2B1C4",
  "timestamp": "2025-11-17T14:30:45.123Z",
  "items": [
    {"name": "Item", "quantity": 1, "price": 10.00}
  ],
  "total": 10.00
}
```

## Configuration

Location: `%APPDATA%\ReceiptInterceptor\config.json`

```json
{
  "apiEndpoint": "https://api.yourdomain.com",
  "apiKey": "your-api-key",
  "terminalId": "T-ABC123",
  "locationId": "LOC001",
  "setupComplete": true
}
```

## Logs

Location: `%APPDATA%\ReceiptInterceptor\logs\`

Format: `interceptor-YYYY-MM-DD.log`

Retention: 7 days

## Testing Checklist

- [ ] `npm test` passes
- [ ] Mock API receives data
- [ ] GUI starts correctly
- [ ] Build creates exe
- [ ] Exe runs on Windows
- [ ] Real POS test works
- [ ] Survives reboot

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Print Spooler not running | `net start spooler` |
| Network error | Check firewall, verify API endpoint |
| Parser fails | Edit receipt format in parser |
| GUI won't start | Requires Windows, check Electron |
| Build fails | `rm -rf node_modules && npm install` |

## System Requirements

- Windows 10 or later
- Node.js 18+ (for development)
- Internet connection
- Windows Print Spooler enabled

## Support Commands

```bash
# Check Print Spooler
sc query spooler

# Start Print Spooler
net start spooler

# View logs
explorer %APPDATA%\ReceiptInterceptor\logs

# View config
notepad %APPDATA%\ReceiptInterceptor\config.json
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Installation success | 95%+ |
| Activation rate | 90%+ |
| Uptime | 99%+ |
| Capture rate | 99%+ |
| Support tickets | <5 per 100 installs |

## Build Output

```
dist/ReceiptInterceptor-Setup.exe
Size: ~80-120 MB
Format: Portable executable
Requirements: Windows 10+
```

## Restaurant Flow

1. Download exe from dashboard (1 min)
2. Run and complete wizard (2 min)
3. Receipts flow automatically (forever)

## Common Paths

```
Installation: C:\Users\{User}\AppData\Local\Programs\ReceiptInterceptor
Config: C:\Users\{User}\AppData\Roaming\ReceiptInterceptor\config.json
Logs: C:\Users\{User}\AppData\Roaming\ReceiptInterceptor\logs\
Spool: C:\Windows\System32\spool\PRINTERS
```

## Key Features

✓ Zero configuration
✓ Visual setup wizard
✓ System tray integration
✓ Auto-updates
✓ Self-diagnostics
✓ Smart retry logic
✓ Health monitoring
✓ Comprehensive logging

## Next Steps

1. Read `START-HERE.md`
2. Run `npm test`
3. Add icons to `assets/`
4. Run `npm run build-win`
5. Test on Windows
6. Deploy to beta restaurant

## Emergency Commands

```bash
# Stop interceptor
taskkill /F /IM ReceiptInterceptor.exe

# Restart Print Spooler
net stop spooler && net start spooler

# Clear logs
del %APPDATA%\ReceiptInterceptor\logs\*.log

# Reset config
del %APPDATA%\ReceiptInterceptor\config.json
```

## Contact Info

Built-in diagnostics: Right-click tray → Run Diagnostics
Export report: Right-click tray → Export Report

---

**Everything you need on one page.**
