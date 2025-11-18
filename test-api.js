#!/usr/bin/env node

/**
 * Mock API Server for Testing Receipt Interceptor
 *
 * Run this to test the interceptor without a real backend.
 * It will log all received receipts to the console.
 */

const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Terminal-ID, X-Interceptor-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('─'.repeat(60));

  // Log headers
  console.log('Headers:');
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('terminal')) {
      console.log(`  ${key}: ${req.headers[key]}`);
    }
  });

  // POST /receipt - Receive receipt data
  if (req.method === 'POST' && req.url === '/receipt') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const receipt = JSON.parse(body);

        console.log('\n📄 RECEIPT RECEIVED:');
        console.log('─'.repeat(60));
        console.log(`  Receipt ID: ${receipt.receiptId}`);
        console.log(`  Terminal ID: ${receipt.terminalId}`);
        console.log(`  Timestamp: ${receipt.timestamp}`);
        console.log(`  Total: $${receipt.total}`);
        console.log(`  Items: ${receipt.itemCount}`);
        console.log('\n  Items Detail:');

        receipt.items.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.name} x${item.quantity} = $${item.price}`);
        });

        console.log('─'.repeat(60));
        console.log('✓ Receipt processed successfully');

        // Simulate successful response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          receiptId: receipt.receiptId,
          timestamp: new Date().toISOString()
        }));

      } catch (error) {
        console.error('✗ Error parsing receipt:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Invalid receipt data'
        }));
      }
    });

    return;
  }

  // GET /health - Health check
  if (req.method === 'GET' && req.url === '/health') {
    console.log('❤️  Health check requested');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // POST /register - Auto-registration
  if (req.method === 'POST' && req.url === '/register') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const registration = JSON.parse(body);
        console.log('\n🔐 REGISTRATION REQUEST:');
        console.log('─'.repeat(60));
        console.log(`  Terminal ID: ${registration.terminalId}`);
        console.log(`  Hostname: ${registration.hostname}`);
        console.log(`  Platform: ${registration.platform}`);
        console.log(`  Version: ${registration.version}`);
        console.log('─'.repeat(60));

        // Generate mock API key
        const apiKey = 'test-api-key-' + Math.random().toString(36).substr(2, 9);
        const locationId = 'LOC-' + Math.random().toString(36).substr(2, 6).toUpperCase();

        console.log(`✓ Registered with API Key: ${apiKey}`);
        console.log(`✓ Assigned Location ID: ${locationId}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          apiKey,
          locationId,
          terminalId: registration.terminalId
        }));

      } catch (error) {
        console.error('✗ Error processing registration:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: 'Invalid registration data'
        }));
      }
    });

    return;
  }

  // GET /updates/latest - Update check
  if (req.method === 'GET' && req.url === '/updates/latest') {
    console.log('🔄 Update check requested');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: '3.0.0',
      downloadUrl: 'https://example.com/download',
      releaseNotes: 'No updates available',
      mandatory: false
    }));
    return;
  }

  // 404 for everything else
  console.log('✗ Not Found');
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'error',
    message: 'Not found'
  }));
});

server.listen(PORT, () => {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     MOCK API SERVER - Receipt Interceptor Testing         ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Status: Running`);
  console.log(`  Port: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    POST   /receipt         - Receive receipt data');
  console.log('    GET    /health          - Health check');
  console.log('    POST   /register        - Auto-registration');
  console.log('    GET    /updates/latest  - Update check');
  console.log('');
  console.log('  Configure interceptor with:');
  console.log(`    API Endpoint: http://localhost:${PORT}`);
  console.log('    API Key: test-key (or anything)');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
  console.log('═'.repeat(60));
  console.log('Waiting for requests...\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n✗ Port ${PORT} is already in use`);
    console.error('Try stopping other services or use a different port\n');
  } else {
    console.error('\n✗ Server error:', error.message);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n' + '═'.repeat(60));
  console.log('Server stopped');
  console.log('═'.repeat(60) + '\n');
  process.exit(0);
});
