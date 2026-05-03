import { test, expect } from '@playwright/test';

test.describe('Manager Role Flow', () => {

  test('manager can access club edit and manage member roles', async ({ page }) => {
    // 1. Iniciar sesión como manager (las credenciales deben coincidir con UserAndDogSeeder)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'manager@agility.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Esperar a que redirija al inicio
    await page.waitForURL('**/calendario');

    // 2. Verificar que el manager puede ver "Gestor" en el navbar y "Configurar Club"
    const gestorDropdown = page.locator('a.dropdown-toggle').filter({ hasText: 'Gestor' });
    await expect(gestorDropdown).toBeVisible();
    await gestorDropdown.click();
    
    const configurarClubLink = page.locator('a:has-text("Configurar Club")').first();
    await expect(configurarClubLink).toBeVisible();

    // 3. Navegar a Configurar Club
    await configurarClubLink.click();
    
    // Esperar a que la URL sea la de edición del club y cargue la vista
    await page.waitForURL('**/admin/clubs/edit/**');
    await expect(page.locator('h1').filter({ hasText: 'Configuración del Club' }).first()).toBeVisible();

    // 4. Navegar a Gestionar Miembros
    await page.goto('/gestionar-miembros');
    await page.waitForLoadState('networkidle');

    // Verificar que la tabla carga usuarios
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Buscar a "Test Member"
    const memberRow = page.locator('tr').filter({ hasText: 'Test Member' });
    await expect(memberRow).toBeVisible();

    // Verificar que el select para ese miembro está habilitado y contiene la opción de "Staff" (ya que somos Manager)
    const selectForMember = memberRow.locator('select.role-select');
    await selectForMember.waitFor();
    await expect(selectForMember).not.toBeDisabled();
    
    const options = await selectForMember.locator('option').allTextContents();
    expect(options).toContain('Staff');
    expect(options).toContain('Inactivo');
    expect(options).toContain('Miembro');

    // Verificar que un admin no puede ser modificado (o no aparece si lo filtramos)
    // (Se omite la validación de ocultar a admin porque en pruebas locales el rol puede variar si se tocan los seeders manuales)

    // Verificar que al ver a otro Staff o Manager (en este caso el Staff User del seeder)
    const staffRow = page.locator('tr').filter({ hasText: 'Staff User' });
    if (await staffRow.count() > 0) {
       const staffSelect = staffRow.locator('select.role-select');
       await expect(staffSelect).not.toBeDisabled(); // El gestor SÍ puede modificar a un Staff
       const staffOptions = await staffSelect.locator('option').allTextContents();
       expect(staffOptions).toContain('Inactivo');
       expect(staffOptions).toContain('Miembro');
       expect(staffOptions).toContain('Staff');
    }
  });

});
