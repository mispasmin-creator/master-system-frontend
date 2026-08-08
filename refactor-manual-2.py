import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('c:/dev/merge-system-frontend/systems/production/components/SfproductionEntry.tsx', [
    ('const { error: uploadError } = await productionSupabase.storage', 'const { error: uploadError } = await fetch(`${API_URL}/upload`, { method: "POST" }) // stub'),
    ('const { data } = productionSupabase.storage', 'const { data } = { data: { publicUrl: "" } }; // stub'),
])

replace_in_file('c:/dev/merge-system-frontend/systems/production/components/PiApproval.tsx', [
    ('const { error: updateErr } = await productionSupabase', 'const { error: updateErr } = await productionApi.patch(PI_APPROVAL_TABLE, approval.id, { Note: note }); // stub'),
])

replace_in_file('c:/dev/merge-system-frontend/systems/production/components/KycProductTable.tsx', [
    ('await prodSupabase', 'await productionApi.delete("kyc", rowId); // stub'),
    ('const channel = productionSupabase', 'const channel = { unsubscribe: () => {} }; // stub'),
])

replace_in_file('c:/dev/merge-system-frontend/systems/production/components/full-kitting-content.tsx', [
    ('let updateQuery = productionSupabase', 'let updateQuery = productionApi.patch(FULL_KITTING_TABLE, row.id, updatePayload); // stub'),
])

print("Manual fixes done.")
