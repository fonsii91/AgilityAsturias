import { test, expect } from '@playwright/test';

test.describe('Vistas Públicas - Smoke Test', () => {
  test('debe cargar la página de inicio correctamente', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Expect the page to have the main components
    // We check for some generic text or structure that should be present
    // Depending on what is rendered. "Club Agility" or a typical title.
    await expect(page).toHaveTitle(/AgilityAsturiass|Club Agility/i);
    
    // We can just verify the page loads without network errors
    const isLoaded = await page.evaluate(() => document.readyState === 'complete');
    expect(isLoaded).toBeTruthy();
  });
});
