const fs = require('fs');

function addMockMethod(filePath, className, methodStr) {
    if(!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`(class\\s+${className}\\s*{[^{}]*)(})`, 'g');
    if (content.match(regex)) {
        content = content.replace(regex, `$1  ${methodStr}\n$2`);
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// 1. rsce-tracker & video-list: getTenantSlug
addMockMethod('src/app/components/rsce-tracker/rsce-tracker.component.spec.ts', 'MockTenantService', "getTenantSlug() { return 'test'; }");
addMockMethod('src/app/components/galeria-videos/video-list/video-list.component.spec.ts', 'MockTenantService', "getTenantSlug() { return 'test'; }");

// 2. galeria.component.spec.ts: currentUserSignal
addMockMethod('src/app/components/galeria/galeria.component.spec.ts', 'MockAuthService', "currentUserSignal = () => ({ id: 1, role: 'staff' });");

// 3. perfil.spec.ts: isLoading
addMockMethod('src/app/components/perfil/perfil.spec.ts', 'MockAuthService', "isLoading = require('@angular/core').signal(false);");

// 4. novedades.component.spec.ts: logSystemAction
addMockMethod('src/app/components/novedades/novedades.component.spec.ts', 'MockAnalyticsService', "logSystemAction(action) {}");

// We need to check if MockAnalyticsService exists in novedades.component.spec.ts. If not, we might need to add it to providers.
let novContent = fs.readFileSync('src/app/components/novedades/novedades.component.spec.ts', 'utf8');
if (!novContent.includes('MockAnalyticsService')) {
    novContent = novContent.replace('providers: [', "providers: [\n        { provide: require('../../services/analytics.service').AnalyticsService, useValue: { logSystemAction: ()=>{} } },");
    fs.writeFileSync('src/app/components/novedades/novedades.component.spec.ts', novContent, 'utf8');
}

// 5. crear-anuncio.component.spec.ts: OnboardingService
let crearContent = fs.readFileSync('src/app/components/tablon-anuncios/crear-anuncio/crear-anuncio.component.spec.ts', 'utf8');
if (!crearContent.includes('OnboardingService')) {
    crearContent = crearContent.replace("import { ToastService } from '../../../services/toast.service';", "import { ToastService } from '../../../services/toast.service';\nimport { OnboardingService } from '../../../services/onboarding';");
    crearContent = crearContent.replace('providers: [', "providers: [\n        { provide: OnboardingService, useValue: { markStepCompleted: vi.fn() } },");
    fs.writeFileSync('src/app/components/tablon-anuncios/crear-anuncio/crear-anuncio.component.spec.ts', crearContent, 'utf8');
}

console.log("Fixes applied");
