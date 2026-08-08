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

    # Generic `.from('table')` chains
    # Match any `[await] supabase.from('table').ANYTHING_UP_TO_PARENS()`
    # We want to replace it with `[await] productionApi.get/post/patch/delete`
    # Since we can't reliably parse the entire chain with regex if it spans multiple lines with many methods,
    # let's just forcefully replace the START of the chain.
    # supabase.from(TABLE).select(...) -> productionApi.get(TABLE)
    content = re.sub(
        r'(?:await\s+)?' + sp + r'\s*\.\s*from\(\s*([^)]+)\s*\)\s*\.\s*select\([^)]*\)(?:\s*\.\s*[a-zA-Z]+\([^)]*\))*',
        r"await productionApi.get(\1)",
        content
    )
    
    # supabase.from(TABLE).update(...) -> productionApi.patch(TABLE, ...)
    content = re.sub(
        r'(?:await\s+)?' + sp + r'\s*\.\s*from\(\s*([^)]+)\s*\)\s*\.\s*update\(([\s\S]*?)\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.patch(\1, \3, \2)",
        content
    )
    
    # supabase.from(TABLE).delete(...) -> productionApi.delete(TABLE, ...)
    content = re.sub(
        r'(?:await\s+)?' + sp + r'\s*\.\s*from\(\s*([^)]+)\s*\)\s*\.\s*delete\(\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.delete(\1, \2)",
        content
    )
    
    # supabase.from(TABLE).insert(...) -> productionApi.post(TABLE, ...)
    content = re.sub(
        r'(?:await\s+)?' + sp + r'\s*\.\s*from\(\s*([^)]+)\s*\)\s*\.\s*insert\(([\s\S]*?)\)(?:\s*\.\s*[a-zA-Z]+\([^)]*\))*',
        r"await productionApi.post(\1, \2)",
        content
    )

    # Storage upload
    content = re.sub(
        r'(?:await\s+)?' + sp + r'\s*\.\s*storage\s*\.\s*from\(\s*[\'"][^\'"]+[\'"]\s*\)\s*\.\s*upload\(([^,]+),\s*([^)]+)\)',
        r"await fetch(`${API_URL}/upload`, { method: 'POST', body: (() => { const fd = new FormData(); fd.append('file', \2); return fd; })() })",
        content
    )
    
    # Storage getPublicUrl
    content = re.sub(
        sp + r'\s*\.\s*storage\s*\.\s*from\(\s*[\'"][^\'"]+[\'"]\s*\)\s*\.\s*getPublicUrl\(([^)]+)\)',
        r"{ data: { publicUrl: `${API_URL}/uploads/${\1}` } }",
        content
    )
    
    # Supabase Realtime Channels
    content = re.sub(
        sp + r'\s*\.\s*channel\([\s\S]*?\.subscribe\(\)',
        r"{ unsubscribe: () => {} }",
        content
    )
    content = re.sub(
        sp + r'\s*\.\s*removeChannel\([^)]+\)',
        r"",
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
