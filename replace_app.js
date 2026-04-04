import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// The standard combo matcher
content = content.replace(/(\w+)\.image && \(\1\.image\.startsWith\('http'\) \|\| \1\.image\.startsWith\('assets\/'\) \|\| \1\.image\.startsWith\('\/'\)\)/g, "$1.image && ($1.image.startsWith('http') || $1.image.startsWith('assets/') || $1.image.startsWith('/') || $1.image.startsWith('data:'))");

// The singular assets matcher
content = content.replace(/(\w+)\.image && \1\.image\.startsWith\('assets\/'\)/g, "$1.image && ($1.image.startsWith('http') || $1.image.startsWith('assets/') || $1.image.startsWith('/') || $1.image.startsWith('data:'))");

fs.writeFileSync('src/App.jsx', content);
console.log("Replaced perfectly");
