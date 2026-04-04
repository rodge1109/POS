import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetStr = '<table className="w-full text-[10px] font-mono">';
const newStr = '<table className="w-full text-[10.5px] font-sans tabular-nums tracking-tight leading-snug">';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Typography formally patched to match Inter requirements.');
} else {
  console.log('Could not find typography substring, it may have already been patched.');
}
