import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('C:/Users/김민주/AppData/Roaming/npm/node_modules/xlsx');

const wb = XLSX.readFile(process.argv[2]);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log('total rows:', rows.length - 1);
const byUsage = {};
const byPlugin = {};
for (let i = 1; i < rows.length; i++) {
  const [usage, plugin, cmd, desc] = rows[i];
  byUsage[usage] = (byUsage[usage] || 0) + 1;
  byPlugin[plugin] = (byPlugin[plugin] || 0) + 1;
}
console.log('by usage:', byUsage);
console.log('by plugin:', byPlugin);
console.log('\n=== first 3 of each plugin ===');
const seen = {};
for (let i = 1; i < rows.length; i++) {
  const [usage, plugin, cmd, desc] = rows[i];
  seen[plugin] = (seen[plugin] || 0) + 1;
  if (seen[plugin] <= 2) console.log(`${plugin.padEnd(22)} ${cmd.padEnd(40)} ${(desc || '').slice(0, 50)}`);
}
