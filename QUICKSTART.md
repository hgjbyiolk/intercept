# Quick Start Guide

## For Restaurant Owners

### Installation (2 minutes)

1. **Download** `ReceiptInterceptor-Setup.exe` from your loyalty dashboard
2. **Double-click** the file
3. **Follow the wizard:**
   - Click "Get Started"
   - Wait for system check
   - Enter your API details (from dashboard)
   - Click "Start Interceptor"
4. **Done!** Look for the icon in your system tray (bottom-right)

### Daily Use

Nothing! It runs automatically. Just print receipts normally.

To check status: Right-click the system tray icon

### If Something Goes Wrong

Right-click system tray icon → Run Diagnostics

## For Developers

### Build the Executable

```bash
npm install
npm run build-win
```

Output: `dist/ReceiptInterceptor-Setup.exe`

### Test Locally

```bash
# Test parser
node test-interceptor.js

# Run interceptor (GUI)
npm start
```

### API Requirements

Implement these endpoints:
- `POST /receipt` - Receive receipt data
- `GET /health` - Health check

See DEPLOYMENT.md for details.

## Testing in Restaurant

1. Run installer on POS computer
2. Complete setup wizard
3. Print a test receipt
4. Check your API received it
5. Print 3-5 receipts in a row
6. Verify all captured

See TESTING.md for comprehensive testing.

## Support

**Logs:** `%APPDATA%\ReceiptInterceptor\logs`
**Config:** `%APPDATA%\ReceiptInterceptor\config.json`
**Diagnostics:** Right-click tray → Export Diagnostic Report

## Architecture

```
┌─────────────────────────────────────┐
│  Windows POS Computer               │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ POS Software                  │ │
│  └───────────┬───────────────────┘ │
│              │ Print                │
│              ▼                      │
│  ┌───────────────────────────────┐ │
│  │ Windows Print Spooler         │ │
│  └───────────┬───────────────────┘ │
│              │ Monitor              │
│              ▼                      │
│  ┌───────────────────────────────┐ │
│  │ Receipt Interceptor           │ │
│  │ (runs in system tray)         │ │
│  └───────────┬───────────────────┘ │
│              │ HTTPS POST           │
└──────────────┼─────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Your Cloud API       │
    │ - Loyalty system     │
    │ - Points engine      │
    │ - Rewards catalog    │
    └──────────────────────┘
```

## What Gets Sent

Every receipt is converted to:

```json
{
  "receiptId": "R5001",
  "terminalId": "T-A3F2B1C4",
  "timestamp": "2025-11-17T14:30:45.123Z",
  "items": [
    {"name": "Shawarma", "quantity": 1, "price": 12.00},
    {"name": "Juice", "quantity": 2, "price": 5.00}
  ],
  "total": 22.00
}
```

## FAQ

**Q: Does this work with my POS?**
A: Yes, if it prints receipts to a Windows printer.

**Q: Do I need to change my POS?**
A: No, it works with your existing setup.

**Q: Will staff notice?**
A: No, it runs invisibly in the background.

**Q: What if internet goes down?**
A: It retries automatically when connection returns.

**Q: Can I test without deploying?**
A: Yes, run `node test-interceptor.js` or use a mock API.

**Q: How do I uninstall?**
A: Windows Settings → Apps → ReceiptInterceptor → Uninstall

**Q: Does it store receipts locally?**
A: No, they're sent immediately and not stored.

**Q: What about privacy?**
A: All data encrypted in transit (HTTPS). No local storage.

**Q: Can I use on multiple POS terminals?**
A: Yes, install on each terminal. Each gets a unique ID.

**Q: How do updates work?**
A: Automatic. Checks for updates every hour.

## Next Steps

- Read TESTING.md for complete testing guide
- Read DEPLOYMENT.md for production deployment
- Read README.md for technical details
