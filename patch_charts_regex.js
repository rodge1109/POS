import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /\/\/ Group sales by date for chart \(last 7 days or based on timeframe\)\s+const dateMap = \{\};/;
const replacement = `// Group sales by date for chart (last 7 days or based on timeframe)
          const daysToShow = timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 12;
          const dateMap = {};`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Charts properly restored with flexible regex!');
} else {
  console.log('Regex match failed.');
}
