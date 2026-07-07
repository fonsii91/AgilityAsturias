const { chromium } = require('playwright');

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function parseFlowAgilityDateRange(dateStr, referenceDate = new Date()) {
  if (!dateStr) return null;
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  const cleanStr = dateStr.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');

  // Parses one side of the range: "Sep 19", "Jul 31, 2026", "14" or "Aug 2, 2027".
  // FlowAgility omits the year when the range stays within one year, but renders
  // full dates ("Jul 31, 2026 - Aug 2, 2027") when start and end years differ.
  const parseSide = (str) => {
    const tokens = str.replace(/,/g, ' ').trim().split(/\s+/);
    const side = { month: null, day: null, year: null };
    for (const token of tokens) {
      if (/^\d{4}$/.test(token)) side.year = parseInt(token, 10);
      else if (/^\d{1,2}$/.test(token)) side.day = parseInt(token, 10);
      else if (MONTHS[token.toLowerCase()]) side.month = MONTHS[token.toLowerCase()];
    }
    return side;
  };

  let start, end;
  if (!cleanStr.includes('-')) {
    // Single day: "Sep 19" or "Sep 19, 2026"
    start = parseSide(cleanStr);
    end = { ...start };
  } else {
    // Range: "Jun 13 - 14", "Jun 27 - Jul 5" or "Jul 31, 2026 - Aug 2, 2027"
    const rangeParts = cleanStr.split('-');
    start = parseSide(rangeParts[0]);
    end = parseSide(rangeParts.slice(1).join(' '));
    if (end.month === null) end.month = start.month;
  }

  if (!start.month || !start.day || isNaN(start.day) || !end.month || !end.day || isNaN(end.day)) {
    return null;
  }

  // Years: use the explicit ones when present, otherwise infer (listed events are upcoming)
  if (start.year === null) {
    start.year = start.month < currentMonth ? currentYear + 1 : currentYear;
  }
  if (end.year === null) {
    end.year = end.month < start.month ? start.year + 1 : start.year;
  }

  // Sanity clamp: agility events span days, not months. An end date more than ~2 months
  // after the start (or before it) is an organizer typo (e.g. end year set to 2027 on a
  // 2026 event); retry with the start year before giving up.
  const DAY_MS = 24 * 3600 * 1000;
  const toUTC = (s, year) => Date.UTC(year, s.month - 1, s.day);
  const span = toUTC(end, end.year) - toUTC(start, start.year);
  if (span < 0 || span > 62 * DAY_MS) {
    const sameYearSpan = toUTC(end, start.year) - toUTC(start, start.year);
    if (sameYearSpan >= 0 && sameYearSpan <= 62 * DAY_MS) {
      end.year = start.year;
    } else if (span < 0) {
      end = { ...start };
    }
  }

  const pad = (n) => n.toString().padStart(2, '0');
  return {
    start: `${start.year}-${pad(start.month)}-${pad(start.day)}`,
    end: `${end.year}-${pad(end.month)}-${pad(end.day)}`
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
