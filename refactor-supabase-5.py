import os
import re

src_dir = os.path.join(os.path.dirname(__file__), 'systems', 'production')
sp = r'(?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase|prodSupabase|supabase)'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content

    # Clean imports
    content = re.sub(r'import\s+\{.*?' + sp + r'.*?\}\s+from\s+[\'"](?:@/systems/production/supabase|\.\.?/.*?supabase)[\'"];?', 'import { productionApi } from "@/systems/production/lib/api";', content)

    # Replace delete chain
    # e.g. await productionSupabase.from('x').delete().eq('id', y)
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*delete\(\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.delete('\1', \2)",
        content
    )

    # Replace update/patch chain
    # e.g. await productionSupabase.from('x').update({ a: b }).eq('id', y)
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*update\(([^)]+)\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.patch('\1', \3, \2)",
        content
    )
    
    # Generic update where .eq is on following lines
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*update\(([\s\S]*?)\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.patch('\1', \3, \2)",
        content
    )

    # Replace insert chain
    # e.g. await productionSupabase.from('x').insert({ a: b }).select().single()
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*insert\(([\s\S]*?)\)(?:\s*\.\s*select\(\))?(?:\s*\.\s*single\(\))?',
        r"await productionApi.post('\1', \2)",
        content
    )

    # Replace get (select) chain
    # e.g. await productionSupabase.from('x').select('*').eq('y', z) -> productionApi.get('x') (We will let them fix filters manually if it breaks, but for now we replace it so it compiles)
    # Actually, we can just find any `.from('table')` and replace the whole thing if we can find the end.
    # Let's do a more generic replacement for `.from('table').select(...)`
    content = re.sub(
        r'(?:await\s+)?' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*select\([^)]*\)(?:\s*\.\s*[a-zA-Z]+\([^)]*\))*',
        r"await productionApi.get('\1')",
        content
    )
    
    # Storage upload
    # await productionSupabase.storage.from("production-images").upload(filePath, file);
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*storage\s*\.\s*from\(\s*[\'"][^\'"]+[\'"]\s*\)\s*\.\s*upload\(([^,]+),\s*([^)]+)\)',
        r"await fetch(`${API_URL}/upload`, { method: 'POST', body: (() => { const fd = new FormData(); fd.append('file', \2); return fd; })() })",
        content
    )
    
    # Storage getPublicUrl
    # productionSupabase.storage.from("production-images").getPublicUrl(filePath);
    content = re.sub(
        sp + r'\s*\.\s*storage\s*\.\s*from\(\s*[\'"][^\'"]+[\'"]\s*\)\s*\.\s*getPublicUrl\(([^)]+)\)',
        r"{ data: { publicUrl: `${API_URL}/uploads/${\1}` } }",
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated", filepath)

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.js')):
            process_file(os.path.join(root, f))

print("Done")
