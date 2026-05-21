const { chromium } = require('playwright');

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function parseFlowAgilityDateRange(dateStr, referenceDate = new Date()) {
  if (!dateStr) return null;
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  
  const cleanStr = dateStr.trim().replace(/\s+/g, ' ');
  let startMonth, startDay, endMonth, endDay;
  
  if (!cleanStr.includes('-')) {
    const parts = cleanStr.split(' ');
    if (parts.length < 2) return null;
    const m = MONTHS[parts[0].toLowerCase()];
    if (!m) return null;
    startMonth = m;
    startDay = parseInt(parts[1], 10);
    endMonth = startMonth;
    endDay = startDay;
  } else {
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
  
  let startYear = currentYear;
  if (startMonth < currentMonth) {
    startYear = currentYear + 1;
  }
  
  let endYear = startYear;
  if (endMonth < startMonth) {
    endYear = startYear + 1;
  }
  
  const pad = (n) => n.toString().padStart(2, '0');
  return {
    start: `${startYear}-${pad(startMonth)}-${pad(startDay)}`,
    end: `${endYear}-${pad(endMonth)}-${pad(endDay)}`
  };
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
