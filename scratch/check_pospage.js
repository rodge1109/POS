import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

const start = 7000;
const end = 8645;

let balance = 0;
for (let i = start - 1; i < end; i++) {
    const line = lines[i];
    const opens = (line.match(/<div|<g|<svg|<path|<circle|<rect|<ellipse|<button|<form|<input|<span|<p|<h1|<h2|<h3|<label|<video|<button|<form/g) || []).length;
    const closes = (line.match(/<\/div>|<\/g>|<\/svg>|<\/path>|<\/circle>|<\/rect>|<\/ellipse>|<\/button>|<\/form>|<\/input>|<\/span>|<\/p>|<\/h1>|<\/h2>|<\/h3>|<\/label>|<\/video>|<\/button>|<\/form>|<\/>/g) || []).length;
    
    // Also handle self-closing tags
    const selfCloses = (line.match(/\/>/g) || []).length;
    
    balance += opens - closes - selfCloses;
    
    if (balance < 0) {
        console.log(`Mismatch at line ${i + 1}: balance ${balance}`);
        // balance = 0;
    }
}
console.log(`Final balance for POSPage: ${balance}`);
