const fs = require('fs');

const html = fs.readFileSync('scratch/nam_tuoi.html', 'utf8');

// Look for script tags
const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('Found script tags:', scriptMatches.length);

scriptMatches.forEach((s, idx) => {
  if (s.includes('product') || s.includes('Product') || s.includes('price') || s.includes('data')) {
    console.log(`Script ${idx} length: ${s.length}, snippet:`, s.slice(0, 200).replace(/\n/g, ' '));
  }
});

// Check if there is JSON-LD (schema.org)
const jsonLd = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi);
if (jsonLd) {
  console.log('JSON-LD count:', jsonLd.length);
  jsonLd.forEach(j => {
    console.log('LD snippet:', j.slice(0, 300));
  });
}
