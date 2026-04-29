import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {

  test('admin can generate reset link and user can reset password', async ({ page, request }) => {
    // 1. Iniciar sesión como administrador
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@agility.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/calendario');

    // 2. Obtener el token de acceso del localStorage (o cookie) y usarlo para llamadas API
    const authState = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(authState).toBeTruthy();

    // 3. Obtener la lista de usuarios para encontrar el ID del member
    const usersResponse = await request.get(`${process.env['API_URL'] || 'http://agility_back.test/api'}/users/minimal`, {
      headers: {
        'Authorization': `Bearer ${authState}`,
        'Accept': 'application/json'
      }
    });
    
    expect(usersResponse.ok()).toBeTruthy();
    const users = await usersResponse.json();
    const member = users.find((u: any) => u.email === 'member@agility.com');
    expect(member).toBeTruthy();

    // 4. Generar el enlace de reseteo para el member
    const resetResponse = await request.post(`${process.env['API_URL'] || 'http://agility_back.test/api'}/users/${member.id}/generate-reset-link`, {
      headers: {
        'Authorization': `Bearer ${authState}`,
        'Accept': 'application/json'
      }
    });

    expect(resetResponse.ok()).toBeTruthy();
    const resetData = await resetResponse.json();
    expect(resetData.link).toContain('reset-password?token=');

    // Cerrar sesión
    await page.evaluate(() => localStorage.removeItem('access_token'));
    
    // 5. Extraer el token de la URL y navegar
    const link = new URL(resetData.link);
    const resetToken = link.searchParams.get('token');
    
    await page.goto(`/reset-password?token=${resetToken}`);

    // 6. Rellenar el formulario de nueva contraseña
    await page.fill('input[formControlName="password"]', 'newpassword123');
    await page.fill('input[formControlName="password_confirmation"]', 'newpassword123');
    
    // Interceptar la respuesta del backend para reset
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/reset-password') && response.request().method() === 'POST'
    );
    
    await page.click('button[type="submit"]');
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Comprobar mensaje de éxito en UI
    await expect(page.getByText(/actualizada correctamente|éxito/i).first()).toBeVisible();

    // 7. Intentar iniciar sesión con la nueva contraseña
    await page.goto('/login');
    await page.fill('input[type="email"]', 'member@agility.com');
    await page.fill('input[type="password"]', 'newpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/calendario');

    // 8. Restaurar la contraseña original para no romper otros tests
    const newAuthState = await page.evaluate(() => localStorage.getItem('access_token'));
    
    // El admin restaura la contraseña (no tenemos endpoint para cambiar contraseña propia sin token, 
    // pero podemos hacer que el admin le resetee la contraseña y ya está, o dejar la nueva y los tests que usan password fallarán. 
    // Espera, otros tests usan 'password'. Vamos a dejarla como 'password').
    // Para simplificar, generamos un token de reset y la volvemos a poner como 'password'
    
    const adminRequestToken = await request.post(`${process.env['API_URL'] || 'http://agility_back.test/api'}/login`, {
      data: { email: 'admin@agility.com', password: 'password' }
    });
    const adminData = await adminRequestToken.json();
    
    const resetAgainResponse = await request.post(`${process.env['API_URL'] || 'http://agility_back.test/api'}/users/${member.id}/generate-reset-link`, {
      headers: {
        'Authorization': `Bearer ${adminData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    const resetAgainData = await resetAgainResponse.json();
    const link2 = new URL(resetAgainData.link);
    
    await request.post(`${process.env['API_URL'] || 'http://agility_back.test/api'}/reset-password`, {
      data: {
        token: link2.searchParams.get('token'),
        password: 'password',
        password_confirmation: 'password'
      }
    });
  });

  test('shows error with invalid token', async ({ page }) => {
    await page.goto(`/reset-password?token=invalid-fake-token-1234`);
    
    await page.fill('input[formControlName="password"]', 'newpassword123');
    await page.fill('input[formControlName="password_confirmation"]', 'newpassword123');
    
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/inválido/i).first()).toBeVisible();
  });
});
