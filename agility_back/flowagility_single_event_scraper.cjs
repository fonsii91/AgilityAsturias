const { chromium } = require('playwright');

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function parseFlowAgilityDateRange(dateStr, referenceDate = new Date()) {
  if (!dateStr) return null;
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

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
    start = parseSide(cleanStr);
    end = { ...start };
  } else {
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

// Same sanity clamp for the structured "Start Date"/"End Date" fields of the event
// page, which carry organizer typos verbatim (e.g. "Aug 2, 2027" on a 2026 event).
function clampEventEndDate(startStr, endStr) {
  if (!startStr || !endStr) return endStr;
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return endStr;
  const DAY_MS = 24 * 3600 * 1000;
  const span = end.getTime() - start.getTime();
  if (span >= 0 && span <= 62 * DAY_MS) return endStr;
  const sameYear = new Date(end.getTime());
  sameYear.setUTCFullYear(start.getUTCFullYear());
  const sameYearSpan = sameYear.getTime() - start.getTime();
  if (sameYearSpan >= 0 && sameYearSpan <= 62 * DAY_MS) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${sameYear.getUTCFullYear()}-${pad(sameYear.getUTCMonth() + 1)}-${pad(sameYear.getUTCDate())}`;
  }
  return span < 0 ? startStr : endStr;
}

// Convert "Jul 17, 2026, 14:00" to "2026-07-17" or similar
function parseFullDate(dateStr) {
  if (!dateStr) return null;
  try {
    // "Jul 17, 2026, 14:00" or "Jul 19, 2026"
    // We can parse this using JavaScript Date
    const d = new Date(dateStr.replace(/,\s*\d{2}:\d{2}/, '')); // remove time if any
    if (isNaN(d.getTime())) return null;
    
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch (e) {
    return null;
  }
}

function extractJudgesFromText(bodyText) {
  if (!bodyText) return [];
  const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
  const allJudges = new Set();

  const splitNames = (str) => {
    if (!str) return [];
    const normalized = str
      .replace(/\s+y\s+/gi, ', ')
      .replace(/\s+and\s+/gi, ', ')
      .replace(/\s+&\s+/gi, ', ');
    return normalized.split(',').map(s => s.trim()).filter(Boolean);
  };

  const isValidJudgeName = (name) => {
    if (!name) return false;
    const clean = name.trim();
    if (clean.length < 3 || clean.length > 40) return false;
    if (/\d/.test(clean)) return false;
    if (/[/@€:]/.test(clean)) return false;
    
    const lower = clean.toLowerCase();
    const excludeWords = [
      'juez', 'jueces', 'judge', 'judges',
      'donativos', 'donativo', 'donacion', 'donaciones', 'precio', 'precios', 'pago', 'pagar', 'gratis', 'junior',
      'perro', 'perros', 'dia', 'dias', 'transferencia', 'concepto', 'justificante', 'sabado', 'domingo', 'fin de', 'finde',
      'medicion', 'mediciones', 'dorsal', 'telegram', 'email', 'correo', 'telefono', 'inscripcion', 'inscripciones',
      'fines', 'consentimiento', 'reglamento', 'normas', 'club', 'agility', 'pista', 'pistas', 'fci', 'rsce', 'rfec',
      'cuenta', 'banco', 'bbva', 'santander', 'bizum', 'contacto', 'organizacion', 'prueba', 'pruebas', 'trofeos',
      'medir', 'vacunacion', 'cartilla', 'abren', 'abertura', 'cierre', 'cerraran', 'limite', 'euro', 'euros', '€',
      'días', 'día', 'sábado', 'manga', 'mangas', 'horario', 'horarios', 'grado', 'grados', 'categoría', 'categorías'
    ];
    
    for (const word of excludeWords) {
      if (new RegExp('\\b' + word + '\\b', 'i').test(lower)) {
        return false;
      }
    }
    
    const words = clean.split(/\s+/);
    if (words.length > 5) return false;
    
    return true;
  };

  for (let i = 0; i < lines.length; i++) {
    const origLine = lines[i];
    const line = origLine.toLowerCase();
    const isJudgeLine = (line.includes('juez') || line.includes('jueces') || line.includes('judges'));
    
    if (isJudgeLine) {
      if (origLine.includes(':')) {
        const parts = origLine.split(':');
        if (parts.length >= 2) {
          const candidateText = parts.slice(1).join(':').trim();
          const candidates = splitNames(candidateText);
          for (const cand of candidates) {
            if (isValidJudgeName(cand)) {
              allJudges.add(cand);
            }
          }
        }
      }
      
      if (line.length < 30) {
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          const lowerNextLine = nextLine.toLowerCase();
          
          if (
            lowerNextLine.includes('horarios') || 
            lowerNextLine.includes('timetable') || 
            lowerNextLine.includes('precios') || 
            lowerNextLine.includes('prices') || 
            lowerNextLine.includes('localización') || 
            lowerNextLine.includes('location') || 
            lowerNextLine.includes('pernocta') || 
            lowerNextLine.includes('overnight') || 
            lowerNextLine.includes('información') || 
            lowerNextLine.includes('information') ||
            lowerNextLine.includes('normas') ||
            lowerNextLine.includes('general rules') ||
            lowerNextLine.includes('inscripción') ||
            lowerNextLine.includes('inscripciones') ||
            nextLine.length > 60
          ) {
            break;
          }
          
          if (lowerNextLine === 'name' || lowerNextLine === 'nombre') {
            continue;
          }
          
          const candidates = splitNames(nextLine);
          let foundAny = false;
          for (const cand of candidates) {
            if (isValidJudgeName(cand)) {
              allJudges.add(cand);
              foundAny = true;
            }
          }
          
          if (!foundAny && nextLine.length > 0) {
            if (nextLine.length > 15 || nextLine.split(/\s+/).length > 3) {
              break;
            }
          }
        }
      }
    }
  }

  const cleanNameNorm = (n) => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim();
  const seenNormalized = new Set();
  const uniqueJudges = [];
  
  Array.from(allJudges).forEach(name => {
    const norm = cleanNameNorm(name);
    if (!seenNormalized.has(norm)) {
      seenNormalized.add(norm);
      uniqueJudges.push(name);
    }
  });
  
  return uniqueJudges;
}


(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("ERROR: No URL provided.");
    process.exit(1);
  }
  const url = args[0];

  console.log(`[SINGLE SCRAPER] Launching browser for: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  const page = await context.newPage();
  
  try {
    console.log("[SINGLE SCRAPER] Logging in first...");
    await page.goto('https://www.flowagility.com/user/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input#user_email', 'torrija999@gmail.com');
    await page.fill('input#user_password', 'torrijaia');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.click('button#signin')
    ]);
    
    console.log("[SINGLE SCRAPER] Navigating to target event page...");
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const rawData = await page.evaluate(() => {
      const data = {};
      data.bodyText = document.body.innerText;
      
      const header = document.querySelector('#event_header');
      if (header) {
        const textXs = Array.from(header.querySelectorAll('.text-xs'));
        if (textXs.length >= 2) {
          data.fecha_evento_str = textXs[0].innerText.trim();
          data.federacion_str = textXs[1].innerText.trim();
        }
        
        const titleEl = header.querySelector('.font-caption');
        if (titleEl) {
          data.nombre = titleEl.innerText.trim();
        }
        
        const orgEl = header.querySelector('.text-xs.mb-1.mt-1');
        if (orgEl) {
          data.organizador = orgEl.innerText.trim();
        }
      }
      
      const keyEls = Array.from(document.querySelectorAll('.text-gray-500.text-sm'));
      keyEls.forEach(keyEl => {
        const key = keyEl.innerText.trim().toLowerCase();
        const valEl = keyEl.nextElementSibling;
        if (valEl) {
          const val = valEl.innerText.trim();
          if (key === 'start date') data.start_date_str = val;
          if (key === 'end date') data.end_date_str = val;
          if (key === 'close date') data.close_date_str = val;
          if (key === 'address') data.address = val;
          if (key === 'city') data.city = val;
          if (key === 'country') data.country = val;
        }
      });
      
      const sectionHeaders = Array.from(document.querySelectorAll('div.font-bold.text-sm.border-b'));
      sectionHeaders.forEach(sh => {
        const secName = sh.innerText.trim().toLowerCase();
        if (secName.includes('judges')) {
          let sibling = sh.nextElementSibling;
          while (sibling) {
            if (sibling.innerText && sibling.innerText.trim().toLowerCase() === 'name') {
              const nameValEl = sibling.nextElementSibling;
              if (nameValEl) {
                data.judge_name = nameValEl.innerText.trim();
              }
              break;
            }
            sibling = sibling.nextElementSibling;
          }
        }
      });
      
      return data;
    });
    
    // Process and format dates
    const referenceDate = new Date();
    let fecha_evento = parseFullDate(rawData.start_date_str);
    let fecha_fin_evento = parseFullDate(rawData.end_date_str);
    let fecha_limite = parseFullDate(rawData.close_date_str);
    
    // Fallback if full date parsing fails
    if (!fecha_evento && rawData.fecha_evento_str) {
      const parsedRange = parseFlowAgilityDateRange(rawData.fecha_evento_str, referenceDate);
      if (parsedRange) {
        fecha_evento = parsedRange.start;
        fecha_fin_evento = parsedRange.end;
      }
    }

    fecha_fin_evento = clampEventEndDate(fecha_evento, fecha_fin_evento);
    
    // Construct location string
    let lugar = rawData.city || '';
    if (rawData.address) {
      lugar = rawData.address + (lugar ? ', ' + lugar : '');
    }
    if (rawData.country) {
      lugar = lugar + (lugar ? ' / ' + rawData.country : rawData.country);
    }
    
    let judge_name = rawData.judge_name || null;
    const descJudges = extractJudgesFromText(rawData.bodyText);
    
    // Merge judges from structured section and description
    const mergedJudgesSet = new Set();
    if (rawData.judge_name) {
      const structuredJudges = rawData.judge_name.split(',').map(j => j.trim()).filter(Boolean);
      structuredJudges.forEach(j => mergedJudgesSet.add(j));
    }
    descJudges.forEach(j => mergedJudgesSet.add(j));
    
    const stripHonorifics = (name) => {
      return name.replace(/^\s*(dñ?a|don?|doña|sra?|mr|mrs|ms|dr)\.?\s+/i, '').trim();
    };

    // Sort by length descending to process longer, more complete names first
    const sortedByLength = Array.from(mergedJudgesSet)
      .map(stripHonorifics)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const uniqueMergedJudges = [];
    const seenNormalized = new Set();

    sortedByLength.forEach(name => {
      const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, "").trim();
      
      let isDuplicate = false;
      for (const seen of seenNormalized) {
        if (seen.includes(norm)) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        seenNormalized.add(norm);
        uniqueMergedJudges.push(name);
      }
    });
    
    if (uniqueMergedJudges.length > 0) {
      judge_name = uniqueMergedJudges.reverse().join(', '); // reverse to original order approximation if desired, or keep as is (since sorted was longest first, reversing places them in shortest-last or original longer-first which is fine. Let's keep length descending order, or keep longest first, so reverse() or just join is fine. Let's just keep longest first).
      judge_name = uniqueMergedJudges.join(', ');
    }
    
    const parsedEvent = {
      nombre: rawData.nombre || '',
      lugar: lugar || null,
      organizador: rawData.organizador || null,
      enlace: url,
      federacion_str: rawData.federacion_str || null,
      fecha_evento: fecha_evento,
      fecha_fin_evento: fecha_fin_evento,
      fecha_limite: fecha_limite,
      judge_name: judge_name
    };
    
    console.log("RESULT_JSON:" + JSON.stringify(parsedEvent));
    
  } catch (err) {
    console.error("[SINGLE SCRAPER] Error during scraping:", err);
  } finally {
    await browser.close();
  }
})();
