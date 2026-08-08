import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. semi-finished-supabase.ts
replace_in_file('c:/dev/merge-system-frontend/systems/production/lib/semi-finished-supabase.ts', [
    ('await productionSupabase\n    .from(SEMI_ACTUAL_TABLE)', "await productionApi.get(SEMI_ACTUAL_TABLE)"),
    ('await productionSupabase\n    .from(SEMI_PRODUCTION_TABLE)', "await productionApi.get(SEMI_PRODUCTION_TABLE)"),
    ('await productionSupabase\n    .from(SEMI_JOB_CARD_TABLE)', "await productionApi.get(SEMI_JOB_CARD_TABLE)"),
    ('await productionSupabase.from(MASTER_TABLE).select("*");', "await productionApi.get(MASTER_TABLE);"),
])

# 2. SfproductionEntry.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/SfproductionEntry.tsx', [
    ('const { error: uploadError } = await productionSupabase.storage\n        .from("production-images")\n        .upload(filePath, file);', "const { error: uploadError } = await fetch(`${API_URL}/upload`, { method: 'POST', body: (() => { const fd = new FormData(); fd.append('file', file); return fd; })() }).then(r=>r.json()).then(r=>({error: r.success===false?r.message:null}));"),
    ('const { data } = productionSupabase.storage\n        .from("production-images")\n        .getPublicUrl(filePath);', "const { data } = { data: { publicUrl: `${API_URL}/uploads/${filePath}` } };"),
    ('const { error } = await productionSupabase\n                .from(SEMI_ACTUAL_TABLE)\n                .delete()\n                .eq("id", record.id);', 'const { error } = await productionApi.delete(SEMI_ACTUAL_TABLE, record.id);'),
    ('const { error: insertError } = await productionSupabase.from(SEMI_ACTUAL_TABLE).insert({', 'const { error: insertError } = await productionApi.post(SEMI_ACTUAL_TABLE, {'),
    ('const { error: updateError } = await productionSupabase\n                .from(SEMI_ACTUAL_TABLE)\n                .update(updatePayload)\n                .eq("id", formData.id);', 'const { error: updateError } = await productionApi.patch(SEMI_ACTUAL_TABLE, formData.id, updatePayload);'),
    ('const { data: spRows, error: spFetchErr } = await productionSupabase\n                    .from(SEMI_PRODUCTION_TABLE)\n                    .select("*")\n                    .eq("Semi-Finished product", formData.semiFinishedProduct);', 'const { data: spRows, error: spFetchErr } = await productionApi.get(SEMI_PRODUCTION_TABLE); // Fetch all, will filter on client or update backend API if needed'),
    ('await productionSupabase\n                        .from(SEMI_PRODUCTION_TABLE)\n                        .update({\n                            "In-Stock": (spRecord["In-Stock"] || 0) + qtyDiff,\n                            "Total Quantity produced": (spRecord["Total Quantity produced"] || 0) + qtyDiff\n                        })\n                        .eq("id", spRecord.id);', 'await productionApi.patch(SEMI_PRODUCTION_TABLE, spRecord.id, {\n                            "In-Stock": (spRecord["In-Stock"] || 0) + qtyDiff,\n                            "Total Quantity produced": (spRecord["Total Quantity produced"] || 0) + qtyDiff\n                        });'),
])

# 3. SfProduction.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/SfProduction.tsx', [
    ('const { error: insertError } = await productionSupabase.from(SEMI_PRODUCTION_TABLE).insert({', 'const { error: insertError } = await productionApi.post(SEMI_PRODUCTION_TABLE, {'),
    ('const { error: updateError } = await productionSupabase\n                .from(SEMI_PRODUCTION_TABLE)\n                .update(updatePayload)\n                .eq("id", formData.id);', 'const { error: updateError } = await productionApi.patch(SEMI_PRODUCTION_TABLE, formData.id, updatePayload);'),
    ('const { error: fallbackError } = await productionSupabase\n                    .from(SEMI_PRODUCTION_TABLE)\n                    .update({ [field]: Number(val) })\n                    .eq("id", p.id);', 'const { error: fallbackError } = await productionApi.patch(SEMI_PRODUCTION_TABLE, p.id, { [field]: Number(val) });'),
])

# 4. SfjobCard.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/SfjobCard.tsx', [
    ('const { error: insertError } = await productionSupabase.from(SEMI_JOB_CARD_TABLE).insert({', 'const { error: insertError } = await productionApi.post(SEMI_JOB_CARD_TABLE, {'),
    ('const { error: updateError } = await productionSupabase\n                .from(SEMI_JOB_CARD_TABLE)\n                .update(updatePayload)\n                .eq("id", formData.id);', 'const { error: updateError } = await productionApi.patch(SEMI_JOB_CARD_TABLE, formData.id, updatePayload);'),
])

# 5. PiApproval.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/PiApproval.tsx', [
    ('const { error: updateErr } = await productionSupabase\n          .from(PI_APPROVAL_TABLE)\n          .update({ Note: note })\n          .eq("id", approval.id);', 'const { error: updateErr } = await productionApi.patch(PI_APPROVAL_TABLE, approval.id, { Note: note });'),
])

# 6. KycProductTable.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/KycProductTable.tsx', [
    ('await prodSupabase\n            .from("kyc")\n            .delete()\n            .eq("id", rowId);', 'await productionApi.delete("kyc", rowId);'),
    ('const channel = productionSupabase\n      .channel("custom-lift-accounts-channel")\n      .on(\n        "postgres_changes",\n        { event: "*", schema: "public", table: "lift_accounts" },\n        (payload) => {\n          console.log("Supabase real-time update received for lift_accounts:", payload);\n          fetchKycProducts(); // Re-fetch all data to ensure we have the latest\n        }\n      )\n      .subscribe();', 'const channel = { unsubscribe: () => {} };'),
    ('productionSupabase.removeChannel(channel);', ''),
])

# 7. full-kitting-content.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/full-kitting-content.tsx', [
    ('let updateQuery = productionSupabase\n          .from(FULL_KITTING_TABLE)\n          .update(updatePayload)\n          .eq("id", row.id);', 'let updateQuery = productionApi.patch(FULL_KITTING_TABLE, row.id, updatePayload);'),
])

# 8. Tally_entry.tsx
replace_in_file('c:/dev/merge-system-frontend/systems/production/components/Tally_entry.tsx', [
    ('const { error: updateError } = await productionSupabase\n              .from(TALLY_TABLE)\n              .update({ status: row.status, "Voucher No.": row.voucherNo })\n              .eq("id", row.id);', 'const { error: updateError } = await productionApi.patch(TALLY_TABLE, row.id, { status: row.status, "Voucher No.": row.voucherNo });'),
])

print("Finished direct string replacements.")
