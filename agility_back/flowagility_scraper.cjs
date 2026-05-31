const { chromium } = require('playwright');

function parseDayTextToDate(dayText, eventDateStr) {
  try {
    const months = {
      // Spanish
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
      'julio': 7, 'agosto': 8, 'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
      // Portuguese
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
      'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
      // English
      'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3, 'april': 4, 'apr': 4,
      'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7, 'august': 8, 'aug': 8,
      'september': 9, 'sep': 9, 'sept': 9, 'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
    };

    const parts = dayText.toLowerCase().trim().split(/\s+/);
    let day = null;
    let month = null;
    let year = null;

    for (const part of parts) {
      const cleanWord = part.replace(/[^a-zà-úçñ]/g, '');
      const cleanNum = part.replace(/\D/g, '');

      // Check if it's a month
      if (months[cleanWord]) {
        month = months[cleanWord];
      }

      // Check if it's a number
      if (cleanNum) {
        const val = parseInt(cleanNum, 10);
        if (val > 1000 && val < 3000) {
          year = val;
        } else if (val >= 1 && val <= 31) {
          day = val;
        }
      }
    }

    if (!day) {
      return eventDateStr;
    }

    // If month is found, construct date normally
    if (month) {
      if (!year) {
        year = parseInt(eventDateStr.split('-')[0], 10) || new Date().getFullYear();
      }
      const pad = (n) => n.toString().padStart(2, '0');
      return `${year}-${pad(month)}-${pad(day)}`;
    }

    // If month is not found, search in 7-day sequence starting from eventDateStr
    const startDate = new Date(eventDateStr + 'T00:00:00');
    if (isNaN(startDate.getTime())) {
      return eventDateStr;
    }

    for (let i = 0; i < 7; i++) {
      const candidateDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      if (candidateDate.getDate() === day) {
        const y = candidateDate.getFullYear();
        const m = candidateDate.getMonth() + 1;
        const d = candidateDate.getDate();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${y}-${pad(m)}-${pad(d)}`;
      }
    }

    return eventDateStr;
  } catch (e) {
    return eventDateStr;
  }
}

(async () => {
  const fs = require('fs');
  // 1. Obtener y parsear los argumentos de la línea de comandos
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("ERROR: No se han proporcionado argumentos de configuración JSON.");
    process.exit(1);
  }

  let config;
  try {
    const arg = args[0];
    if (arg.endsWith('.json') && fs.existsSync(arg)) {
      config = JSON.parse(fs.readFileSync(arg, 'utf8'));
    } else {
      config = JSON.parse(arg);
    }
  } catch (err) {
    console.error("ERROR: Error al parsear los argumentos JSON:", err.message);
    process.exit(1);
  }

  const whitelistedClubs = config.clubs || [];
  const events = config.events || [];

  console.log(`[SCRAPER] Iniciando. Whitelist de clubs: ${JSON.stringify(whitelistedClubs)}`);
  console.log(`[SCRAPER] Eventos a procesar: ${events.length}`);

  if (events.length === 0) {
    console.log("RESULT_JSON:" + JSON.stringify([]));
    process.exit(0);
  }

  console.log("[SCRAPER] Lanzando navegador Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();

  try {
    console.log("[SCRAPER] Navegando a la página de login...");
    await page.goto('https://www.flowagility.com/user/login');
    await page.waitForSelector('input#user_email', { timeout: 15000 });
    
    console.log("[SCRAPER] Introduciendo credenciales...");
    await page.fill('input#user_email', 'torrija999@gmail.com');
    await page.fill('input#user_password', 'torrijaia');
    
    console.log("[SCRAPER] Haciendo clic en iniciar sesión...");
    await Promise.all([
      page.waitForNavigation({ timeout: 20000 }),
      page.click('button#signin')
    ]);

    console.log("[SCRAPER] Sesión iniciada con éxito.");
    const results = [];

    for (const event of events) {
      console.log(`[SCRAPER] Navegando a la página general del evento: ${event.url}`);
      await page.goto(event.url);
      await page.waitForTimeout(3000); // Esperar que LiveView se inicialice

      console.log("[SCRAPER] Expandiendo días...");
      const dayButtons = await page.$$('div[phx-click="row_expand"]');
      console.log(`[SCRAPER] Se encontraron ${dayButtons.length} contenedores de días.`);
      for (const btn of dayButtons) {
        try {
          await btn.click();
          await page.waitForTimeout(1200); // Esperar renderizado asíncrono
        } catch (e) {
          console.log(`[SCRAPER] Advertencia al hacer clic en expandir día: ${e.message}`);
        }
      }

      console.log("[SCRAPER] Obteniendo enlaces de resultados de las categorías estructurados por día...");
      const resultsUrls = await page.evaluate(() => {
        const list = document.querySelector('#trial_group_runs_list');
        if (!list) return [];
        
        const items = Array.from(list.children);
        const result = [];
        for (const item of items) {
          const text = item.innerText.split('\n')[0].trim();
          const anchors = Array.from(item.querySelectorAll('a[href*="/results"]'));
          for (const a of anchors) {
            result.push({
              dayText: text,
              name: a.innerText.trim(),
              url: a.href
            });
          }
        }
        return result;
      });

      // Filtrar URLs duplicadas
      const uniqueResults = [];
      const seenUrls = new Set();
      for (const item of resultsUrls) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          uniqueResults.push(item);
        }
      }

      console.log(`[SCRAPER] Enlaces únicos de categorías encontrados: ${uniqueResults.length}`);

      for (const category of uniqueResults) {
        console.log(`[SCRAPER] Navegando a resultados de categoría: ${category.url}`);
        await page.goto(category.url);
        await page.waitForTimeout(3500); // Esperar carga de la lista

        const psetRows = await page.$$('div[id^="pset_row_pset_row_component_"]');
        console.log(`[SCRAPER] Encontrados ${psetRows.length} competidores en esta categoría.`);

        for (const row of psetRows) {
          const clubHeader = await row.evaluate(el => {
            const header = el.querySelector('div.flex-col.w-full div.text-gray-500');
            return header ? header.innerText.trim() : '';
          });

          const isOurClub = whitelistedClubs.some(c => 
            clubHeader.toLowerCase().includes(c.toLowerCase())
          );

          if (isOurClub) {
            console.log(`[SCRAPER] Coincidencia encontrada para el club: "${clubHeader}". Expandiendo detalles del participante...`);
            const expandBtn = await row.$('div[phx-click="pset_details_show"]');
            if (expandBtn) {
              await expandBtn.click();
              await page.waitForTimeout(1500); // Esperar que LiveView traiga los detalles vía Websocket
            }

            const competitorData = await row.evaluate((rowEl, catName) => {
              const posEl = rowEl.querySelector('div[phx-click="pset_details_show"].font-bold');
              const position = posEl ? posEl.innerText.trim() : '-';

              const headerText = rowEl.querySelector('div.flex-col.w-full div.text-gray-500')?.innerText.trim() || '';
              const headerParts = headerText.split('/');
              const dorsal = headerParts[0] ? headerParts[0].trim() : '';

              const handlerEl = rowEl.querySelector('div.font-bold.text-base');
              const handlerName = handlerEl ? handlerEl.innerText.trim() : '';
              const dogEl = rowEl.querySelector('div.font-bold.text-sm');
              const dogName = dogEl ? dogEl.innerText.trim() : '';

              const grids = Array.from(rowEl.querySelectorAll('div.grid.grid-cols-2'));
              const runs = [];
              let license = '';
              let breed = '';
              let age = '';
              let gender = '';
              let height = '';
              let club = '';
              let characteristics = '';
              let federation = '';

              for (const grid of grids) {
                const titleEl = grid.querySelector('div.col-span-2');
                const title = titleEl ? titleEl.innerText.trim() : '';

                if (title === 'Binomial Info') {
                  const divs = Array.from(grid.children);
                  for (let i = 1; i < divs.length; i += 2) {
                    const label = divs[i] ? divs[i].innerText.trim() : '';
                    const value = divs[i+1] ? divs[i+1].innerText.trim() : '';

                    if (label === 'License') license = value;
                    if (label === 'Breed') breed = value;
                    if (label === 'Age') age = value;
                    if (label === 'Gender') gender = value;
                    if (label === 'Height (cm)') height = value;
                    if (label === 'Club') club = value;
                    if (label === 'Characteristics') characteristics = value;
                    if (label === 'Federation') federation = value;
                  }
                } else if (title !== '') {
                  const runData = {
                    mangaType: title,
                    classification: '',
                    time: '',
                    faults: '',
                    refusals: '',
                    timePenalty: '',
                    totalPenalty: '',
                    speed: '',
                    qualification: ''
                  };

                  const divs = Array.from(grid.children);
                  for (let i = 1; i < divs.length; i += 2) {
                    const label = divs[i] ? divs[i].innerText.trim() : '';
                    const value = divs[i+1] ? divs[i+1].innerText.trim() : '';

                    if (label === 'Classification') runData.classification = value;
                    if (label === 'Time') runData.time = value;
                    if (label === 'Faults') runData.faults = value;
                    if (label === 'Refusals') runData.refusals = value;
                    if (label === 'Excess Time Pen.') runData.timePenalty = value;
                    if (label === 'Total Penalizations') runData.totalPenalty = value;
                    if (label === 'Speed') runData.speed = value;
                    if (label === 'Qualification') runData.qualification = value;
                  }
                  runs.push(runData);
                }
              }

              // Post-process to resolve duplicate manga types
              const typeCounts = {};
              for (const run of runs) {
                typeCounts[run.mangaType] = (typeCounts[run.mangaType] || 0) + 1;
              }
              const typeIndices = {};
              for (const run of runs) {
                const baseType = run.mangaType;
                if (typeCounts[baseType] > 1) {
                  typeIndices[baseType] = (typeIndices[baseType] || 0) + 1;
                  run.mangaType = `${baseType} ${typeIndices[baseType]}`;
                }
              }

              return {
                categoryName: catName,
                position,
                dorsal,
                handlerName,
                dogName,
                license,
                breed,
                age,
                gender,
                height,
                club: club || (headerParts[1] ? headerParts[1].trim() : headerText),
                characteristics,
                federation,
                runs
              };
            }, category.name);

            console.log(`[SCRAPER] Datos extraídos con éxito: Perro "${competitorData.dogName}" / Guía "${competitorData.handlerName}"`);
            results.push({
              eventId: event.id,
              runDate: parseDayTextToDate(category.dayText, event.date),
              ...competitorData
            });
          }
        }
      }
    }

    // 4. Retornar los resultados estructurados
    console.log("RESULT_JSON:" + JSON.stringify(results));

  } catch (error) {
    console.error("ERROR: Excepción durante el proceso de scraping:", error.message);
  } finally {
    await browser.close();
  }
})();
