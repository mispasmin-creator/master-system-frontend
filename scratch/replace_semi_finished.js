const fs = require('fs');
const path = require('path');

const componentsDir = 'c:/dev/merge-system-frontend/systems/production/components';
const filesToProcess = ['SfproductionEntry.tsx', 'SfProduction.tsx', 'SfjobCard.tsx'];

const importRegex = /import\s+\{([^}]+)\}\s+from\s+"@\/systems\/production\/lib\/semi-finished-supabase";/g;

function replaceImports(fileContent) {
    return fileContent.replace(importRegex, (match, p1) => {
        // extract the imported names
        const names = p1.split(',').map(n => n.trim()).filter(n => n && !n.includes('TABLE') && !n.startsWith('fetch'));
        if (names.length === 0) return ''; // remove import completely if only tables/fetches
        
        // map them to utils
        return `import { ${names.join(', ')} } from "@/systems/production/lib/utils";`;
    });
}

const tableDeclarations = `
const SEMI_PRODUCTION_TABLE = "semi_production";
const SEMI_JOB_CARD_TABLE = "semi_job_card";
const SEMI_ACTUAL_TABLE = "semi_actual";
const MASTER_TABLE = "master";
`;

function replaceFetches(fileContent) {
    fileContent = fileContent.replace(/fetchSemiProductionRows\(\)/g, 'productionApi.get(SEMI_PRODUCTION_TABLE).then(res => (res.data || []).map(mapSemiProduction))');
    fileContent = fileContent.replace(/fetchSemiJobCardRows\(\)/g, 'productionApi.get(SEMI_JOB_CARD_TABLE).then(res => (res.data || []).map(mapSemiJobCard))');
    fileContent = fileContent.replace(/fetchSemiActualRows\(\)/g, 'productionApi.get(SEMI_ACTUAL_TABLE).then(res => (res.data || []).map(mapSemiActual))');
    fileContent = fileContent.replace(/fetchMasterRows\(\)/g, 'productionApi.get(MASTER_TABLE).then(res => res.data || [])');
    return fileContent;
}

for (const file of filesToProcess) {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    const originalContent = content;
    
    content = replaceImports(content);
    content = replaceFetches(content);
    
    // Check if we need to add mapping imports from utils
    const needsProductionMap = content.includes('mapSemiProduction');
    const needsJobCardMap = content.includes('mapSemiJobCard');
    const needsActualMap = content.includes('mapSemiActual');
    const needsMapMaster = content.includes('getMasterValue');
    const needsToSupabaseDate = content.includes('toSupabaseDate');
    
    const utilsImports = [];
    if (needsProductionMap) utilsImports.push('mapSemiProduction');
    if (needsJobCardMap) utilsImports.push('mapSemiJobCard');
    if (needsActualMap) utilsImports.push('mapSemiActual');
    if (needsMapMaster) utilsImports.push('getMasterValue');
    if (needsToSupabaseDate) utilsImports.push('toSupabaseDate');

    if (utilsImports.length > 0) {
        // Find existing utils import if any, or add a new one
        if (content.includes('@/systems/production/lib/utils')) {
            // it's already there (maybe from replaceImports), we need to ensure all are included
            // but the regex replaceImports already preserves getMasterValue etc.
            // Let's just append the missing ones, or simply replace the import again:
            const utilsImportRegex = /import\s+\{([^}]+)\}\s+from\s+"@\/systems\/production\/lib\/utils";/;
            content = content.replace(utilsImportRegex, (match, existingImports) => {
                const existing = existingImports.split(',').map(n => n.trim());
                const combined = Array.from(new Set([...existing, ...utilsImports]));
                return `import { ${combined.join(', ')} } from "@/systems/production/lib/utils";`;
            });
        } else {
             content = content.replace(/import { productionApi } from "@\/systems\/production\/lib\/api";/, 
             `import { productionApi } from "@/systems/production/lib/api";\nimport { ${utilsImports.join(', ')} } from "@/systems/production/lib/utils";`);
        }
    }

    // Insert constants right after the imports
    content = content.replace(/\/\/ ==================== CONSTANTS ====================/, `// ==================== CONSTANTS ====================\n${tableDeclarations}`);

    fs.writeFileSync(filePath, content);
    console.log("Migrated", file);
}
