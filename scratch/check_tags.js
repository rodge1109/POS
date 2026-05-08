import fs from 'fs';

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let openJSX = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const divOpen = (line.match(/<div/g) || []).length;
    const divClose = (line.match(/<\/div>/g) || []).length;
    openDivs += divOpen - divClose;
    
    if (openDivs < 0) {
        console.log(`Negative divs at line ${i + 1}`);
        openDivs = 0;
    }
}
console.log(`Final open divs: ${openDivs}`);
