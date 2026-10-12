const fs = require('fs');
const html = fs.readFileSync('scratch/nam_tuoi.html', 'utf8');

// Look for product names or patterns in html
console.log('Includes Nấm kim châm?', html.includes('kim châm') || html.includes('Kim châm') || html.includes('Kim Châm'));
console.log('Includes đùi gà?', html.includes('đùi gà') || html.includes('Đùi gà'));
console.log('Includes nấm rơm?', html.includes('nấm rơm') || html.includes('Nấm rơm'));
console.log('Includes nấm bào ngư?', html.includes('bào ngư') || html.includes('Bào ngư'));
console.log('Includes product_?', html.includes('product_'));
console.log('Includes btn_buy_product?', html.includes('btn_buy_product'));
