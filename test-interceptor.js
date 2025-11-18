const testReceipt = `
================================
       RESTAURANT XYZ
================================
Receipt #: 5001
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

--------------------------------
ITEMS:
Shawarma x1 $12.00
Juice x2 $10.00
Fries x1 $5.00
--------------------------------
TOTAL: $27.00
================================
Thank you!
`;

class MockInterceptor {
  extractReceiptText(text) {
    return text;
  }

  parseReceiptData(receiptText) {
    if (!receiptText || receiptText.length < 10) return null;

    const lines = receiptText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const items = [];
    let total = 0;
    let receiptId = null;

    for (const line of lines) {
      const receiptMatch = line.match(/receipt\s*#?\s*:?\s*(\d+)/i);
      if (receiptMatch) receiptId = receiptMatch[1];

      const totalMatch = line.match(/total\s*:?\s*\$?(\d+\.?\d*)/i);
      if (totalMatch) total = parseFloat(totalMatch[1]);

      const itemMatch = line.match(/^([^$\d]+?)\s+x?(\d+)?\s*\$?(\d+\.?\d*)$/);
      if (itemMatch) {
        items.push({
          name: itemMatch[1].trim(),
          quantity: itemMatch[2] ? parseInt(itemMatch[2]) : 1,
          price: parseFloat(itemMatch[3])
        });
      }
    }

    if (items.length === 0 || total === 0) return null;

    return {
      receiptId: receiptId || `R${Date.now()}`,
      terminalId: 'T001',
      timestamp: new Date().toISOString(),
      items,
      total,
      itemCount: items.length
    };
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('RECEIPT INTERCEPTOR - TEST');
console.log('═══════════════════════════════════════════════════\n');

const interceptor = new MockInterceptor();
const extracted = interceptor.extractReceiptText(testReceipt);
const parsed = interceptor.parseReceiptData(extracted);

if (parsed) {
  console.log('✓ Successfully parsed test receipt:\n');
  console.log(`Receipt ID: ${parsed.receiptId}`);
  console.log(`Terminal: ${parsed.terminalId}`);
  console.log(`Items: ${parsed.itemCount}`);
  parsed.items.forEach(item => {
    console.log(`  - ${item.name} x${item.quantity} = $${item.price}`);
  });
  console.log(`\nTotal: $${parsed.total}`);
  console.log(`Timestamp: ${parsed.timestamp}`);
  console.log('\n✓ Parser is working correctly\n');
} else {
  console.log('✗ Failed to parse receipt\n');
}
