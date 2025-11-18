# How to Test the Interceptor - Simple Guide

## Before You Have a Restaurant

### Test 1: Build It

```bash
cd /tmp/cc-agent/60327802/project
npm install
```

This installs the required packages.

### Test 2: Test the Parser

```bash
node test-interceptor.js
```

This tests if the receipt parsing logic works. You should see:
```
✓ Successfully parsed test receipt:
Receipt ID: 5001
Terminal: T001
Items: 3
  - Shawarma x1 = $12.00
  - Juice x2 = $10.00
  - Fries x1 = $5.00
Total: $27.00
```

### Test 3: Run the GUI

**Note:** This requires a Windows machine or Windows VM.

```bash
npm start
```

This launches the Electron app with the setup wizard. You'll see:
1. Welcome screen
2. System check
3. Configuration screen
4. Dashboard

Play around with it to see the flow.

### Test 4: Test with Mock API

Create a simple test server:

```bash
# Create test-api.js
cat > test-api.js << 'EOF'
const http = require('http');

http.createServer((req, res) => {
  console.log('\n=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);

  if (req.method === 'POST' && req.url === '/receipt') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('\n=== Receipt Data ===');
      console.log(JSON.parse(body));
      res.writeHead(200);
      res.end('{"status":"ok"}');
    });
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end('{"status":"ok"}');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(3000, () => {
  console.log('Test API running on http://localhost:3000');
});
EOF

# Run it
node test-api.js
```

Now in the interceptor setup wizard, use:
- API Endpoint: `http://localhost:3000`
- API Key: `test-key`

The test server will print every receipt it receives.

## When You Have a Restaurant POS

### Test 5: Real POS Test

1. **Copy to POS computer:**
   - Build: `npm run build-win`
   - Copy `dist/ReceiptInterceptor-Setup.exe` to POS

2. **Install:**
   - Double-click the exe
   - Follow the wizard
   - Use your real API endpoint

3. **Print a test receipt:**
   - Use POS to process small transaction
   - Print receipt
   - Check interceptor dashboard (system tray)
   - Verify receipt appears in your API

### Test 6: Stress Test

During a real service period:
- Monitor the dashboard
- Check "Receipts Processed" counter
- Verify no failures
- Check your API received all receipts

## Troubleshooting Tests

### Can't build?

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### GUI doesn't start?

Make sure you're on Windows. Electron requires Windows for Windows builds.

### Parser test fails?

The sample receipt format might not match. Edit `test-interceptor.js` to use your receipt format.

### Mock API doesn't receive anything?

1. Check Print Spooler is running: `sc query spooler`
2. Check firewall isn't blocking port 3000
3. Check interceptor logs in `%APPDATA%\ReceiptInterceptor\logs`

### Real POS test fails?

1. Right-click system tray → Run Diagnostics
2. Check all items are green
3. If Print Spooler issue: `net start spooler`
4. If network issue: check firewall
5. If API issue: verify endpoint and key

## Quick Test Checklist

Before deploying to a restaurant:

- [ ] Parser test passes
- [ ] GUI starts and shows wizard
- [ ] Can configure fake credentials
- [ ] Mock API receives test data
- [ ] Built exe runs on clean Windows
- [ ] Your real API endpoints work
- [ ] Diagnostic tool runs

After deploying to restaurant:

- [ ] Installation completes
- [ ] System tray icon appears
- [ ] Test receipt captured
- [ ] Real receipt captured
- [ ] Multiple receipts work
- [ ] Survives reboot
- [ ] Auto-starts on boot

## What Success Looks Like

**Parser test:**
```
✓ Successfully parsed test receipt
✓ Parser is working correctly
```

**GUI test:**
Setup wizard appears, all screens navigable, no errors.

**Mock API test:**
```
Test API running on http://localhost:3000

=== Receipt Data ===
{
  receiptId: 'R1234',
  terminalId: 'T-ABC123',
  items: [...],
  total: 22.00
}
```

**Real POS test:**
- Dashboard shows "Receipts Processed: 1, 2, 3..."
- Your API database has the receipt records
- No errors in logs

## Getting Help

If tests fail:

1. Check `%APPDATA%\ReceiptInterceptor\logs\` for errors
2. Run diagnostics: Right-click tray → Run Diagnostics
3. Export diagnostic report: Right-click tray → Export Report
4. Check Windows Event Viewer
5. Read TESTING.md for detailed troubleshooting

## Fast Path (30 Minutes)

For a quick validation:

1. `npm install` (5 min)
2. `node test-interceptor.js` (1 min)
3. Run mock API server (1 min)
4. `npm start` and configure with mock API (3 min)
5. Print a test receipt from Notepad (5 min)
6. Verify mock API received it (1 min)
7. Build exe: `npm run build-win` (10 min)
8. Test exe on another Windows machine (5 min)

If all 8 steps work, you're ready for restaurant testing.
