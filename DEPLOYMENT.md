# Deployment Guide - Receipt Interceptor v3.0

How to deploy the interceptor to restaurants with zero friction.

## For SaaS Operators

### 1. Build the Executable

```bash
# Install dependencies
npm install

# Build Windows executable
npm run build-win
```

Output: `dist/ReceiptInterceptor-Setup.exe` (single-file portable executable)

### 2. Host on Your Website

Upload the executable to your downloads area:

```
https://yourdomain.com/downloads/ReceiptInterceptor-Setup.exe
```

### 3. Backend API Setup

Implement these endpoints:

#### POST /receipt
Receives receipt data from interceptors.

**Request:**
```json
{
  "receiptId": "R5001",
  "terminalId": "T-A3F2B1C4",
  "locationId": "LOC123",
  "timestamp": "2025-11-17T14:30:45.123Z",
  "items": [...],
  "total": 22.00,
  "rawContent": "..."
}
```

**Response:**
```json
{
  "status": "ok",
  "receiptId": "R5001"
}
```

**Status codes:**
- 200-299: Success (receipt processed)
- 400-499: Client error (invalid data, won't retry)
- 500-599: Server error (will retry up to 3 times)

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

#### POST /register (Optional)
Auto-register new terminals.

**Request:**
```json
{
  "terminalId": "T-A3F2B1C4",
  "hostname": "POS-001",
  "platform": "win32",
  "version": "3.0.0",
  "macAddress": "00:11:22:33:44:55"
}
```

**Response:**
```json
{
  "apiKey": "generated-api-key",
  "locationId": "LOC123"
}
```

#### GET /updates/latest (Optional)
Check for updates.

**Response:**
```json
{
  "version": "3.1.0",
  "downloadUrl": "https://yourdomain.com/downloads/ReceiptInterceptor-Setup.exe",
  "releaseNotes": "Bug fixes and improvements",
  "mandatory": false
}
```

### 4. Customer Dashboard

In your customer dashboard, add:

**Download Section:**
```html
<a href="/downloads/ReceiptInterceptor-Setup.exe">
  Download Receipt Interceptor
</a>
```

**API Credentials Display:**
Show customers their:
- API Endpoint
- API Key (with copy button)
- Terminal IDs (list of registered terminals)

**Terminal Management:**
- List all terminals for location
- Show last seen timestamp
- Show receipts processed count
- Ability to revoke/reset API keys

### 5. Support Setup

Add to your support documentation:

**Installation Instructions:**
1. Download ReceiptInterceptor-Setup.exe from your dashboard
2. Run on POS computer
3. Enter API endpoint: `https://api.yourdomain.com`
4. Enter API key: [from dashboard]
5. Click Start

**Troubleshooting:**
- Link to diagnostic tool instructions
- Link to logs location
- Support email/chat

## Restaurant Onboarding Flow

### Simple 3-Step Process

**Step 1: Customer signs up**
- Create account in your system
- Generate API key automatically
- Show download button

**Step 2: Customer downloads**
- Download `ReceiptInterceptor-Setup.exe`
- No installation required (portable exe)

**Step 3: Customer runs**
- Double-click executable
- Setup wizard appears
- Enter credentials (from dashboard)
- Click Start

**Done!**
Receipts flow automatically.

## Deployment Strategies

### Strategy 1: Self-Service (Recommended)

Best for scalability:
1. Customer downloads from dashboard
2. Customer follows wizard
3. Auto-registration with API key
4. Support only if issues

### Strategy 2: White-Glove Setup

For enterprise customers:
1. Remote desktop to POS
2. Download and run executable
3. Configure with customer
4. Verify first receipt
5. Train staff on system tray

### Strategy 3: Pre-Configured

For multi-location chains:
1. Build custom executable with API endpoint
2. Generate location-specific API keys
3. Send pre-configured exe to each location
4. One-click installation

## Multi-Location Deployment

For restaurant chains:

**Option A: Central Management**
- One API key per brand
- Terminal IDs differentiate locations
- Central dashboard shows all terminals

**Option B: Per-Location Keys**
- Unique API key per location
- Better security isolation
- Per-location dashboards

**Option C: Hybrid**
- Location ID in configuration
- One API key per location
- Central + local dashboards

## Security Considerations

### API Key Management

**Generation:**
- Cryptographically secure random keys
- Minimum 32 characters
- Store hashed in database

**Rotation:**
- Allow customers to regenerate
- Grace period for old key
- Notification before expiry

**Scope:**
- Limit to receipt submission only
- No access to other API functions
- Rate limiting per key

### Network Security

**Requirements:**
- HTTPS only (no HTTP)
- TLS 1.2 or higher
- Valid SSL certificate

**Recommendations:**
- Firewall whitelist your API domain
- Consider IP whitelisting for enterprise
- Monitor for unusual traffic patterns

### Data Privacy

**PII Handling:**
- Receipts may contain customer info
- Encrypt in transit (HTTPS)
- Encrypt at rest (database)
- Retention policy (e.g., 90 days)

**Compliance:**
- GDPR: Right to deletion
- PCI: No card numbers in receipts
- CCPA: Data access requests

## Monitoring & Alerts

### Terminal Health

Track per terminal:
- Last seen timestamp
- Receipts processed today
- Success rate
- Error rate

**Alert conditions:**
- Terminal offline > 1 hour
- Success rate < 95%
- Zero receipts during business hours

### API Health

Monitor:
- Request rate
- Response time
- Error rate
- Queue depth

**Alert conditions:**
- Response time > 2s
- Error rate > 1%
- Queue depth growing

### Dashboard Metrics

Show customers:
- Receipts processed (today/week/month)
- Active terminals
- Success rate
- Last receipt timestamp

## Update Management

### Automatic Updates

The interceptor checks for updates every hour.

**Update process:**
1. Check `/updates/latest`
2. Compare versions
3. If newer, download in background
4. Prompt user or auto-install
5. Restart interceptor

**Update JSON:**
```json
{
  "version": "3.1.0",
  "downloadUrl": "https://...",
  "releaseNotes": "...",
  "mandatory": false
}
```

### Versioning Strategy

**Semantic Versioning:**
- Major: Breaking API changes
- Minor: New features, backward compatible
- Patch: Bug fixes

**Release Notes:**
- Clear, customer-facing language
- Highlight benefits
- Link to changelog

### Rollout Strategy

**Staged rollout:**
1. Beta customers (10%)
2. Monitor for 48 hours
3. All customers (100%)

**Emergency rollback:**
- Keep previous version available
- Ability to force downgrade
- Quick revert mechanism

## Cost Optimization

### Infrastructure

**Estimated costs (per 1000 terminals):**
- API servers: 2-4 instances
- Database: Standard tier
- Storage: Minimal (receipts)
- Bandwidth: Low (JSON only)

**Scaling tips:**
- Receipt data is small (~2KB)
- Batch processing for analytics
- Archive old receipts
- CDN for executable downloads

### Support Costs

**Reduce support tickets:**
- Excellent diagnostics tool
- Clear error messages
- Self-service troubleshooting
- Video tutorials

**Common support issues:**
- 50%: Incorrect credentials
- 20%: Network/firewall issues
- 15%: Print Spooler not running
- 10%: Windows permissions
- 5%: Other

## Success Metrics

Track:
- **Installation success rate**: % that complete setup
- **Activation rate**: % that process first receipt
- **Retention**: % still active after 30 days
- **Reliability**: Average uptime per terminal
- **Support tickets**: Per 100 installations

**Target metrics:**
- Installation success: > 95%
- Activation: > 90%
- 30-day retention: > 95%
- Uptime: > 99%
- Support tickets: < 5 per 100

## Going Live Checklist

- [ ] Build and test executable
- [ ] API endpoints implemented and tested
- [ ] SSL certificate valid
- [ ] Dashboard shows download button
- [ ] Dashboard shows API credentials
- [ ] Documentation published
- [ ] Support team trained
- [ ] Monitoring alerts configured
- [ ] Pilot with 3-5 beta customers
- [ ] Collect feedback
- [ ] Iterate and improve
- [ ] General availability launch

## Marketing Copy

For your website:

---

**Automatic Receipt Capture**

Zero setup. Zero training. Zero disruption.

Install the Receipt Interceptor on your POS computer and every receipt automatically syncs with your loyalty program. No hardware changes, no staff training, no workflow changes.

**How it works:**
1. Download the installer from your dashboard
2. Run the 2-minute setup wizard
3. Receipts flow automatically to your loyalty system

**Features:**
- Automatic installation and updates
- Runs in the background
- Self-diagnosing and self-repairing
- Real-time receipt capture
- Works with any POS that prints receipts
- Military-grade security

[Download Now]

---

## Next Steps

1. Build the executable
2. Set up your API endpoints
3. Test with your own restaurant
4. Pilot with 3 beta customers
5. Iterate based on feedback
6. Launch to all customers
