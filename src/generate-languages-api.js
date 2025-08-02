#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';

// Configuración de idiomas (importada del scraper)
const SUPPORTED_LANGUAGES = {
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    libraryPath: 'biblioteca',
    workbookPath: 'guia-actividades-reunion-testigos-jehova',
    watchtowerPath: 'revistas',
    watchtowerPrefix: 'atalaya-estudio',
    hasFullContent: true,
    region: 'Global'
  },
  en: {
    name: 'English',
    nativeName: 'English',
    libraryPath: 'library',
    workbookPath: 'jw-meeting-workbook',
    watchtowerPath: 'library/magazines',
    watchtowerPrefix: 'watchtower-study',
    hasFullContent: true,
    region: 'Global'
  },
  pt: {
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    libraryPath: 'biblioteca',
    workbookPath: 'apostila-reuniao-vida-ministerio-cristao',
    watchtowerPath: 'biblioteca/revistas',
    watchtowerPrefix: 'sentinela-estudo',
    hasFullContent: true,
    region: 'Latin America'
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    libraryPath: 'bibliotheque',
    workbookPath: 'cahier-reunion-vie-ministere-chretien',
    watchtowerPath: 'bibliotheque/revues',
    watchtowerPrefix: 'tour-garde-etude',
    hasFullContent: true,
    region: 'Europe'
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    libraryPath: 'bibliothek',
    workbookPath: 'arbeitsheft-leben-dienst-als-christ',
    watchtowerPath: 'bibliothek/zeitschriften',
    watchtowerPrefix: 'wachtturm-studium',
    hasFullContent: true,
    region: 'Europe'
  },
  it: {
    name: 'Italian',
    nativeName: 'Italiano',
    libraryPath: 'biblioteca',
    workbookPath: 'quaderno-vita-ministero-cristiano',
    watchtowerPath: 'biblioteca/riviste',
    watchtowerPrefix: 'torre-guardia-studio',
    hasFullContent: true,
    region: 'Europe'
  }
};

/**
 * Genera la API de idiomas soportados
 */
async function generateLanguagesAPI() {
  const outputDir = './data';
  await fs.ensureDir(outputDir);

  // Generar languages.json
  const languagesData = {
    meta: {
      total: Object.keys(SUPPORTED_LANGUAGES).length,
      lastUpdated: new Date().toISOString(),
      description: 'Idiomas soportados con contenido completo de reuniones JW',
      note: 'Basado en investigación real de patrones de URL de JW.org'
    },
    supported: Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => ({
      code,
      name: config.name,
      nativeName: config.nativeName,
      region: config.region,
      hasFullContent: config.hasFullContent,
      sampleUrls: {
        workbook: `https://www.jw.org/${code}/${config.libraryPath}/${config.workbookPath}/`,
        watchtower: `https://www.jw.org/${code}/${config.watchtowerPath}/${config.watchtowerPrefix}-julio-2025/`
      }
    })),
    defaultLanguage: 'es',
    fallbackLanguage: 'en'
  };

  // Guardar languages.json
  await fs.writeJSON(path.join(outputDir, 'languages.json'), languagesData, { spaces: 2 });

  // Actualizar index.json con información de idiomas
  const indexPath = path.join(outputDir, 'index.json');
  let indexData = {};
  
  if (await fs.pathExists(indexPath)) {
    indexData = await fs.readJSON(indexPath);
  }

  indexData.languages = {
    supported: Object.keys(SUPPORTED_LANGUAGES),
    total: Object.keys(SUPPORTED_LANGUAGES).length,
    endpoint: '/languages.json'
  };

  indexData.endpoints = {
    ...indexData.endpoints,
    languages: {
      url: '/languages.json',
      description: 'Lista de idiomas soportados',
      method: 'GET',
      parameters: {
        none: 'Este endpoint no requiere parámetros'
      }
    }
  };

  await fs.writeJSON(indexPath, indexData, { spaces: 2 });

  console.log(`✅ Generada API de idiomas con ${Object.keys(SUPPORTED_LANGUAGES).length} idiomas soportados`);
  console.log(`📁 Archivos generados:`);
  console.log(`   - ${path.resolve(outputDir, 'languages.json')}`);
  console.log(`   - ${path.resolve(outputDir, 'index.json')} (actualizado)`);
  
  return languagesData;
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  generateLanguagesAPI().catch(console.error);
}

export { generateLanguagesAPI, SUPPORTED_LANGUAGES };