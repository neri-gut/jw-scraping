#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getSupportedLanguages, getLanguageConfig, isLanguageSupported } from './language-config.js';

const API_CONFIG = {
  outputDir: process.env.API_OUTPUT_DIR || './api',
  dataDir: process.env.CONTENT_OUTPUT_DIR || './data',
  endpoints: {
    latest: 'latest.json',
    weeks: 'weeks.json',
    index: 'index.json',
    stats: 'stats.json',
    languages: 'languages.json'
  }
};

/**
 * Generate latest endpoint with language filtering
 */
async function generateLatestEndpoint(allWeeksData, language = null) {
  const spinner = ora('Generando endpoint latest.json').start();
  
  try {
    // Filter by language if specified
    let filteredWeeks = allWeeksData;
    if (language) {
      filteredWeeks = allWeeksData.filter(week => 
        week.metadata?.language === language ||
        week.meetings?.some(meeting => meeting.language === language)
      );
    }
    
    // Find most recent week
    const sortedWeeks = filteredWeeks.sort((a, b) => 
      new Date(b.weekStartDate) - new Date(a.weekStartDate)
    );
    
    const latestWeek = sortedWeeks[0];
    
    if (!latestWeek) {
      const errorMsg = language ? 
        `No data available for language: ${language}` :
        'No week data available';
      throw new Error(errorMsg);
    }
    
    const latestData = {
      ...latestWeek,
      meta: {
        endpoint: 'latest',
        description: language ? 
          `Latest week data for ${language}` : 
          'Latest week data (all languages)',
        generatedAt: new Date().toISOString(),
        totalWeeksAvailable: filteredWeeks.length,
        language: language || 'multi',
        version: '1.0'
      }
    };
    
    const filename = language ? `latest-${language}.json` : API_CONFIG.endpoints.latest;
    const outputPath = path.join(API_CONFIG.outputDir, filename);
    await fs.writeJson(outputPath, latestData, { spaces: 2 });
    
    spinner.succeed(`✅ latest.json generado (${latestWeek.weekOf})`);
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generando latest.json: ${error.message}`);
    throw error;
  }
}

/**
 * Generate weeks endpoint with language filtering
 */
async function generateWeeksEndpoint(allWeeksData, language = null) {
  const spinner = ora('Generando endpoint weeks.json').start();
  
  try {
    // Filter by language if specified
    let filteredWeeks = allWeeksData;
    if (language) {
      filteredWeeks = allWeeksData.filter(week => 
        week.metadata?.language === language ||
        week.meetings?.some(meeting => meeting.language === language)
      );
    }
    
    // Create summary for each week
    const weeksSummary = filteredWeeks.map(week => ({
      id: week.id,
      weekOf: week.weekOf,
      weekStartDate: week.weekStartDate,
      weekEndDate: week.weekEndDate,
      year: week.year,
      weekNumber: week.weekNumber,
      meetingCount: week.meetings?.length || 0,
      totalDuration: week.stats?.totalDuration || 0,
      totalMaterials: week.stats?.totalMaterials || 0,
      dataUrl: `./data/${week.year}/week-${week.weekNumber.toString().padStart(2, '0')}.json`,
      lastUpdated: week.metadata?.generatedAt
    }));
    
    // Ordenar por fecha más reciente primero
    weeksSummary.sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    
    const weeksData = {
      weeks: weeksSummary,
      meta: {
        endpoint: 'weeks',
        description: language ? 
          `All weeks for ${language}` : 
          'All available weeks (all languages)',
        generatedAt: new Date().toISOString(),
        totalWeeks: weeksSummary.length,
        language: language || 'multi',
        dateRange: {
          earliest: weeksSummary[weeksSummary.length - 1]?.weekStartDate,
          latest: weeksSummary[0]?.weekStartDate
        },
        version: '1.0'
      }
    };
    
    const filename = language ? `weeks-${language}.json` : API_CONFIG.endpoints.weeks;
    const outputPath = path.join(API_CONFIG.outputDir, filename);
    await fs.writeJson(outputPath, weeksData, { spaces: 2 });
    
    spinner.succeed(`✅ ${filename} generated (${weeksSummary.length} weeks)`);
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generando weeks.json: ${error.message}`);
    throw error;
  }
}

/**
 * Generate main index endpoint
 */
async function generateIndexEndpoint(allWeeksData) {
  const spinner = ora('Generando endpoint index.json').start();
  
  try {
    const indexData = {
      api: {
        name: 'JW.org Meeting Content API',
        description: 'API automatizada para contenido semanal de reuniones de Testigos de Jehová',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        supportedLanguages: getSupportedLanguages().map(l => l.code),
        defaultLanguage: 'en',
        multiLanguage: true,
        baseUrl: 'https://tu-usuario.github.io/jw-scraping'
      },
      endpoints: {
        latest: {
          url: './latest.json',
          description: 'Latest week data (all languages)',
          cache: '1 hour',
          languageSpecific: './latest-{lang}.json'
        },
        weeks: {
          url: './weeks.json',
          description: 'All available weeks (all languages)',
          cache: '6 hours',
          languageSpecific: './weeks-{lang}.json'
        },
        weekData: {
          url: './data/{year}/week-{weekNumber}.json',
          description: 'Datos específicos de una semana',
          parameters: {
            year: '2025',
            weekNumber: '01-53 (con ceros a la izquierda)'
          },
          cache: '24 hours'
        },
        stats: {
          url: './stats.json',
          description: 'General API statistics',
          cache: '24 hours'
        },
        languages: {
          url: './languages.json',
          description: 'Supported languages and their configuration',
          cache: '24 hours'
        }
      },
      stats: {
        totalWeeks: allWeeksData.length,
        totalMeetings: allWeeksData.reduce((sum, week) => sum + (week.meetings?.length || 0), 0),
        totalMaterials: allWeeksData.reduce((sum, week) => sum + (week.stats?.totalMaterials || 0), 0),
        averageDuration: Math.round(
          allWeeksData.reduce((sum, week) => sum + (week.stats?.totalDuration || 0), 0) / 
          Math.max(allWeeksData.length, 1)
        ),
        lastUpdate: allWeeksData[0]?.metadata?.generatedAt || new Date().toISOString()
      },
      usage: {
        examples: [
          {
            description: 'Get latest week (all languages)',
            url: './latest.json'
          },
          {
            description: 'Get latest week for Spanish',
            url: './latest.json?lang=es'
          },
          {
            description: 'Get all weeks for English',
            url: './weeks.json?lang=en'
          },
          {
            description: 'Get specific week',
            url: './data/2025/week-03.json'
          },
          {
            description: 'Get supported languages',
            url: './languages.json'
          }
        ],
        cors: 'enabled',
        rateLimit: 'none',
        authentication: 'none'
      }
    };
    
    const outputPath = path.join(API_CONFIG.outputDir, API_CONFIG.endpoints.index);
    await fs.writeJson(outputPath, indexData, { spaces: 2 });
    
    spinner.succeed('✅ index.json generado');
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generando index.json: ${error.message}`);
    throw error;
  }
}

/**
 * Generate statistics endpoint with language breakdown
 */
async function generateStatsEndpoint(allWeeksData) {
  const spinner = ora('Generando endpoint stats.json').start();
  
  try {
    // Calcular estadísticas detalladas
    const stats = {
      overview: {
        totalWeeks: allWeeksData.length,
        totalMeetings: 0,
        totalSections: 0,
        totalMaterials: 0,
        totalDuration: 0
      },
      byMeetingType: {
        midweek: { count: 0, avgDuration: 0, materials: 0 },
        weekend: { count: 0, avgDuration: 0, materials: 0 }
      },
      byMaterialType: {
        videos: 0,
        images: 0,
        audio: 0,
        songs: 0
      },
      byYear: {},
      byLanguage: {},
      dateRange: {
        earliest: null,
        latest: null
      },
      quality: {
        weeksWithErrors: 0,
        avgMaterialsPerWeek: 0,
        avgSectionsPerMeeting: 0
      },
      meta: {
        generatedAt: new Date().toISOString(),
        dataVersion: '1.0'
      }
    };
    
    // Process each week
    allWeeksData.forEach(week => {
      const weekLang = week.metadata?.language || 'unknown';
      if (!stats.byLanguage[weekLang]) {
        stats.byLanguage[weekLang] = { weeks: 0, meetings: 0, materials: 0 };
      }
      stats.byLanguage[weekLang].weeks++;
      const year = week.year.toString();
      if (!stats.byYear[year]) {
        stats.byYear[year] = { weeks: 0, meetings: 0, materials: 0 };
      }
      stats.byYear[year].weeks++;
      
      // Fechas
      if (!stats.dateRange.earliest || week.weekStartDate < stats.dateRange.earliest) {
        stats.dateRange.earliest = week.weekStartDate;
      }
      if (!stats.dateRange.latest || week.weekStartDate > stats.dateRange.latest) {
        stats.dateRange.latest = week.weekStartDate;
      }
      
      // Procesar reuniones
      if (week.meetings) {
        week.meetings.forEach(meeting => {
          stats.overview.totalMeetings++;
          stats.byYear[year].meetings++;
          stats.byLanguage[weekLang].meetings++;
          
          if (meeting.type === 'midweek' || meeting.type === 'weekend') {
            stats.byMeetingType[meeting.type].count++;
            stats.byMeetingType[meeting.type].avgDuration += meeting.totalDuration || 0;
          }
          
          if (meeting.sections) {
            stats.overview.totalSections += meeting.sections.length;
          }
          
          if (meeting.materials) {
            ['videos', 'images', 'audio', 'songs'].forEach(type => {
              const count = meeting.materials[type]?.length || 0;
              stats.byMaterialType[type] += count;
              stats.overview.totalMaterials += count;
              stats.byYear[year].materials += count;
              stats.byLanguage[weekLang].materials += count;
            });
          }
        });
      }
      
      if (week.stats) {
        stats.overview.totalDuration += week.stats.totalDuration || 0;
      }
      
      // Detectar errores
      if (week.meetings?.some(m => m.error)) {
        stats.quality.weeksWithErrors++;
      }
    });
    
    // Calcular promedios
    if (stats.byMeetingType.midweek.count > 0) {
      stats.byMeetingType.midweek.avgDuration = Math.round(
        stats.byMeetingType.midweek.avgDuration / stats.byMeetingType.midweek.count
      );
    }
    if (stats.byMeetingType.weekend.count > 0) {
      stats.byMeetingType.weekend.avgDuration = Math.round(
        stats.byMeetingType.weekend.avgDuration / stats.byMeetingType.weekend.count
      );
    }
    
    stats.quality.avgMaterialsPerWeek = allWeeksData.length > 0 ? 
      Math.round(stats.overview.totalMaterials / allWeeksData.length) : 0;
    
    stats.quality.avgSectionsPerMeeting = stats.overview.totalMeetings > 0 ? 
      Math.round(stats.overview.totalSections / stats.overview.totalMeetings) : 0;
    
    const outputPath = path.join(API_CONFIG.outputDir, API_CONFIG.endpoints.stats);
    await fs.writeJson(outputPath, stats, { spaces: 2 });
    
    spinner.succeed('✅ stats.json generado');
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generando stats.json: ${error.message}`);
    throw error;
  }
}

/**
 * Copiar archivos de datos para acceso directo
 */
async function copyDataFiles() {
  const spinner = ora('Copiando archivos de datos').start();
  
  try {
    const apiDataDir = path.join(API_CONFIG.outputDir, 'data');
    await fs.copy(API_CONFIG.dataDir, apiDataDir);
    
    spinner.succeed('✅ Archivos de datos copiados');
    return apiDataDir;
    
  } catch (error) {
    spinner.fail(`❌ Error copiando archivos: ${error.message}`);
    throw error;
  }
}

/**
 * Leer todos los archivos de datos
 */
async function loadAllWeekData() {
  const spinner = ora('Cargando datos de semanas').start();
  
  try {
    if (!await fs.pathExists(API_CONFIG.dataDir)) {
      throw new Error(`Directorio de datos no encontrado: ${API_CONFIG.dataDir}`);
    }
    
    const allWeeksData = [];
    
    // Buscar archivos JSON recursivamente
    const findJsonFiles = async (dir) => {
      const files = [];
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subFiles = await findJsonFiles(itemPath);
          files.push(...subFiles);
        } else if (item.endsWith('.json') && item.startsWith('week-')) {
          files.push(itemPath);
        }
      }
      
      return files;
    };
    
    const jsonFiles = await findJsonFiles(API_CONFIG.dataDir);
    
    for (const filePath of jsonFiles) {
      try {
        const data = await fs.readJson(filePath);
        allWeeksData.push(data);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Error leyendo ${filePath}: ${error.message}`));
      }
    }
    
    spinner.succeed(`✅ ${allWeeksData.length} semanas cargadas`);
    return allWeeksData;
    
  } catch (error) {
    spinner.fail(`❌ Error cargando datos: ${error.message}`);
    throw error;
  }
}

/**
 * Generate languages endpoint
 */
async function generateLanguagesEndpoint() {
  const spinner = ora('Generating languages.json').start();
  
  try {
    const supportedLanguages = getSupportedLanguages();
    
    const languagesData = {
      languages: supportedLanguages.map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        isDefault: lang.isDefault || false,
        terminology: {
          workbookName: lang.terminology.workbookName,
          watchtowerName: lang.terminology.watchtowerName,
          meetingTypes: lang.terminology.meetingTypes
        },
        paths: {
          workbook: lang.paths.workbook,
          watchtower: lang.paths.watchtower
        },
        apiEndpoints: {
          latest: `./latest-${lang.code}.json`,
          weeks: `./weeks-${lang.code}.json`
        }
      })),
      meta: {
        endpoint: 'languages',
        description: 'Supported languages and their configuration',
        generatedAt: new Date().toISOString(),
        totalLanguages: supportedLanguages.length,
        version: '1.0'
      }
    };
    
    const outputPath = path.join(API_CONFIG.outputDir, API_CONFIG.endpoints.languages);
    await fs.writeJson(outputPath, languagesData, { spaces: 2 });
    
    spinner.succeed('✅ languages.json generated');
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generating languages.json: ${error.message}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.blue('🏗️  Generando endpoints de API...'));
  
  try {
    // Crear directorio de salida
    await fs.ensureDir(API_CONFIG.outputDir);
    
    // Cargar todos los datos
    const allWeeksData = await loadAllWeekData();
    
    if (allWeeksData.length === 0) {
      throw new Error('No se encontraron datos de semanas para generar la API');
    }
    
    // Generate main endpoints (all languages)
    const mainResults = await Promise.all([
      generateLatestEndpoint(allWeeksData),
      generateWeeksEndpoint(allWeeksData),
      generateIndexEndpoint(allWeeksData),
      generateStatsEndpoint(allWeeksData),
      generateLanguagesEndpoint(),
      copyDataFiles()
    ]);
    
    // Generate language-specific endpoints
    const supportedLanguages = getSupportedLanguages();
    const languageResults = [];
    
    for (const lang of supportedLanguages) {
      try {
        const langResults = await Promise.all([
          generateLatestEndpoint(allWeeksData, lang.code),
          generateWeeksEndpoint(allWeeksData, lang.code)
        ]);
        languageResults.push(...langResults);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not generate endpoints for ${lang.code}: ${error.message}`));
      }
    }
    
    const results = [...mainResults, ...languageResults];
    
    console.log(chalk.green('\n🎉 API generada exitosamente!'));
    console.log(chalk.blue('📁 Archivos generados:'));
    results.forEach(result => {
      if (typeof result === 'string') {
        console.log(chalk.gray(`  • ${result}`));
      }
    });
    
    console.log(chalk.blue('\n🔗 Available endpoints:'));
    console.log(chalk.gray('  • /index.json - General API information'));
    console.log(chalk.gray('  • /latest.json - Latest week (all languages)'));
    console.log(chalk.gray('  • /latest-{lang}.json - Latest week for specific language'));
    console.log(chalk.gray('  • /weeks.json - All weeks (all languages)'));
    console.log(chalk.gray('  • /weeks-{lang}.json - All weeks for specific language'));
    console.log(chalk.gray('  • /languages.json - Supported languages'));
    console.log(chalk.gray('  • /stats.json - General statistics'));
    console.log(chalk.gray('  • /data/{year}/week-{num}.json - Specific week data'));
    console.log(chalk.blue('\n🌐 Supported languages:'));
    supportedLanguages.forEach(lang => {
      console.log(chalk.gray(`  • ${lang.flag} ${lang.code} - ${lang.name} (${lang.nativeName})`));
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Error generando API:'), error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { 
  generateLatestEndpoint, 
  generateWeeksEndpoint, 
  generateIndexEndpoint, 
  generateStatsEndpoint, 
  generateLanguagesEndpoint 
};