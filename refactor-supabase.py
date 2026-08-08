import os
import re

src_dir = os.path.join(os.path.dirname(__file__), 'systems', 'production')
sp = r'(?:productionSupabase|productionDispatchSupabase|productionPurchaseSupabase|productionInventorySupabase|prodSupabase)'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content

    # Replace delete
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*delete\(\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.delete('\1', \2)",
        content
    )
    
    # Replace patch
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*update\(([^)]+)\)\s*\.\s*eq\(\s*[\'"]id[\'"]\s*,\s*([^)]+)\)',
        r"await productionApi.patch('\1', \3, \2)",
        content
    )

    # Replace insert
    content = re.sub(
        r'await\s+' + sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*insert\(([^)]+)\)(?:\s*\.\s*select\(\))?(?:\s*\.\s*single\(\))?',
        r"await productionApi.post('\1', \2)",
        content
    )

    # Replace get (without await)
    content = re.sub(
        sp + r'\s*\.\s*from\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.\s*select\(\s*[\'"][^\'"]*[\'"]\s*\)(?:\s*\.\s*order\([^)]+\))?',
        r"productionApi.get('\1')",
        content
    )

    # Clean imports
    content = re.sub(r'import \{.*?production.*?Supabase.*?\} from [\'"]@/systems/production/supabase[\'"];', 'import { productionApi } from "@/systems/production/lib/api";\nimport { API_URL, getToken } from "@/lib/auth";', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated", filepath)

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.js')):
            process_file(os.path.join(root, f))

print("Done")
