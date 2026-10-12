const fs = require('fs');
const html = fs.readFileSync('scratch/nam_tuoi.html', 'utf8');

const urls = html.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s"']+/g) || [];
const uniqueDomains = new Set();
urls.forEach(u => {
  try {
    const parsed = new URL(u);
    uniqueDomains.add(parsed.hostname);
  } catch(e) {}
});

console.log('Domains found in HTML:', Array.from(uniqueDomains));

// Also search for /api or .api or tgdd or bachhoaxanh
const apiMatches = html.match(/\/api\/[^\s"']+/g) || [];
console.log('Api paths found in HTML:', apiMatches);
