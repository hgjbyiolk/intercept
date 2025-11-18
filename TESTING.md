# Testing Guide - Receipt Interceptor v3.0

Complete testing instructions for restaurant deployment.

## Pre-Deployment Testing (Your Lab)

### 1. Build Test

```bash
npm install
npm run build-win
```

Expected output: `dist/ReceiptInterceptor-Setup.exe`

### 2. Installation Test

1. Run `ReceiptInterceptor-Setup.exe`
2. Verify setup wizard appears
3. Click through welcome screen
4. Check system requirements screen shows:
   - Terminal ID (auto-generated)
   - Print Spooler status

### 3. Configuration Test

In setup wizard:
1. Enter test API endpoint
2. Enter test API key
3. Click "Test Connection"
4. Should see "Connection successful" or error message

### 4. Parser Test

Test receipt parsing without real POS:

```bash
node test-interceptor.js
```

Expected output:
```
Successfully parsed test receipt:
Receipt ID: 5001
Terminal: T001
Items: 3
  - Shawarma x1 = $12.00
  - Juice x2 = $10.00
  - Fries x1 = $5.00
Total: $27.00
```

### 5. Mock API Server Test

Create a test API server:

```javascript
// test-server.js
const http = require('http');

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/receipt') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('Received receipt:', JSON.parse(body));
      res.writeHead(200);
      res.end('OK');
    });
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
}).listen(3000, () => {
  console.log('Test server running on http://localhost:3000');
});
```

Run: `node test-server.js`

Configure interceptor to use `http://localhost:3000`

## On-Site Testing (Restaurant)

### Phase 1: Initial Setup (5 minutes)

**Checklist:**
- [ ] Copy `ReceiptInterceptor-Setup.exe` to POS computer
- [ ] Double-click to run
- [ ] Complete setup wizard
- [ ] Note Terminal ID (save this for your records)
- [ ] Test connection succeeds
- [ ] Click "Start Interceptor"
- [ ] Verify system tray icon appears

**Expected Result:**
System tray shows Receipt Interceptor icon with "Running" status.

### Phase 2: Print Test (10 minutes)

**Test 1: Manual Print Test**
1. Open Notepad
2. Type a sample receipt:
```
================================
       TEST RESTAURANT
================================
Receipt #: 9999
Date: 11/17/2025

--------------------------------
ITEMS:
Test Item x1 $10.00
--------------------------------
TOTAL: $10.00
================================
```
3. Print to the receipt printer
4. Check interceptor logs
5. Verify receipt appears in your API

**Test 2: Real POS Receipt**
1. Process a real transaction (small item)
2. Print receipt normally
3. Check system tray icon (right-click → Open Dashboard)
4. Verify "Receipts Processed" counter increased
5. Check your API received the data

**Test 3: Multiple Receipts**
1. Print 3-5 receipts in quick succession
2. Verify all receipts captured
3. Check no receipts lost
4. Verify correct order preservation

### Phase 3: Stress Test (30 minutes)

**Test during rush hour:**
1. Monitor dashboard throughout service
2. Check "Receipts Processed" counter
3. Look for any failures in "Failed" counter
4. Verify API received all receipts

**Things to watch for:**
- Counter incrementing correctly
- No error messages in logs
- "Status" shows green/healthy
- "Last Receipt" timestamp updates

### Phase 4: Reliability Test (24 hours)

**Day 1 Monitoring:**
- [ ] Morning: Check dashboard
- [ ] Lunch rush: Monitor live
- [ ] Evening: Check dashboard
- [ ] Before close: Export diagnostics

**Metrics to track:**
- Total receipts processed
- Failed receipts (should be 0)
- API success rate (should be 100%)
- System health (should be green)

### Phase 5: Recovery Test

**Test 1: Network Interruption**
1. Disconnect internet
2. Print receipt
3. Reconnect internet
4. Verify receipt sent (check retry logic)

**Test 2: API Downtime**
1. Stop your API server
2. Print receipt
3. Restart API server
4. Verify receipt eventually sent

**Test 3: Interceptor Restart**
1. Right-click system tray → Stop
2. Wait 30 seconds
3. Right-click → Start
4. Print receipt
5. Verify still working

**Test 4: System Reboot**
1. Restart POS computer
2. Wait for Windows to boot
3. Check system tray - interceptor should auto-start
4. Print receipt
5. Verify working

## Diagnostics

### Built-in Diagnostic Tool

Right-click system tray → Run Diagnostics

**Checks performed:**
1. **Print Spooler**: Should show "Running"
2. **Network**: Latency < 1000ms
3. **Disk Space**: Free space > 10%
4. **Permissions**: All paths accessible
5. **Configuration**: All fields set
6. **API**: Connection successful

### Manual Checks

**Check if interceptor is running:**
```cmd
tasklist | findstr "ReceiptInterceptor"
```

**Check Print Spooler:**
```cmd
sc query spooler
```

**Start Print Spooler:**
```cmd
net start spooler
```

**View logs:**
Navigate to: `%APPDATA%\ReceiptInterceptor\logs`

**Check configuration:**
Navigate to: `%APPDATA%\ReceiptInterceptor\config.json`

## Common Issues & Solutions

### Issue: Receipts not intercepting

**Solution:**
1. Check Print Spooler is running
2. Verify printer is a Windows printer (not network direct)
3. Check logs for errors
4. Run diagnostics tool

### Issue: API connection failed

**Solution:**
1. Verify API endpoint URL (https://)
2. Check API key is correct
3. Test network connectivity
4. Check firewall settings

### Issue: Interceptor not starting

**Solution:**
1. Check Windows Event Viewer
2. Verify administrator privileges
3. Check disk space
4. Reinstall application

### Issue: High failure rate

**Solution:**
1. Check API response time
2. Verify API returns 200 OK
3. Check network stability
4. Review API error logs

## Success Criteria

Before going live in production:

- [ ] Installation completes without errors
- [ ] Setup wizard completes successfully
- [ ] System tray integration working
- [ ] Test receipt captured and sent to API
- [ ] Real POS receipt captured and sent
- [ ] Multiple receipts captured successfully
- [ ] Survives network interruption
- [ ] Survives system reboot
- [ ] Auto-starts on Windows boot
- [ ] Diagnostics show all green
- [ ] No errors in logs
- [ ] API receives correct data format
- [ ] 24-hour test shows 100% capture rate

## Performance Benchmarks

Expected performance:
- Receipt detection latency: < 500ms
- API transmission time: < 2 seconds
- Memory usage: < 100 MB
- CPU usage: < 5% average
- Zero receipts lost in 24-hour test

## Rollback Plan

If issues occur:
1. Stop interceptor (system tray → Stop)
2. Uninstall via Windows Settings
3. Restaurant operations continue normally
4. Investigate logs
5. Fix issues
6. Redeploy

## Support Checklist

When requesting support, include:
1. Terminal ID
2. Diagnostic report (JSON export)
3. Recent logs (last 24 hours)
4. Description of issue
5. Steps to reproduce
6. POS system details
7. Windows version

## Next Steps After Successful Testing

1. Document Terminal ID in your records
2. Add terminal to your dashboard
3. Set up monitoring alerts
4. Train staff (system tray location only)
5. Schedule weekly health checks
6. Monitor for updates
