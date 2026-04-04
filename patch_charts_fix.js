import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const targetStr = `          // Group sales by date for chart (last 7 days or based on timeframe)
          const dateMap = {};`;
          
const newStr = `          // Group sales by date for chart (last 7 days or based on timeframe)
          const daysToShow = timeframe === 'today' ? 1 : timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 12;
          const dateMap = {};`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Charts properly restored with timeframe awareness!');
} else {
  console.log('Target string not found for chart fix.');
}
