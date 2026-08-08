const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'systems', 'production');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Add imports if needed
  if (content.includes('productionSupabase') && !content.includes('API_URL')) {
    content = content.replace(/import \{ productionSupabase[^}]*\} from [^;]+;/, 'import { API_URL, getToken } from "@/lib/auth";\n$&');
  }

  // Handle .select()
  // e.g. await productionSupabase.from('table').select('*')
  content = content.replace(
    /(?:await\s+)?productionSupabase\.from\(['"]([^'"]+)['"]\)\.select\([^)]*\)/g,
    `await fetch(\`\${API_URL}/production/$1\`, { headers: { Authorization: \`Bearer \${getToken()}\` } }).then(res => res.json()).then(res => ({ data: res.data, error: res.success === false ? res.message : null }))`
  );
  content = content.replace(
    /(?:await\s+)?productionDispatchSupabase\.from\(['"]([^'"]+)['"]\)\.select\([^)]*\)/g,
    `await fetch(\`\${API_URL}/production/$1\`, { headers: { Authorization: \`Bearer \${getToken()}\` } }).then(res => res.json()).then(res => ({ data: res.data, error: res.success === false ? res.message : null }))`
  );

  // Handle .insert(data)
  // e.g. await productionSupabase.from('table').insert([data])
  content = content.replace(
    /(?:await\s+)?productionSupabase\.from\(['"]([^'"]+)['"]\)\.insert\(([^)]+)\)/g,
    `await fetch(\`\${API_URL}/production/$1\`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${getToken()}\` }, body: JSON.stringify($2) }).then(res => res.json()).then(res => ({ data: res.data, error: res.success === false ? res.message : null }))`
  );

  // Handle .update(data).eq('id', id)
  // e.g. await productionSupabase.from('table').update({ status }).eq('id', id)
  // This is hard to regex perfectly. Let's do a basic one.
  content = content.replace(
    /(?:await\s+)?productionSupabase\.from\(['"]([^'"]+)['"]\)\.update\(([^)]+)\)\.eq\(['"]id['"],\s*([^)]+)\)/g,
    `await fetch(\`\${API_URL}/production/$1/\${$3}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${getToken()}\` }, body: JSON.stringify($2) }).then(res => res.json()).then(res => ({ data: res.data, error: res.success === false ? res.message : null }))`
  );

  // Handle .delete().eq('id', id)
  content = content.replace(
    /(?:await\s+)?productionSupabase\.from\(['"]([^'"]+)['"]\)\.delete\(\)\.eq\(['"]id['"],\s*([^)]+)\)/g,
    `await fetch(\`\${API_URL}/production/$1/\${$2}\`, { method: 'DELETE', headers: { Authorization: \`Bearer \${getToken()}\` } }).then(res => res.json()).then(res => ({ data: res.data, error: res.success === false ? res.message : null }))`
  );

  // Remove the supabase imports if they are no longer used
  content = content.replace(/import \{ productionSupabase[^}]*\} from [^;]+;/, '');

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
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done refactoring Supabase calls.');
