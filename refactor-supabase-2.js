const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'systems', 'production');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Add imports if needed
  if ((content.includes('productionSupabase') || content.includes('productionDispatchSupabase') || content.includes('productionPurchaseSupabase') || content.includes('productionInventorySupabase')) && !content.includes('productionApi')) {
    content = content.replace(/import \{.*?production.*?Supabase.*?\} from ['"]@\/systems\/production\/supabase['"];/, 'import { productionApi } from "@/systems/production/lib/api";\nimport { API_URL, getToken } from "@/lib/auth";');
    content = content.replace(/import \{.*?production.*?Supabase.*?\} from ['"]\.\.?\/.*?supabase['"];/, 'import { productionApi } from "@/systems/production/lib/api";\nimport { API_URL, getToken } from "@/lib/auth";');
  }

  // 1. DELETE
  // supabase.from('table').delete().eq('id', id)
  content = content.replace(
    /await (?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase)\.from\(['"]([^'"]+)['"]\)\.delete\(\)\.eq\(['"]id['"],\s*([^)]+)\)/g,
    `await productionApi.delete('$1', $2)`
  );

  // 2. UPDATE
  // supabase.from('table').update({ foo: bar }).eq('id', id)
  content = content.replace(
    /await (?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase)\.from\(['"]([^'"]+)['"]\)\.update\(([^)]+)\)\.eq\(['"]id['"],\s*([^)]+)\)/g,
    `await productionApi.patch('$1', $3, $2)`
  );

  // 3. INSERT
  // supabase.from('table').insert(data).select()
  content = content.replace(
    /await (?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase)\.from\(['"]([^'"]+)['"]\)\.insert\(([^)]+)\)(?:\.select\(\))?(?:\.single\(\))?/g,
    `await productionApi.post('$1', $2)`
  );

  // 4. GET ALL
  // supabase.from('table').select('*')
  content = content.replace(
    /await (?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase)\.from\(['"]([^'"]+)['"]\)\.select\(['"][^'"]*['"]\)(?:\.order\([^)]+\))?/g,
    `await productionApi.get('$1')`
  );

  // 5. GET ONE by eq
  content = content.replace(
    /await (?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase)\.from\(['"]([^'"]+)['"]\)\.select\(['"][^'"]*['"]\)\.eq\(['"]id['"],\s*([^)]+)\)(?:\.single\(\))?/g,
    `await productionApi.getOne('$1', $2)`
  );

  // Remove unused imports fallback
  content = content.replace(/import \{.*production.*Supabase.*\} from ['"].*supabase['"];/g, '');

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
