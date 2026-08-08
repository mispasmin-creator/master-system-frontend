const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'systems', 'production', 'components');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // fix .map(f =>
    const newContent1 = content.replace(/\.map\(f =>/g, '.map((f: string) =>');
    if (newContent1 !== content) {
        content = newContent1;
        changed = true;
    }

    // fix .some(uf =>
    const newContent2 = content.replace(/\.some\(uf =>/g, '.some((uf: string) =>');
    if (newContent2 !== content) {
        content = newContent2;
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed', path.basename(filePath));
    }
};

const processDir = (directory) => {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    }
};

processDir(dir);
