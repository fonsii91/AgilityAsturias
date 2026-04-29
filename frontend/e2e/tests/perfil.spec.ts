import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Gestión de Perfil', () => {
  // Configuración antes de cada test: iniciar sesión
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'login-debug.png' });
    
    // Fill the login form
    await page.fill('input[type="email"]', 'member@agility.com');
    await page.fill('input[type="password"]', 'password');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for successful navigation (e.g., to home or dashboard)
    await page.waitForURL('**/calendario', { timeout: 15000 });
    
    // Check that we are logged in (we could check for a logout button or avatar)
  });

  test('debe permitir la edición del nombre del perfil', async ({ page }) => {
    // Navegar a la página de perfil
    await page.goto('/perfil');

    // Esperar a que el componente de perfil cargue
    await expect(page.locator('.perfil-container')).toBeVisible({ timeout: 10000 });

    // Hacer clic en el botón de editar nombre
    const editNameButton = page.locator('.name-display .btn-icon-edit');
    await editNameButton.click();

    // Rellenar el nuevo nombre
    const nameInput = page.locator('.edit-name-input');
    // Clear and type the new name
    await nameInput.fill('Test Member Playwright');

    // Guardar los cambios
    const saveButton = page.locator('.edit-actions .btn-check');
    await saveButton.click();

    // Esperar el toast de éxito
    await expect(page.getByText(/actualizado|éxito/i).first()).toBeVisible();

    // Validar que el nombre persiste recargando la página
    await page.reload();
    await expect(page.locator('.name-display h2')).toHaveText('Test Member Playwright');
    
    // Restaurar el nombre original para no romper futuras ejecuciones
    await editNameButton.click();
    await nameInput.fill('Test Member');
    await saveButton.click();
    await expect(page.getByText(/actualizado|éxito/i).first()).toBeVisible();
  });

  test('debe permitir subir una foto de perfil', async ({ page }) => {
    // Navegar a la página de perfil
    await page.goto('/perfil');
    // Esperar a que el componente de perfil cargue
    await expect(page.locator('.perfil-container')).toBeVisible({ timeout: 10000 });

    // Preparar el archivo de imagen falso
    const imagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    // Escuchar la respuesta de la red para asegurar que el endpoint responde
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/user/profile') && response.request().method() === 'POST'
    );

    // Seleccionar el input de archivo y subir la imagen
    // Usamos el input de tipo file oculto o visible
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);

    // Si hay un botón de "Subir" explícito, lo clickeamos (o se sube automáticamente tras la selección)
    // Supongamos que el componente sube la foto automáticamente o requiere pulsar un botón "Guardar Foto"
    const uploadButton = page.getByRole('button', { name: /subir|guardar foto/i });
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
    }

    // Esperar la respuesta del backend
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Verificar notificación de éxito
    await expect(page.getByText(/foto|actualizado/i).first()).toBeVisible();
  });
});
