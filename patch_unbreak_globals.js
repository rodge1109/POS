import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Emergency rollback of the global regex replacements that broke the app
// These were applied outside the DashboardPage and used undefined state (isDarkMode)
content = content.replace(/\$\{isDarkMode \? "text-white" : "text-gray-900"\}/g, 'text-gray-900');
content = content.replace(/\$\{isDarkMode \? "text-slate-400" : "text-gray-600"\}/g, 'text-gray-600');
content = content.replace(/\$\{isDarkMode \? "text-slate-500" : "text-gray-500"\}/g, 'text-gray-500');

// Fix the specifically broken className attributes that didn't have {} and used inner quotes
// Example: className="${isDarkMode ? "text-slate-500" : "text-gray-500"} p-2 ..."
// Since I already replaced the inner part, it might now look like className="text-gray-500 p-2 ..." which is fine.

fs.writeFileSync('src/App.jsx', content);
console.log('Global unbreak successful. Now re-applying dashboard themes safely.');
