# Receipt Interceptor v3.0 - Production Edition

Zero-configuration receipt capture for restaurant loyalty systems.

## What It Does

Automatically captures every receipt printed from your POS system and sends the data to your loyalty platform in real-time. No staff training, no hardware changes, no disruption to operations.

## Key Features

- **Zero Configuration**: Download, double-click, done
- **Auto-Registration**: Automatically links to your cloud platform
- **GUI Setup Wizard**: Simple visual setup in under 2 minutes
- **System Tray Integration**: Always running, never intrusive
- **Auto-Updates**: Keeps itself current without intervention
- **Health Monitoring**: Self-diagnoses and repairs issues
- **Smart Retry Logic**: Never loses a receipt
- **Comprehensive Logging**: Full audit trail
- **Multi-POS Support**: Works with any receipt printer

## For Restaurant Owners

### Installation

1. Download `ReceiptInterceptor-Setup.exe` from your dashboard
2. Double-click to run
3. Follow the 3-step wizard
4. Done - it runs automatically

### Daily Operation

- Runs automatically on Windows startup
- Lives in system tray (bottom-right corner)
- Right-click tray icon to check status
- No daily maintenance required

### Troubleshooting

Right-click system tray icon → View Diagnostics

The built-in diagnostic tool checks:
- Print Spooler status
- Network connectivity
- API connection
- Disk space
- Permissions
- Recent errors

## For Developers

### Architecture

```
ReceiptInterceptor-Setup.exe (Electron app)
├── setup-wizard.js (GUI + system tray)
├── interceptor-core.js (receipt processing)
├── auto-updater.js (automatic updates)
└── diagnostics.js (health monitoring)
```

### How It Works

1. Monitors Windows Print Spooler directory
2. Detects new print jobs in real-time
3. Extracts text from print job buffer
4. Parses receipt format
5. POSTs structured JSON to your API
6. Handles retries and failures gracefully

### Building from Source

```bash
npm install
npm run build-win
```

Output: `dist/ReceiptInterceptor-Setup.exe`

### API Integration

Your backend receives POST requests to `/receipt`:

```json
{
  "receiptId": "R5001",
  "terminalId": "T-A3F2B1C4",
  "locationId": "LOC123",
  "timestamp": "2025-11-17T14:30:45.123Z",
  "itemCount": 3,
  "items": [
    {
      "name": "Shawarma",
      "quantity": 1,
      "price": 12.00
    },
    {
      "name": "Juice",
      "quantity": 2,
      "price": 5.00
    }
  ],
  "total": 22.00,
  "rawContent": "... full receipt text ..."
}
```

**Required Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
X-Terminal-ID: T-A3F2B1C4
X-Interceptor-Version: 3.0.0
```

### API Endpoints

Your API must implement:

- `POST /receipt` - Receives receipt data
- `GET /health` - Health check (returns 200 OK)
- `POST /register` - Auto-registration (optional)
- `GET /updates/latest` - Update check (optional)

### Configuration

Stored in `%APPDATA%/ReceiptInterceptor/config.json`:

```json
{
  "apiEndpoint": "https://your-api.com",
  "apiKey": "your-api-key",
  "terminalId": "T-A3F2B1C4",
  "locationId": "LOC123",
  "setupComplete": true
}
```

### Logging

Logs stored in `%APPDATA%/ReceiptInterceptor/logs/`:
- `interceptor-YYYY-MM-DD.log` - Daily logs
- Auto-cleanup after 7 days
- JSON format for easy parsing

### Security

- Runs with administrator privileges (required for print spooler access)
- API keys stored in user AppData (not accessible by other users)
- HTTPS required for API communication
- No receipt data stored locally after transmission
- Processed receipts tracked in memory only

### Testing

See TESTING.md for comprehensive testing instructions.

## System Requirements

- Windows 10 or later
- Windows Print Spooler enabled
- Internet connection
- Administrator privileges (for installation)

## Support

Built-in diagnostics export: Right-click tray → Export Diagnostic Report

Send the generated JSON file to support for troubleshooting.

## Version History

### v3.0.0 (2025-11-17)
- Production-ready release
- GUI setup wizard
- System tray integration
- Auto-updates
- Health monitoring
- Comprehensive diagnostics

### v2.0.0
- Basic command-line interceptor
- Manual installation

### v1.0.0
- Initial prototype
