const { chromium } = require('playwright');

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function parseFlowAgilityDateRange(dateStr, referenceDate = new Date()) {
  if (!dateStr) return null;
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12
  
  const cleanStr = dateStr.trim().replace(/\s+/g, ' ');
  let startMonth, startDay, endMonth, endDay;
  
  if (!cleanStr.includes('-')) {
    // Single day: "Sep 19"
    const parts = cleanStr.split(' ');
    if (parts.length < 2) return null;
    const m = MONTHS[parts[0].toLowerCase()];
    if (!m) return null;
    startMonth = m;
    startDay = parseInt(parts[1], 10);
    endMonth = startMonth;
    endDay = startDay;
  } else {
    // Range: "Jun 13 - 14" or "Jun 27 - Jul 5"
    const rangeParts = cleanStr.split('-').map(p => p.trim());
    const leftParts = rangeParts[0].split(' ');
    if (leftParts.length < 2) return null;
    const sm = MONTHS[leftParts[0].toLowerCase()];
    if (!sm) return null;
    startMonth = sm;
    startDay = parseInt(leftParts[1], 10);
    
    const rightParts = rangeParts[1].split(' ');
    if (rightParts.length === 1) {
      endMonth = startMonth;
      endDay = parseInt(rightParts[0], 10);
    } else if (rightParts.length === 2) {
      const em = MONTHS[rightParts[0].toLowerCase()];
      if (!em) return null;
      endMonth = em;
      endDay = parseInt(rightParts[1], 10);
    } else {
      return null;
    }
  }
  
  if (!startMonth || isNaN(startDay) || !endMonth || isNaN(endDay)) {
    return null;
  }
  
  // Calculate years
  let startYear = currentYear;
  if (startMonth < currentMonth) {
    // Event has already passed in current year, must be next year
    startYear = currentYear + 1;
  }
  
  let endYear = startYear;
  if (endMonth < startMonth) {
    // Year crossover
    endYear = startYear + 1;
  }
  
  const pad = (n) => n.toString().padStart(2, '0');
  return {
    start: `${startYear}-${pad(startMonth)}-${pad(startDay)}`,
    end: `${endYear}-${pad(endMonth)}-${pad(endDay)}`
  };
}

(async () => {
  console.log("[CALENDAR SCRAPER] Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();
  
  try {
    console.log("[CALENDAR SCRAPER] Navigating to https://www.flowagility.com/zone/events ...");
    await page.goto('https://www.flowagility.com/zone/events', { waitUntil: 'networkidle', timeout: 30000 });
    
    const currentUrl = page.url();
    console.log("[CALENDAR SCRAPER] Current URL:", currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log("[CALENDAR SCRAPER] Redirected to login wall. Authenticating...");
      await page.fill('input#user_email', 'torrija999@gmail.com');
      await page.fill('input#user_password', 'torrijaia');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
        page.click('button#signin')
      ]);
      console.log("[CALENDAR SCRAPER] Login successful. Returning to events page...");
      await page.goto('https://www.flowagility.com/zone/events', { waitUntil: 'networkidle', timeout: 30000 });
    }
    
    console.log("[CALENDAR SCRAPER] Waiting for #events container...");
    await page.waitForSelector('#events', { timeout: 15000 });
    
    const rawEvents = await page.evaluate(() => {
      const container = document.querySelector('#events');
      if (!container) return [];
      
      const cards = Array.from(container.querySelectorAll('div[id]'));
      
      return cards.map(card => {
        const id = card.getAttribute('id');
        
        // Skip elements that are not event UUIDs
        if (!id || id.length !== 36) return null;
        
        const nameEl = card.querySelector('.font-caption');
        const name = nameEl ? nameEl.innerText.trim() : '';
        
        // Top row elements: dates and federation
        const topRow = card.querySelector('div.relative.flex.flex-row.justify-between.mb-4.text-gray-500');
        let dateStr = '';
        let fedStr = '';
        if (topRow) {
          const divChildren = Array.from(topRow.querySelectorAll('div.text-xs'));
          if (divChildren.length >= 1) dateStr = divChildren[0].innerText.trim();
          if (divChildren.length >= 2) fedStr = divChildren[1].innerText.trim();
        }
        
        // Organizer and Location (siblings of nameEl)
        let organizer = '';
        let location = '';
        if (nameEl) {
          const orgEl = nameEl.nextElementSibling;
          if (orgEl) {
            organizer = orgEl.innerText.trim();
            const locRow = orgEl.nextElementSibling;
            if (locRow) {
              const locEl = locRow.querySelector('div');
              if (locEl) {
                location = locEl.innerText.trim();
              }
            }
          }
        }
        
        // Bottom row for registration dates
        const bottomRow = card.querySelector('div.flex.flex-row.justify-between.pb-2');
        let regDatesStr = '';
        if (bottomRow) {
          const regContainer = bottomRow.querySelector('div.flex.flex-row');
          if (regContainer) {
            // Find the child div that contains the text (usually the last child)
            const textEl = regContainer.querySelector('div:last-child');
            if (textEl) {
              regDatesStr = textEl.innerText.trim();
            }
          }
        }
        
        return {
          uuid: id,
          nombre: name,
          fecha_evento_str: dateStr,
          federacion_str: fedStr,
          organizador: organizer,
          lugar: location,
          fecha_limite_str: regDatesStr,
          enlace: 'https://www.flowagility.com/zone/events/info/' + id
        };
      }).filter(Boolean);
    });
    
    console.log(`[CALENDAR SCRAPER] Found ${rawEvents.length} raw events. Parsing dates...`);
    const referenceDate = new Date();
    
    const parsedEvents = rawEvents.map(event => {
      // Parse event date
      const eventDates = parseFlowAgilityDateRange(event.fecha_evento_str, referenceDate);
      // Parse registration limit if exists
      const regDates = parseFlowAgilityDateRange(event.fecha_limite_str, referenceDate);
      
      return {
        uuid: event.uuid,
        nombre: event.nombre,
        lugar: event.lugar,
        organizador: event.organizador,
        enlace: event.enlace,
        federacion_str: event.federacion_str,
        fecha_evento: eventDates ? eventDates.start : null,
        fecha_fin_evento: eventDates ? eventDates.end : null,
        fecha_limite: regDates ? regDates.end : null
      };
    });
    
    console.log("RESULT_JSON:" + JSON.stringify(parsedEvents));
    
  } catch (err) {
    console.error("[CALENDAR SCRAPER] Error during scraping:", err);
  } finally {
    await browser.close();
  }
})();
