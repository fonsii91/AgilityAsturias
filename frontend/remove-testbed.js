
const fs = require('fs');
const path = require('path');

const filesToClean = [
    'src/app/components/explorar/salud-deportiva/salud-deportiva.spec.ts',
    'src/app/components/explorar/salud-deportiva/workload-gauge/workload-gauge.spec.ts',
    'src/app/components/gestionar-perros/dog-form/dog-form.component.spec.ts',
    'src/app/components/gestionar-perros/tabs/dog-docs/dog-docs.component.spec.ts',
    'src/app/components/perfil/perfil.spec.ts'
];

filesToClean.forEach(f => {
    let p = path.resolve(f);
    if (!fs.existsSync(p)) return;

    let content = fs.readFileSync(p, 'utf8');

    // Remove try-catch blocks with initTestEnvironment
    content = content.replace(/try\s*\{[\s\S]*?initTestEnvironment[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');

    // Remove individual initTestEnvironment calls not in try-catch
    content = content.replace(/getTestBed\(\)\.initTestEnvironment\([^)]*\);/g, '');
    content = content.replace(/TestBed\.initTestEnvironment\([^)]*\);/g, '');
    content = content.replace(/TestBed\.resetTestEnvironment\(\);/g, '');

    // Remove empty beforeAll blocks
    content = content.replace(/beforeAll\(\s*\(\)\s*=>\s*\{\s*\}\);/g, '');

    // Remove zone imports if present
    content = content.replace(/import\s+'zone\.js';/g, '');
    content = content.replace(/import\s+'zone\.js\/testing';/g, '');

    fs.writeFileSync(p, content, 'utf8');
    console.log('Cleaned:', p);
});
