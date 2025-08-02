#!/usr/bin/env node

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import fs from 'fs-extra';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import ora from 'ora';

// Configuración de argumentos de línea de comandos
const argv = yargs(hideBin(process.argv))
  .option('week', {
    alias: 'w',
    type: 'string',
    description: 'Fecha de la semana (YYYY-MM-DD) o "latest"',
    default: 'latest'
  })
  .option('force', {
    alias: 'f',
    type: 'boolean',
    description: 'Forzar actualización aunque ya existan datos',
    default: false
  })
  .option('language', {
    alias: 'l',
    type: 'string',
    description: 'Idioma del contenido',
    default: 'es'
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Directorio de salida',
    default: './data'
  })
  .help()
  .argv;

// Configuración global
const CONFIG = {
  baseUrl: 'https://www.jw.org',
  language: argv.language,
  // Configuración de idiomas soportados basada en investigación real de JW.org
  // Solo idiomas principales con contenido completo de reuniones
  languages: {
    // Idiomas con soporte completo basado en patrones reales de JW.org
    es: {
      name: 'Español',
      nativeName: 'Español',
      libraryPath: 'biblioteca',
      workbookPath: 'guia-actividades-reunion-testigos-jehova',
      watchtowerPath: 'revistas',
      watchtowerPrefix: 'atalaya-estudio',
      meetingPrefix: 'Vida-y-Ministerio-Cristianos',
      months: [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ],
      dateFormat: 'd \\de MMMM \\de yyyy',
      hasFullContent: true
    },
    en: {
      name: 'English',
      nativeName: 'English',
      libraryPath: 'library',
      workbookPath: 'jw-meeting-workbook',
      watchtowerPath: 'library/magazines',
      watchtowerPrefix: 'watchtower-study',
      meetingPrefix: 'Our-Christian-Life-and-Ministry-Meeting',
      months: [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ],
      dateFormat: 'MMMM d, yyyy',
      hasFullContent: true
    },
    pt: {
      name: 'Portuguese (Brazil)',
      nativeName: 'Português (Brasil)',
      libraryPath: 'biblioteca',
      workbookPath: 'apostila-reuniao-vida-ministerio-cristao',
      watchtowerPath: 'biblioteca/revistas',
      watchtowerPrefix: 'sentinela-estudo',
      meetingPrefix: 'Nossa-Vida-e-Ministerio-Cristao',
      months: [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ],
      dateFormat: 'd \\de MMMM \\de yyyy',
      hasFullContent: true
    },
    fr: {
      name: 'French',
      nativeName: 'Français',
      libraryPath: 'bibliotheque',
      workbookPath: 'cahier-reunion-vie-ministere-chretien',
      watchtowerPath: 'bibliotheque/revues',
      watchtowerPrefix: 'tour-garde-etude',
      meetingPrefix: 'Notre-Vie-Chretienne-et-Ministere',
      months: [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ],
      dateFormat: 'd MMMM yyyy',
      hasFullContent: true
    },
    de: {
      name: 'German',
      nativeName: 'Deutsch',
      libraryPath: 'bibliothek',
      workbookPath: 'arbeitsheft-leben-dienst-als-christ',
      watchtowerPath: 'bibliothek/zeitschriften',
      watchtowerPrefix: 'wachtturm-studium',
      meetingPrefix: 'Unser-Christliches-Leben-und-Dienst',
      months: [
        'januar', 'februar', 'märz', 'april', 'mai', 'juni',
        'juli', 'august', 'september', 'oktober', 'november', 'dezember'
      ],
      dateFormat: 'd. MMMM yyyy',
      hasFullContent: true
    },
    it: {
      name: 'Italian',
      nativeName: 'Italiano',
      libraryPath: 'biblioteca',
      workbookPath: 'quaderno-vita-ministero-cristiano',
      watchtowerPath: 'biblioteca/riviste',
      watchtowerPrefix: 'torre-guardia-studio',
      meetingPrefix: 'La-Nostra-Vita-Cristiana-e-il-Ministero',
      months: [
        'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
      ],
      dateFormat: 'd MMMM yyyy',
      hasFullContent: true
    }
  },
  selectors: {
    // Selectores CSS actualizados para la estructura actual de JW.org
    meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle, h1.pageTitle',
    meetingDate: '.contextNav time, .pageDate, [datetime], .itemData',
    sections: '.bodyTxt .groupItems li, .todayItems .groupItems li, .docContent .section',
    sectionTitle: '.itemTitle h4, .it-title, .sectionTitle, h3',
    sectionDuration: '.itemData, .it-duration, .duration',
    mediaLinks: 'a[href*="mediaitems"], a[href*="/v/"], a[data-video], .mediaLink',
    imageLinks: 'img[src*="cms-imgp.jw-cdn.org"], img[src*="images"], .docImg img',
    songNumbers: '.song strong, .songNumbers, [data-song]',
    // Nuevos selectores para diferentes tipos de contenido
    downloadLinks: 'a[href*=".pdf"], a[href*=".epub"], a[href*=".mp3"], a[href*="download"]',
    weekTitle: '.weekRange, .contextTxt h2, .dateRange'
  },
  outputDir: argv.output,
  retryAttempts: 3,
  retryDelay: 2000
};

/**
 * Obtener fecha de la semana a procesar
 */
function getTargetWeekDate() {
  if (argv.week === 'latest') {
    return new Date();
  }
  
  const parsed = new Date(argv.week);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Fecha inválida: ${argv.week}`);
  }
  
  return parsed;
}

/**
 * Obtener período bimestral para URLs de reuniones de entre semana
 * Actualizado para usar la estructura correcta de JW.org
 */
function getBimonthlyPeriod(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const langConfig = CONFIG.languages[CONFIG.language] || CONFIG.languages.es;
  
  const periods = {
    0: `${langConfig.months[0]}-${langConfig.months[1]}`, // enero-febrero
    1: `${langConfig.months[0]}-${langConfig.months[1]}`, // enero-febrero
    2: `${langConfig.months[2]}-${langConfig.months[3]}`, // marzo-abril
    3: `${langConfig.months[2]}-${langConfig.months[3]}`, // marzo-abril
    4: `${langConfig.months[4]}-${langConfig.months[5]}`, // mayo-junio
    5: `${langConfig.months[4]}-${langConfig.months[5]}`, // mayo-junio
    6: `${langConfig.months[6]}-${langConfig.months[7]}`, // julio-agosto
    7: `${langConfig.months[6]}-${langConfig.months[7]}`, // julio-agosto
    8: `${langConfig.months[8]}-${langConfig.months[9]}`, // septiembre-octubre
    9: `${langConfig.months[8]}-${langConfig.months[9]}`, // septiembre-octubre
    10: `${langConfig.months[10]}-${langConfig.months[11]}`, // noviembre-diciembre
    11: `${langConfig.months[10]}-${langConfig.months[11]}` // noviembre-diciembre
  };
  return `${periods[month]}-${year}`;
}

/**
 * Obtener mes de Atalaya para reuniones de fin de semana
 * Actualizado para la estructura correcta de JW.org con soporte multi-idioma
 */
function getWatchtowerMonth(date) {
  const langConfig = CONFIG.languages[CONFIG.language] || CONFIG.languages.es;
  
  // Para español: usar el mes actual sin retraso
  // Para otros idiomas: ajustar según sea necesario
  let month = date.getMonth();
  let year = date.getFullYear();
  
  // Si es enero y buscamos contenido del año anterior
  if (month === 0) {
    month = 11; // diciembre
    year -= 1;
  } else {
    month -= 1; // mes anterior
  }
  
  if (CONFIG.language === 'es') {
    return `atalaya-estudio-${langConfig.months[month]}-${year}`;
  } else {
    return `watchtower-study-${langConfig.months[month]}-${year}`;
  }
}

/**
 * Generar URLs de JW.org para scraping con patrones correctos y actualizados
 */
function generateUrls(weekDate) {
  const year = weekDate.getFullYear();
  const bimonthlyPeriod = getBimonthlyPeriod(weekDate);
  const watchtowerMonth = getWatchtowerMonth(weekDate);
  const langConfig = CONFIG.languages[CONFIG.language] || CONFIG.languages.es;
  
  // Calcular semana específica para URL completa
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const weekSpecific = generateWeekSpecificUrl(weekStart, weekEnd);
  
  // Construir URLs basadas en el idioma
  const basePath = CONFIG.language === 'es' ? 'biblioteca' : 'library';
  const workbookFullPath = CONFIG.language === 'es' ? 
    `${basePath}/${langConfig.workbookPath}` : 
    `${basePath}/${langConfig.workbookPath}`;
  
  const urls = {
    // URL base del cuaderno de reuniones (meeting workbook)
    midweek: `${CONFIG.baseUrl}/${CONFIG.language}/${workbookFullPath}/${bimonthlyPeriod}-mwb/`,
    // URL específica de la semana si está disponible
    midweekSpecific: weekSpecific ? `${CONFIG.baseUrl}/${CONFIG.language}/${workbookFullPath}/${bimonthlyPeriod}-mwb/${weekSpecific}/` : null,
    // URL de la Atalaya
    weekend: `${CONFIG.baseUrl}/${CONFIG.language}/${langConfig.watchtowerPath}/${watchtowerMonth}/`,
    // URLs alternativas para búsqueda dinámica
    workbookBase: `${CONFIG.baseUrl}/${CONFIG.language}/${workbookFullPath}/`,
    watchtowerBase: `${CONFIG.baseUrl}/${CONFIG.language}/${langConfig.watchtowerPath}/`,
    // URLs de recursos multimedia
    videos: `${CONFIG.baseUrl}/${CONFIG.language}/${basePath}/videos/#${CONFIG.language}/categories/VODSJJMeetings`,
    music: `${CONFIG.baseUrl}/${CONFIG.language}/${basePath}/musica-canciones/`
  };
  
  return urls;
}

/**
 * Generar URL específica de semana basada en fechas
 */
function generateWeekSpecificUrl(weekStart, weekEnd) {
  const langConfig = CONFIG.languages[CONFIG.language] || CONFIG.languages.es;
  
  if (CONFIG.language === 'es') {
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = langConfig.months[weekStart.getMonth()];
    const endMonth = langConfig.months[weekEnd.getMonth()];
    const year = weekEnd.getFullYear();
    
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `Vida-y-Ministerio-Cristianos-${startDay}-de-${startMonth}-a-${endDay}-de-${endMonth}-de-${year}`;
    } else {
      return `Vida-y-Ministerio-Cristianos-${startDay}-de-${startMonth}-a-${endDay}-de-${endMonth}-de-${year}`;
    }
  }
  
  return null; // Para otros idiomas, implementar según sea necesario
}

/**
 * Obtener número de semana del año
 */
function getWeekNumber(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

/**
 * Inicializar navegador Puppeteer
 */
async function initBrowser() {
  const spinner = ora('Iniciando navegador...').start();
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    spinner.succeed('Navegador iniciado');
    return browser;
  } catch (error) {
    spinner.fail('Error iniciando navegador');
    throw error;
  }
}

/**
 * Scraper principal para una página específica con soporte para URLs de fallback
 */
async function scrapePage(browser, urls, meetingType) {
  const urlsToTry = Array.isArray(urls) ? urls : [urls];
  const spinner = ora(`Scrapeando ${meetingType}...`).start();
  
  let page;
  let lastError = null;
  
  try {
    page = await browser.newPage();
    
    // Configurar página
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Intentar cada URL hasta encontrar una que funcione
    for (const url of urlsToTry) {
      if (!url) continue;
      
      spinner.text = `Intentando ${meetingType}: ${url}`;
      
      // Navegar con retry para cada URL
      let content = null;
      let success = false;
      
      for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
        try {
          const response = await page.goto(url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
          });
          
          // Verificar si la página cargó correctamente (no es 404)
          if (response && response.status() < 400) {
            content = await page.content();
            
            // Verificar que no sea una página de error
            const $ = cheerio.load(content);
            const title = $('title').text();
            const isErrorPage = title.includes('Lo sentimos') || 
                               title.includes('Page not found') || 
                               title.includes('404') ||
                               $('.errorPage').length > 0;
            
            if (!isErrorPage) {
              success = true;
              break;
            }
          }
        } catch (error) {
          lastError = error;
          if (attempt === CONFIG.retryAttempts) {
            console.log(`Failed to load ${url} after ${CONFIG.retryAttempts} attempts`);
          } else {
            spinner.text = `Reintentando ${meetingType} (${attempt}/${CONFIG.retryAttempts})...`;
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
          }
        }
      }
      
      if (success && content) {
        // Parsear contenido con Cheerio
        const $ = cheerio.load(content);
        const meetingData = extractMeetingData($, meetingType, url);
        
        spinner.succeed(`${meetingType} procesado exitosamente desde: ${url}`);
        return meetingData;
      }
    }
    
    // Si llegamos aquí, ninguna URL funcionó
    throw new Error(`No se pudo cargar ninguna URL para ${meetingType}. URLs intentadas: ${urlsToTry.join(', ')}`);
    
  } catch (error) {
    spinner.fail(`Error scrapeando ${meetingType}: ${error.message}`);
    
    // Retornar estructura básica en caso de error
    return {
      type: meetingType,
      title: CONFIG.languageConfig.terminology.meetingTypes[meetingType] || `Meeting ${meetingType}`,
      date: null,
      url: urlsToTry[0] || 'unknown',
      sections: [],
      materials: {
        videos: [],
        images: [],
        audio: [],
        songs: []
      },
      error: error.message,
      urlsAttempted: urlsToTry,
      language: CONFIG.language,
      scrapedAt: new Date().toISOString()
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Extraer datos de reunión del HTML
 */
function extractMeetingData($, meetingType, url) {
  const meetingData = {
    type: meetingType,
    title: extractMeetingTitle($),
    date: extractMeetingDate($),
    url: url,
    sections: extractSections($),
    materials: extractMaterials($),
    totalDuration: 0,
    language: CONFIG.language,
    scrapedAt: new Date().toISOString()
  };
  
  // Calcular duración total
  meetingData.totalDuration = meetingData.sections.reduce((total, section) => {
    return total + (section.duration || 0);
  }, 0);
  
  return meetingData;
}

/**
 * Extraer título de la reunión
 */
function extractMeetingTitle($) {
  const titleSelectors = [
    '.todayItems h3',
    '.pub-w h2',
    '.contextTxt h1',
    'h1',
    '.pageTitle'
  ];
  
  for (const selector of titleSelectors) {
    const title = $(selector).first().text().trim();
    if (title) {
      return title;
    }
  }
  
  return CONFIG.languageConfig.terminology.meetingTypes.midweek || 'Meeting';
}

/**
 * Extraer fecha de la reunión
 */
function extractMeetingDate($) {
  const dateSelectors = [
    '.todayItems .itemData',
    '.contextNav time',
    '.pageDate',
    '[datetime]'
  ];
  
  for (const selector of dateSelectors) {
    const dateText = $(selector).first().text().trim();
    const datetime = $(selector).first().attr('datetime');
    
    if (datetime) {
      return new Date(datetime).toISOString();
    }
    
    if (dateText) {
      // Intentar parsear fecha en español
      const parsed = parseDateSpanish(dateText);
      if (parsed) {
        return parsed.toISOString();
      }
    }
  }
  
  return new Date().toISOString();
}

/**
 * Parsear fecha en español
 */
function parseDateSpanish(dateStr) {
  // Patrones comunes de fecha en JW.org
  const patterns = [
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
    /(\d{1,2})-(\d{1,2})\s+(\w+)\s+(\d{4})/i,
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i
  ];
  
  const months = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      // Implementar lógica de parsing específica
      // Por simplicidad, retornamos la fecha actual
      return new Date();
    }
  }
  
  return null;
}

/**
 * Extraer secciones de la reunión con selectores actualizados
 */
function extractSections($) {
  const sections = [];
  
  // Intentar varios selectores para encontrar las secciones
  const sectionSelectors = [
    '.bodyTxt .groupItems li', // Principal
    '.todayItems .groupItems li', // Alternativo
    '.docContent .section', // Para contenido de documentos
    '.meetingSection', // Sección específica de reuniones
    '[data-section]', // Secciones con data attributes
    '.itemContainer' // Container de items
  ];
  
  let foundSections = false;
  
  for (const selector of sectionSelectors) {
    const $elements = $(selector);
    
    if ($elements.length > 0) {
      $elements.each((i, element) => {
        const $section = $(element);
        const sectionText = $section.text().trim();
        
        // Extraer título de diferentes maneras
        let title = '';
        const titleSelectors = ['.it-title', '.itemTitle h4', '.sectionTitle', 'h3', 'h4', '.title'];
        
        for (const titleSel of titleSelectors) {
          const titleText = $section.find(titleSel).first().text().trim();
          if (titleText && titleText.length > 2) {
            title = titleText;
            break;
          }
        }
        
        // Si no encontramos título con selectores, usar el texto del elemento principal
        if (!title) {
          const directText = $section.clone().children().remove().end().text().trim();
          if (directText && directText.length > 5) {
            title = directText.substring(0, 100); // Limitar longitud
          }
        }
        
        // Extraer duración
        const durationText = $section.find('.it-duration, .itemData, .duration').text();
        const duration = extractDuration(durationText);
        
        // Crear sección si tiene contenido válido
        if (title && title.length > 2) {
          const section = {
            id: `section-${sections.length + 1}`,
            order: sections.length + 1,
            title: title,
            duration: duration,
            type: classifySectionType(sectionText),
            materials: extractSectionMaterials($section),
            rawContent: sectionText.substring(0, 200) // Para debugging
          };
          
          sections.push(section);
          foundSections = true;
        }
      });
      
      if (foundSections) {
        break; // Salir del loop si encontramos secciones
      }
    }
  }
  
  // Si no encontramos secciones estructuradas, intentar extraer contenido general
  if (sections.length === 0) {
    // Buscar headings que podrían ser secciones
    $('h1, h2, h3, h4').each((i, heading) => {
      const $heading = $(heading);
      const title = $heading.text().trim();
      
      if (title && title.length > 5 && i < 10) { // Limitar a 10 secciones máximo
        sections.push({
          id: `section-${i + 1}`,
          order: i + 1,
          title: title,
          duration: 0,
          type: 'general',
          materials: [],
          source: 'heading'
        });
      }
    });
  }
  
  return sections;
}

/**
 * Extraer duración en minutos del texto
 */
function extractDuration(text) {
  const match = text.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Clasificar tipo de sección
 */
function classifySectionType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('canción') || lowerText.includes('cántico')) return 'song';
  if (lowerText.includes('oración')) return 'prayer';
  if (lowerText.includes('video')) return 'video';
  if (lowerText.includes('discurso')) return 'talk';
  if (lowerText.includes('lectura')) return 'reading';
  if (lowerText.includes('estudio')) return 'study';
  
  return 'other';
}

/**
 * Extraer materiales de una sección
 */
function extractSectionMaterials($section) {
  const materials = [];
  
  // Videos
  $section.find('a[href*="mediaitems"], a[href*="/v/"]').each((i, link) => {
    const $link = $(link);
    materials.push({
      type: 'video',
      title: $link.text().trim() || 'Video',
      url: $link.attr('href'),
      thumbnail: $link.find('img').attr('src')
    });
  });
  
  // Imágenes
  $section.find('img[src*="images"], .docImg img').each((i, img) => {
    const $img = $(img);
    materials.push({
      type: 'image',
      title: $img.attr('alt') || 'Imagen',
      url: $img.attr('src'),
      thumbnail: $img.attr('src')
    });
  });
  
  return materials;
}

/**
 * Extraer todos los materiales de la página con soporte completo para diferentes tipos de contenido
 */
function extractMaterials($) {
  const materials = {
    videos: [],
    images: [],
    audio: [],
    songs: [],
    downloads: []
  };
  
  // Videos con múltiples calidades desde CDN
  $('a[href*="mediaitems"], a[href*="/v/"], [data-video], .mediaLink').each((i, element) => {
    const $element = $(element);
    const videoUrl = $element.attr('href') || $element.attr('data-video');
    
    if (videoUrl && (videoUrl.includes('mediaitems') || videoUrl.includes('.mp4'))) {
      materials.videos.push({
        id: `video-${i + 1}`,
        title: $element.text().trim() || $element.attr('title') || `Video ${i + 1}`,
        downloadUrl: makeAbsoluteUrl(videoUrl),
        thumbnail: makeAbsoluteUrl($element.find('img').attr('src')),
        qualities: generateVideoQualities(videoUrl),
        duration: extractDuration($element.text()),
        format: getFileFormat(videoUrl) || 'mp4'
      });
    }
  });
  
  // Imágenes con múltiples tamaños desde CDN
  $('img[src*="cms-imgp.jw-cdn.org"], img[src*="images"], .docImg img').each((i, img) => {
    const $img = $(img);
    const srcUrl = $img.attr('src');
    
    if (srcUrl && !srcUrl.includes('siteLogo')) { // Excluir logos del sitio
      const imageData = {
        id: `image-${i + 1}`,
        title: $img.attr('alt') || `Imagen ${i + 1}`,
        downloadUrl: makeAbsoluteUrl(srcUrl),
        format: getImageFormat(srcUrl)
      };
      
      // Añadir tamaños si es del CDN
      if (srcUrl.includes('cms-imgp.jw-cdn.org')) {
        imageData.sizes = {
          large: srcUrl.replace(/_(\d+)x(\d+)/, '_1920x1080'),
          medium: srcUrl.replace(/_(\d+)x(\d+)/, '_800x600'),
          small: srcUrl.replace(/_(\d+)x(\d+)/, '_400x300')
        };
      }
      
      materials.images.push(imageData);
    }
  });
  
  // Audio y descargas directas
  $('a[href*=".mp3"], a[href*=".wav"], a[href*="download"]').each((i, element) => {
    const $element = $(element);
    const downloadUrl = $element.attr('href');
    const format = getFileFormat(downloadUrl);
    
    if (downloadUrl) {
      const downloadData = {
        id: `audio-${i + 1}`,
        title: $element.text().trim() || `Audio ${i + 1}`,
        downloadUrl: makeAbsoluteUrl(downloadUrl),
        format: format,
        size: $element.attr('data-size') || null
      };
      
      if (['mp3', 'wav', 'ogg'].includes(format)) {
        materials.audio.push(downloadData);
      } else {
        materials.downloads.push(downloadData);
      }
    }
  });
  
  // PDFs y EPUBs
  $('a[href*=".pdf"], a[href*=".epub"]').each((i, element) => {
    const $element = $(element);
    const downloadUrl = $element.attr('href');
    
    if (downloadUrl) {
      materials.downloads.push({
        id: `download-${i + 1}`,
        title: $element.text().trim() || `Descarga ${i + 1}`,
        downloadUrl: makeAbsoluteUrl(downloadUrl),
        format: getFileFormat(downloadUrl),
        type: 'document'
      });
    }
  });
  
  // Cánticos con recursos completos
  $('.song strong, .songNumbers, [data-song], .songTitle').each((i, element) => {
    const $element = $(element);
    const songNumber = extractSongNumber($element.text());
    
    if (songNumber) {
      materials.songs.push({
        id: `song-${songNumber}`,
        number: songNumber,
        title: $element.closest('.song').text().trim() || $element.text().trim() || `Cántico ${songNumber}`,
        resources: generateSongResources(songNumber)
      });
    }
  });
  
  return materials;
}

/**
 * Generar calidades de video basadas en la URL base
 */
function generateVideoQualities(baseUrl) {
  if (!baseUrl) return {};
  
  const qualities = {};
  const resolutions = ['1080p', '720p', '480p', '240p'];
  
  resolutions.forEach(res => {
    qualities[res] = baseUrl.replace('.mp4', `_${res}.mp4`);
  });
  
  return qualities;
}

/**
 * Generar recursos de cánticos
 */
function generateSongResources(songNumber) {
  const paddedNumber = songNumber.toString().padStart(3, '0');
  
  return {
    video: `https://download-a.akamaihd.net/files/media_music/ac/${paddedNumber}_V.mp4`,
    audio: `https://download-a.akamaihd.net/files/media_music/ac/${paddedNumber}_A.mp3`,
    sheet: `${CONFIG.baseUrl}/${CONFIG.language}/${CONFIG.languageConfig.paths.music}/song-${songNumber}/`,
    instrumental: `https://download-a.akamaihd.net/files/media_music/ac/${paddedNumber}_I.mp3`
  };
}

/**
 * Obtener formato de archivo de cualquier URL
 */
function getFileFormat(url) {
  if (!url) return null;
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Convertir URL relativa a absoluta
 */
function makeAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${CONFIG.baseUrl}${url}`;
  return url;
}

/**
 * Obtener formato de imagen de la URL
 */
function getImageFormat(url) {
  if (!url) return 'jpg';
  const match = url.match(/\.(\w+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Extraer número de cántico
 */
function extractSongNumber(text) {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Guardar datos en archivo JSON
 */
async function saveWeekData(weekData, weekDate) {
  const year = weekDate.getFullYear();
  const weekNumber = getWeekNumber(weekDate);
  const weekStr = weekNumber.toString().padStart(2, '0');
  
  // Crear directorios si no existen
  const yearDir = path.join(CONFIG.outputDir, year.toString());
  await fs.ensureDir(yearDir);
  
  const filename = `week-${weekStr}.json`;
  const filepath = path.join(yearDir, filename);
  
  // Agregar metadatos
  const finalData = {
    ...weekData,
    metadata: {
      generatedAt: new Date().toISOString(),
      weekNumber,
      year,
      filename,
      version: '1.0',
      language: CONFIG.language,
      languageConfig: {
        name: CONFIG.languageConfig.name,
        nativeName: CONFIG.languageConfig.nativeName,
        flag: CONFIG.languageConfig.flag
      }
    }
  };
  
  await fs.writeJson(filepath, finalData, { spaces: 2 });
  console.log(chalk.green(`✅ Datos guardados: ${filepath}`));
  
  return filepath;
}

/**
 * Función principal
 */
async function main() {
  console.log(chalk.blue('🚀 Iniciando scraper de contenido JW.org'));
  console.log(chalk.gray(`Configuración: ${JSON.stringify(argv, null, 2)}`));
  
  try {
    const weekDate = getTargetWeekDate();
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }); // Lunes
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Domingo (6 días después del lunes)
    
    console.log(chalk.yellow(`📅 Processing week (${CONFIG.language}): ${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`));
    
    // Verificar si ya existen datos y no forzar actualización
    const year = weekDate.getFullYear();
    const weekNumber = getWeekNumber(weekDate);
    const existingFile = path.join(CONFIG.outputDir, year.toString(), `week-${weekNumber.toString().padStart(2, '0')}.json`);
    
    if (await fs.pathExists(existingFile) && !argv.force) {
      console.log(chalk.yellow(`ℹ️  Los datos ya existen: ${existingFile}`));
      console.log(chalk.yellow('💡 Usa --force para sobrescribir'));
      return;
    }
    
    // Generar URLs
    const urls = generateUrls(weekDate);
    console.log(chalk.gray(`🔗 URLs generadas:\n${JSON.stringify(urls, null, 2)}`));
    
    // Inicializar navegador
    const browser = await initBrowser();
    
    try {
      // Preparar URLs de fallback para cada tipo de reunión
      const midweekUrls = [
        urls.midweekSpecific,
        urls.midweek,
        urls.workbookBase
      ].filter(Boolean);
      
      const weekendUrls = [
        urls.weekend,
        urls.watchtowerBase
      ].filter(Boolean);
      
      // Scraping paralelo de reuniones con URLs de fallback
      const [midweekData, weekendData] = await Promise.all([
        scrapePage(browser, midweekUrls, 'midweek'),
        scrapePage(browser, weekendUrls, 'weekend')
      ]);
      
      // Construir datos de la semana
      const weekData = {
        id: `week-${year}-${weekNumber}`,
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        weekOf: CONFIG.languageConfig.dateFormats.weekFormat
          .replace('{start}', format(weekStart, 'dd MMM'))
          .replace('{end}', format(weekEnd, 'dd MMM')),
        year,
        weekNumber,
        meetings: [midweekData, weekendData].filter(m => m !== null),
        urls,
        stats: {
          totalSections: 0,
          totalMaterials: 0,
          totalDuration: 0
        }
      };
      
      // Calcular estadísticas
      weekData.meetings.forEach(meeting => {
        weekData.stats.totalSections += meeting.sections.length;
        weekData.stats.totalDuration += meeting.totalDuration;
        
        Object.values(meeting.materials).forEach(materialArray => {
          if (Array.isArray(materialArray)) {
            weekData.stats.totalMaterials += materialArray.length;
          }
        });
      });
      
      // Guardar datos
      const savedPath = await saveWeekData(weekData, weekDate);
      
      console.log(chalk.green('🎉 Scraping completado exitosamente!'));
      console.log(chalk.blue(`📊 Estadísticas:`));
      console.log(chalk.gray(`   - Reuniones: ${weekData.meetings.length}`));
      console.log(chalk.gray(`   - Secciones: ${weekData.stats.totalSections}`));
      console.log(chalk.gray(`   - Materiales: ${weekData.stats.totalMaterials}`));
      console.log(chalk.gray(`   - Duración total: ${weekData.stats.totalDuration} min`));
      console.log(chalk.gray(`   - Archivo: ${savedPath}`));
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error en scraping:'), error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;