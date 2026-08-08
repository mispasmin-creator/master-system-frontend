const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'systems', 'production');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  const sp = '(?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase)';

  // 1. DELETE
  // supabase.from('table').delete().eq('id', id)
  const delRegex = new RegExp(`await\\\\s+${sp}\\\\s*\\\\.\\\\s*from\\\\(['"]([^'"]+)['"]\\\\)\\\\s*\\\\.\\\\s*delete\\\\(\\\\)\\\\s*\\\\.\\\\s*eq\\\\(['"]id['"],\\\\s*([^)]+)\\\\)`, 'g');
  content = content.replace(delRegex, `await productionApi.delete('$1', $2)`);

  // 2. UPDATE
  const upRegex = new RegExp(`await\\\\s+${sp}\\\\s*\\\\.\\\\s*from\\\\(['"]([^'"]+)['"]\\\\)\\\\s*\\\\.\\\\s*update\\\\(([^)]+)\\\\)\\\\s*\\\\.\\\\s*eq\\\\(['"]id['"],\\\\s*([^)]+)\\\\)`, 'g');
  content = content.replace(upRegex, `await productionApi.patch('$1', $3, $2)`);

  // 3. INSERT
  const inRegex = new RegExp(`await\\\\s+${sp}\\\\s*\\\\.\\\\s*from\\\\(['"]([^'"]+)['"]\\\\)\\\\s*\\\\.\\\\s*insert\\\\(([^)]+)\\\\)(?:\\\\s*\\\\.\\\\s*select\\\\(\\\\))?(?:\\\\s*\\\\.\\\\s*single\\\\(\\\\))?`, 'g');
  content = content.replace(inRegex, `await productionApi.post('$1', $2)`);

  // 4. GET ALL
  const getRegex = new RegExp(`await\\\\s+${sp}\\\\s*\\\\.\\\\s*from\\\\(['"]([^'"]+)['"]\\\\)\\\\s*\\\\.\\\\s*select\\\\(['"][^'"]*['"]\\\\)(?:\\\\s*\\\\.\\\\s*order\\\\([^)]+\\\\))?`, 'g');
  content = content.replace(getRegex, `await productionApi.get('$1')`);

  // 5. GET ONE
  const getOneRegex = new RegExp(`await\\\\s+${sp}\\\\s*\\\\.\\\\s*from\\\\(['"]([^'"]+)['"]\\\\)\\\\s*\\\\.\\\\s*select\\\\(['"][^'"]*['"]\\\\)\\\\s*\\\\.\\\\s*eq\\\\(['"]id['"],\\\\s*([^)]+)\\\\)(?:\\\\s*\\\\.\\\\s*single\\\\(\\\\))?`, 'g');
  content = content.replace(getOneRegex, `await productionApi.getOne('$1', $2)`);

  // Clean imports
  content = content.replace(/import \{.*?production.*?Supabase.*?\} from ['"]@\/systems\/production\/supabase['"];/g, 'import { productionApi } from "@/systems/production/lib/api";\nimport { API_URL, getToken } from "@/lib/auth";');
  content = content.replace(/import \{.*?production.*?Supabase.*?\} from ['"]\.\.?\/.*?supabase['"];/g, 'import { productionApi } from "@/systems/production/lib/api";\nimport { API_URL, getToken } from "@/lib/auth";');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done refactoring Supabase calls.');
