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
  selectors: {
    // Selectores CSS para extraer datos de las páginas
    meetingTitle: '.todayItems h3, .pub-w h2',
    meetingDate: '.todayItems .itemData, .contextNav time',
    sections: '.todayItems .groupItems li, .bodyTxt .groupItems li',
    sectionTitle: '.it-title, .itemTitle h4',
    sectionDuration: '.it-duration, .itemData',
    mediaLinks: 'a[href*="mediaitems"], a[href*="/v/"]',
    imageLinks: 'img[src*="images"], .docImg img',
    songNumbers: '.song strong, .songNumbers'
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
 */
function getBimonthlyPeriod(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const periods = {
    0: 'enero-febrero', 1: 'enero-febrero',
    2: 'marzo-abril', 3: 'marzo-abril', 
    4: 'mayo-junio', 5: 'mayo-junio',
    6: 'julio-agosto', 7: 'julio-agosto',
    8: 'septiembre-octubre', 9: 'septiembre-octubre',
    10: 'noviembre-diciembre', 11: 'noviembre-diciembre'
  };
  return `${periods[month]}-${year}`;
}

/**
 * Obtener mes de Atalaya para reuniones de fin de semana (con retraso de 1 mes)
 */
function getWatchtowerMonth(date) {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  let month = date.getMonth() - 1; // Retraso de 1 mes
  let year = date.getFullYear();
  
  if (month < 0) {
    month = 11;
    year -= 1;
  }
  
  return `atalaya-estudio-${months[month]}-${year}`;
}

/**
 * Generar URLs de JW.org para scraping con patrones correctos
 */
function generateUrls(weekDate) {
  const year = weekDate.getFullYear();
  const bimonthlyPeriod = getBimonthlyPeriod(weekDate);
  const watchtowerMonth = getWatchtowerMonth(weekDate);
  
  return {
    midweek: `${CONFIG.baseUrl}/${CONFIG.language}/biblioteca/jw-cuaderno-de-reuniones/${bimonthlyPeriod}-mwb/`,
    weekend: `${CONFIG.baseUrl}/${CONFIG.language}/biblioteca/watchtower/${watchtowerMonth}/`,
    // URLs alternativas para búsqueda dinámica
    workbook: `${CONFIG.baseUrl}/${CONFIG.language}/biblioteca/jw-cuaderno-de-reuniones/${year}/`,
    meetings: `${CONFIG.baseUrl}/${CONFIG.language}/reuniones/`
  };
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
 * Scraper principal para una página específica
 */
async function scrapePage(browser, url, meetingType) {
  const spinner = ora(`Scrapeando ${meetingType}: ${url}`).start();
  
  let page;
  try {
    page = await browser.newPage();
    
    // Configurar página
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navegar con retry
    let content = null;
    for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        
        content = await page.content();
        break;
      } catch (error) {
        if (attempt === CONFIG.retryAttempts) {
          throw error;
        }
        spinner.text = `Reintentando ${meetingType} (${attempt}/${CONFIG.retryAttempts})...`;
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
    
    // Parsear contenido con Cheerio
    const $ = cheerio.load(content);
    const meetingData = extractMeetingData($, meetingType, url);
    
    spinner.succeed(`${meetingType} procesado exitosamente`);
    return meetingData;
    
  } catch (error) {
    spinner.fail(`Error scrapeando ${meetingType}: ${error.message}`);
    
    // Retornar estructura básica en caso de error
    return {
      type: meetingType,
      title: `Reunión ${meetingType}`,
      date: null,
      url: url,
      sections: [],
      materials: {
        videos: [],
        images: [],
        audio: [],
        songs: []
      },
      error: error.message,
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
  
  return 'Reunión';
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
 * Extraer secciones de la reunión
 */
function extractSections($) {
  const sections = [];
  
  $('.todayItems .groupItems li, .bodyTxt .groupItems li').each((i, element) => {
    const $section = $(element);
    
    const section = {
      id: `section-${i + 1}`,
      order: i + 1,
      title: $section.find('.it-title, .itemTitle h4').text().trim(),
      duration: extractDuration($section.find('.it-duration, .itemData').text()),
      type: classifySectionType($section.text()),
      materials: extractSectionMaterials($section)
    };
    
    if (section.title) {
      sections.push(section);
    }
  });
  
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
 * Extraer todos los materiales de la página con URLs de CDN reales
 */
function extractMaterials($) {
  const materials = {
    videos: [],
    images: [],
    audio: [],
    songs: []
  };
  
  // Videos con múltiples calidades desde CDN
  $('a[href*="mediaitems"], a[href*="/v/"], [data-video]').each((i, element) => {
    const $element = $(element);
    const videoUrl = $element.attr('href') || $element.attr('data-video');
    
    if (videoUrl && videoUrl.includes('mediaitems')) {
      materials.videos.push({
        id: `video-${i + 1}`,
        title: $element.text().trim() || $element.attr('title') || `Video ${i + 1}`,
        downloadUrl: videoUrl,
        thumbnail: makeAbsoluteUrl($element.find('img').attr('src')),
        qualities: {
          '720p': videoUrl.replace('.mp4', '_720p.mp4'),
          '480p': videoUrl.replace('.mp4', '_480p.mp4'),
          '240p': videoUrl.replace('.mp4', '_240p.mp4')
        },
        duration: extractDuration($element.text()),
        format: 'mp4'
      });
    }
  });
  
  // Imágenes con múltiples tamaños desde CDN
  $('img[src*="cms-imgp.jw-cdn.org"], img[src*="images"]').each((i, img) => {
    const $img = $(img);
    const srcUrl = $img.attr('src');
    
    if (srcUrl && srcUrl.includes('cms-imgp.jw-cdn.org')) {
      materials.images.push({
        id: `image-${i + 1}`,
        title: $img.attr('alt') || `Imagen ${i + 1}`,
        downloadUrl: makeAbsoluteUrl(srcUrl),
        sizes: {
          large: srcUrl.replace(/_(\d+)x(\d+)/, '_1920x1080'),
          medium: srcUrl.replace(/_(\d+)x(\d+)/, '_800x600'),
          small: srcUrl.replace(/_(\d+)x(\d+)/, '_400x300')
        },
        format: getImageFormat(srcUrl)
      });
    } else if (srcUrl) {
      // Para imágenes que no son del CDN pero son válidas
      materials.images.push({
        id: `image-${i + 1}`,
        title: $img.attr('alt') || `Imagen ${i + 1}`,
        downloadUrl: makeAbsoluteUrl(srcUrl),
        format: getImageFormat(srcUrl)
      });
    }
  });
  
  // Cánticos con recursos completos
  $('.song strong, .songNumbers, [data-song]').each((i, element) => {
    const $element = $(element);
    const songNumber = extractSongNumber($element.text());
    
    if (songNumber) {
      materials.songs.push({
        id: `song-${songNumber}`,
        number: songNumber,
        title: $element.closest('.song').text().trim() || `Cántico ${songNumber}`,
        resources: {
          video: `https://download-a.akamaihd.net/files/media_music/ac/${songNumber.toString().padStart(3, '0')}_V.mp4`,
          audio: `https://download-a.akamaihd.net/files/media_music/ac/${songNumber.toString().padStart(3, '0')}_A.mp3`,
          sheet: `${CONFIG.baseUrl}/${CONFIG.language}/biblioteca/musica-cantemos/canticos/cantico-${songNumber}/`
        }
      });
    }
  });
  
  return materials;
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
      language: CONFIG.language
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
    
    console.log(chalk.yellow(`📅 Procesando semana: ${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`));
    
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
      // Scraping paralelo de reuniones
      const [midweekData, weekendData] = await Promise.all([
        scrapePage(browser, urls.midweek, 'midweek'),
        scrapePage(browser, urls.weekend, 'weekend')
      ]);
      
      // Construir datos de la semana
      const weekData = {
        id: `week-${year}-${weekNumber}`,
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        weekOf: `Semana del ${format(weekStart, 'd-dd MMM', { locale: es })}`,
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