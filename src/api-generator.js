#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const API_CONFIG = {
  outputDir: process.env.API_OUTPUT_DIR || './api',
  dataDir: process.env.CONTENT_OUTPUT_DIR || './data',
  endpoints: {
    latest: 'latest.json',
    weeks: 'weeks.json',
    index: 'index.json',
    stats: 'stats.json'
  }
};

/**
 * Generar endpoint de la semana más reciente
 */
async function generateLatestEndpoint(allWeeksData) {
  const spinner = ora('Generando endpoint latest.json').start();
  
  try {
    // Encontrar la semana más reciente
    const sortedWeeks = allWeeksData.sort((a, b) => 
      new Date(b.weekStartDate) - new Date(a.weekStartDate)
    );
    
    const latestWeek = sortedWeeks[0];
    
    if (!latestWeek) {
      throw new Error('No hay datos de semanas disponibles');
    }
    
    const latestData = {
      ...latestWeek,
      meta: {
        endpoint: 'latest',
        description: 'Datos de la semana más reciente',
        generatedAt: new Date().toISOString(),
        totalWeeksAvailable: allWeeksData.length,
        version: '1.0'
      }
    };
    
    const outputPath = path.join(API_CONFIG.outputDir, API_CONFIG.endpoints.latest);
    await fs.writeJson(outputPath, latestData, { spaces: 2 });
    
    spinner.succeed(`✅ latest.json generado (${latestWeek.weekOf})`);
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generando latest.json: ${error.message}`);
    throw error;
  }
}

/**
 * Generar endpoint con lista de todas las semanas
 */
async function generateWeeksEndpoint(allWeeksData) {
  const spinner = ora('Generando endpoint weeks.json').start();
  
  try {
    // Crear resumen de cada semana
    const weeksSummary = allWeeksData.map(week => ({
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
        description: 'Lista de todas las semanas disponibles',
        generatedAt: new Date().toISOString(),
        totalWeeks: weeksSummary.length,
        dateRange: {
          earliest: weeksSummary[weeksSummary.length - 1]?.weekStartDate,
          latest: weeksSummary[0]?.weekStartDate
        },
        version: '1.0'
      }
    };
    
    const outputPath = path.join(API_CONFIG.outputDir, API_CONFIG.endpoints.weeks);
    await fs.writeJson(outputPath, weeksData, { spaces: 2 });
    
    spinner.succeed(`✅ weeks.json generado (${weeksSummary.length} semanas)`);
    return outputPath;
    
  } catch (error) {
    spinner.fail(`❌ Error generando weeks.json: ${error.message}`);
    throw error;
  }
}

/**
 * Generar endpoint de índice principal
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
        language: 'es',
        baseUrl: 'https://tu-usuario.github.io/jw-scraping'
      },
      endpoints: {
        latest: {
          url: './latest.json',
          description: 'Datos de la semana más reciente',
          cache: '1 hour'
        },
        weeks: {
          url: './weeks.json',
          description: 'Lista de todas las semanas disponibles',
          cache: '6 hours'
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
          description: 'Estadísticas generales de la API',
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
            description: 'Obtener la semana más reciente',
            url: './latest.json'
          },
          {
            description: 'Obtener lista de semanas',
            url: './weeks.json'
          },
          {
            description: 'Obtener semana específica',
            url: './data/2025/week-03.json'
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
 * Generar endpoint de estadísticas
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
    
    // Procesar cada semana
    allWeeksData.forEach(week => {
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
 * Función principal
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
    
    // Generar todos los endpoints
    const results = await Promise.all([
      generateLatestEndpoint(allWeeksData),
      generateWeeksEndpoint(allWeeksData),
      generateIndexEndpoint(allWeeksData),
      generateStatsEndpoint(allWeeksData),
      copyDataFiles()
    ]);
    
    console.log(chalk.green('\n🎉 API generada exitosamente!'));
    console.log(chalk.blue('📁 Archivos generados:'));
    results.forEach(result => {
      if (typeof result === 'string') {
        console.log(chalk.gray(`  • ${result}`));
      }
    });
    
    console.log(chalk.blue('\n🔗 Endpoints disponibles:'));
    console.log(chalk.gray('  • /index.json - Información general de la API'));
    console.log(chalk.gray('  • /latest.json - Semana más reciente'));
    console.log(chalk.gray('  • /weeks.json - Lista de todas las semanas'));
    console.log(chalk.gray('  • /stats.json - Estadísticas generales'));
    console.log(chalk.gray('  • /data/{year}/week-{num}.json - Datos específicos'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error generando API:'), error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateLatestEndpoint, generateWeeksEndpoint, generateIndexEndpoint, generateStatsEndpoint };