const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Iniciando navegador Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  try {
    const resultsUrl = 'https://www.flowagility.com/zone/event/b6a5b896-93bb-4b12-9344-cfb41c52fe65/group_run/f77e106b-a59d-479a-bedf-c7886f5ef5ae/results';
    console.log(`Navegando a la categoría Iniciación / JP1: ${resultsUrl}`);
    await page.goto(resultsUrl);
    
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    if (currentUrl.includes('/login') || await page.$('input#user_email')) {
      console.log("Iniciando sesión...");
      await page.fill('input#user_email', 'torrija999@gmail.com');
      await page.fill('input#user_password', 'torrijaia');
      await Promise.all([
        page.waitForNavigation(),
        page.click('button#signin')
      ]);
      console.log("Sesión iniciada.");
    }

    console.log("Esperando carga de lista...");
    await page.waitForTimeout(4000);

    // 1. Encontrar todas las filas y buscar la de Nacho Cepedano / Luna
    console.log("Buscando el botón de desplegar de Nacho Cepedano / Luna...");
    
    // Podemos hacer clic en todos los elementos pset_details_show para expandir a todos los competidores
    const expandButtons = await page.$$('div[phx-click="pset_details_show"]');
    console.log(`Encontrados ${expandButtons.length} botones de expansión de competidores.`);

    // Hacemos clic en los primeros 3 para inspeccionar la estructura (incluyendo a Luna que está en 2º puesto)
    for (let i = 0; i < Math.min(expandButtons.length, 5); i++) {
      console.log(`Expandiendo competidor en posición ${i+1}...`);
      await expandButtons[i].click();
      await page.waitForTimeout(1000); // Esperar que LiveView renderice la expansión
    }

    // Guardar el código HTML actual con competidores expandidos
    const htmlContent = await page.content();
    const htmlPath = path.join(__dirname, 'competitors_expanded.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log(`HTML con competidores expandidos guardado en: ${htmlPath}`);

    // Guardar captura de pantalla
    const pngPath = path.join(__dirname, 'competitors_expanded.png');
    await page.screenshot({ path: pngPath, fullPage: true });
    console.log(`Captura de pantalla de competidores expandidos guardada en: ${pngPath}`);

    // Imprimir fragmento de texto alrededor de Luna para ver los detalles expandidos
    const textSnippet = await page.evaluate(() => {
      // Buscar en el texto
      const bodyText = document.body.innerText;
      const index = bodyText.indexOf("Luna");
      if (index !== -1) {
        return bodyText.substring(index - 100, index + 400);
      }
      return "No se encontró el texto Luna";
    });
    console.log("\n--- TEXTO DETALLES ALREDEDOR DE LUNA ---");
    console.log(textSnippet);

  } catch (error) {
    console.error("Error durante la ejecución:", error);
  } finally {
    await browser.close();
    console.log("Navegador cerrado.");
  }
})();
