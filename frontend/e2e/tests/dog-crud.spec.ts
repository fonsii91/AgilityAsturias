import { test, expect } from '@playwright/test';

test.describe('Dog CRUD Flow', () => {

  test('user can create, view, and delete a dog', async ({ page }) => {
    // 1. Iniciar sesión como miembro
    await page.goto('/login');
    await page.fill('input[type="email"]', 'member@agility.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/calendario'); // O la ruta de inicio por defecto

    // 2. Navegar a Mi Manada
    await page.goto('/gestionar-perros');
    await page.waitForLoadState('networkidle');

    // 3. Crear nuevo perro
    await page.click('button:has-text("Añadir Perro"), button:has-text("Añadir tu primer perro")');
    await page.waitForURL('**/gestionar-perros/nuevo');

    const dogName = `E2E Test Dog ${Date.now()}`;
    await page.fill('input[placeholder="P. ej. Toby"]', dogName);
    await page.fill('input[placeholder="Si es mestizo, indícalo"]', 'Test Breed');
    await page.fill('input[type="date"]', '2020-01-01');

    await page.click('button:has-text("Registrar Perro")');

    // Esperar mensaje de éxito
    await expect(page.getByText('Perro registrado').first()).toBeVisible();
    await page.waitForURL('**/gestionar-perros');

    // 4. Verificar que el perro aparece en la lista
    await expect(page.getByText(dogName).first()).toBeVisible();
    await expect(page.getByText('Test Breed').first()).toBeVisible();

    // 5. Entrar al perfil del perro
    await page.click(`div.dog-card:has-text("${dogName}")`);
    await page.waitForURL('**/gestionar-perros/**');

    // 6. Navegar a los ajustes
    await page.click('a.nav-tab:has-text("Ajustes")');
    
    // Esperar a que cargue la tarjeta de zona de peligro
    await expect(page.locator('.danger-zone-card')).toBeVisible();

    // 7. Iniciar borrado
    await page.click('button:has-text("Eliminar a")');

    // Rellenar confirmación en el modal
    await expect(page.locator('.delete-modal')).toBeVisible();
    await page.fill('.delete-modal input[type="text"]', 'BORRAR');

    // Confirmar
    await page.click('button:has-text("Sí, Eliminar Definitivamente")');

    // Esperar mensaje de éxito
    await expect(page.getByText(`Perfil de ${dogName} borrado`).first()).toBeVisible();

    // 8. Verificar que volvemos a la lista y ya no está
    await page.waitForURL('**/gestionar-perros');
    await expect(page.getByText(dogName)).toHaveCount(0);
  });

});
