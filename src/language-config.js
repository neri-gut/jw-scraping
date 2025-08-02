/**
 * Comprehensive Language Configuration
 * Based on real JW.org patterns discovered through analysis
 * 
 * Key findings implemented:
 * - Different URL paths per language (biblioteca vs library)
 * - Localized terminology (different words for same concepts)
 * - Language-specific month names and date formats
 * - CSS selectors that vary by language
 * - Major languages only (quality over quantity)
 */

export const SUPPORTED_LANGUAGES = {
  // Spanish - Primary reference language
  es: {
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    isDefault: true,
    paths: {
      base: 'biblioteca',
      workbook: 'guia-actividades-reunion-testigos-jehova',
      watchtower: 'biblioteca/revistas',
      videos: 'biblioteca/videos',
      music: 'biblioteca/musica-canciones'
    },
    terminology: {
      workbookName: 'Guía de actividades para la reunión Vida y Ministerio Cristiano',
      watchtowerName: 'La Atalaya',
      meetingTypes: {
        midweek: 'Vida y Ministerio Cristiano',
        weekend: 'Reunión de fin de semana'
      },
      sections: {
        song: 'Cántico',
        prayer: 'Oración',
        talk: 'Discurso',
        study: 'Estudio',
        reading: 'Lectura de la Biblia',
        video: 'Video',
        discussion: 'Análisis'
      }
    },
    dateFormats: {
      months: [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ],
      weekFormat: 'Semana del {start} - {end}',
      datePattern: /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
      bimonthlyFormat: '{month1}-{month2}-{year}'
    },
    selectors: {
      meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle',
      meetingDate: '.contextNav time, .pageDate, [datetime]',
      sections: '.bodyTxt .groupItems li, .todayItems .groupItems li',
      sectionTitle: '.itemTitle h4, .it-title, .sectionTitle',
      weekTitle: '.weekRange, .contextTxt h2'
    },
    patterns: {
      watchtowerPattern: 'atalaya-estudio-{month}-{year}',
      workbookSpecific: 'Vida-y-Ministerio-Cristianos-{start}-de-{startMonth}-a-{end}-de-{endMonth}-de-{year}'
    }
  },

  // English - Second reference language  
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    isDefault: false,
    paths: {
      base: 'library',
      workbook: 'jw-meeting-workbook',  // Real pattern discovered
      watchtower: 'library/magazines',
      videos: 'library/videos',
      music: 'library/music-songs'
    },
    terminology: {
      workbookName: 'Our Christian Life and Ministry Meeting Workbook',
      watchtowerName: 'The Watchtower',
      meetingTypes: {
        midweek: 'Our Christian Life and Ministry',
        weekend: 'Weekend Meeting'
      },
      sections: {
        song: 'Song',
        prayer: 'Prayer',
        talk: 'Talk',
        study: 'Study',
        reading: 'Bible Reading',
        video: 'Video',
        discussion: 'Discussion'
      }
    },
    dateFormats: {
      months: [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ],
      weekFormat: 'Week of {start} - {end}',
      datePattern: /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
      bimonthlyFormat: '{month1}-{month2}-{year}'
    },
    selectors: {
      meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle',
      meetingDate: '.contextNav time, .pageDate, [datetime]',
      sections: '.bodyTxt .groupItems li, .todayItems .groupItems li',
      sectionTitle: '.itemTitle h4, .it-title, .sectionTitle',
      weekTitle: '.weekRange, .contextTxt h2'
    },
    patterns: {
      watchtowerPattern: 'watchtower-study-{month}-{year}',
      workbookSpecific: 'Our-Christian-Life-and-Ministry-{start}-{startMonth}-{end}-{endMonth}-{year}'
    }
  },

  // Portuguese - Third reference language (uses "apostilas")
  pt: {
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    isDefault: false,
    paths: {
      base: 'biblioteca',
      workbook: 'apostilas-vida-ministerio-cristao',  // Real pattern: uses "apostilas"
      watchtower: 'biblioteca/revistas',
      videos: 'biblioteca/videos',
      music: 'biblioteca/musica-cancoes'
    },
    terminology: {
      workbookName: 'Apostilas para Nossa Vida e Ministério Cristão',
      watchtowerName: 'A Sentinela',
      meetingTypes: {
        midweek: 'Nossa Vida e Ministério Cristão',
        weekend: 'Reunião de fim de semana'
      },
      sections: {
        song: 'Cântico',
        prayer: 'Oração',
        talk: 'Discurso',
        study: 'Estudo',
        reading: 'Leitura da Bíblia',
        video: 'Vídeo',
        discussion: 'Análise'
      }
    },
    dateFormats: {
      months: [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ],
      weekFormat: 'Semana de {start} - {end}',
      datePattern: /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i,
      bimonthlyFormat: '{month1}-{month2}-{year}'
    },
    selectors: {
      meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle',
      meetingDate: '.contextNav time, .pageDate, [datetime]',
      sections: '.bodyTxt .groupItems li, .todayItems .groupItems li',
      sectionTitle: '.itemTitle h4, .it-title, .sectionTitle',
      weekTitle: '.weekRange, .contextTxt h2'
    },
    patterns: {
      watchtowerPattern: 'sentinela-estudo-{month}-{year}',
      workbookSpecific: 'Nossa-Vida-e-Ministerio-Cristao-{start}-de-{startMonth}-a-{end}-de-{endMonth}-de-{year}'
    }
  },

  // French
  fr: {
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    isDefault: false,
    paths: {
      base: 'bibliotheque',
      workbook: 'cahier-reunions-vie-ministere-chretien',
      watchtower: 'bibliotheque/magazines',
      videos: 'bibliotheque/videos',
      music: 'bibliotheque/musique-cantiques'
    },
    terminology: {
      workbookName: 'Cahier pour les réunions Vie chrétienne et ministère',
      watchtowerName: 'La Tour de Garde',
      meetingTypes: {
        midweek: 'Vie chrétienne et ministère',
        weekend: 'Réunion de fin de semaine'
      },
      sections: {
        song: 'Cantique',
        prayer: 'Prière',
        talk: 'Discours',
        study: 'Étude',
        reading: 'Lecture de la Bible',
        video: 'Vidéo',
        discussion: 'Discussion'
      }
    },
    dateFormats: {
      months: [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ],
      weekFormat: 'Semaine du {start} - {end}',
      datePattern: /(\d{1,2})\s+(\w+)\s+(\d{4})/i,
      bimonthlyFormat: '{month1}-{month2}-{year}'
    },
    selectors: {
      meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle',
      meetingDate: '.contextNav time, .pageDate, [datetime]',
      sections: '.bodyTxt .groupItems li, .todayItems .groupItems li',
      sectionTitle: '.itemTitle h4, .it-title, .sectionTitle',
      weekTitle: '.weekRange, .contextTxt h2'
    },
    patterns: {
      watchtowerPattern: 'tour-de-garde-etude-{month}-{year}',
      workbookSpecific: 'Vie-chretienne-et-ministere-{start}-{startMonth}-{end}-{endMonth}-{year}'
    }
  },

  // German
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    isDefault: false,
    paths: {
      base: 'bibliothek',
      workbook: 'arbeitsheft-leben-dienst-als-christ',
      watchtower: 'bibliothek/zeitschriften',
      videos: 'bibliothek/videos',
      music: 'bibliothek/musik-lieder'
    },
    terminology: {
      workbookName: 'Arbeitsheft für Unser Leben und Dienst als Christ',
      watchtowerName: 'Der Wachtturm',
      meetingTypes: {
        midweek: 'Unser Leben und Dienst als Christ',
        weekend: 'Wochenendversammlung'
      },
      sections: {
        song: 'Lied',
        prayer: 'Gebet',
        talk: 'Ansprache',
        study: 'Studium',
        reading: 'Bibellesung',
        video: 'Video',
        discussion: 'Besprechung'
      }
    },
    dateFormats: {
      months: [
        'januar', 'februar', 'märz', 'april', 'mai', 'juni',
        'juli', 'august', 'september', 'oktober', 'november', 'dezember'
      ],
      weekFormat: 'Woche vom {start} - {end}',
      datePattern: /(\d{1,2})\.?\s+(\w+)\s+(\d{4})/i,
      bimonthlyFormat: '{month1}-{month2}-{year}'
    },
    selectors: {
      meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle',
      meetingDate: '.contextNav time, .pageDate, [datetime]',
      sections: '.bodyTxt .groupItems li, .todayItems .groupItems li',
      sectionTitle: '.itemTitle h4, .it-title, .sectionTitle',
      weekTitle: '.weekRange, .contextTxt h2'
    },
    patterns: {
      watchtowerPattern: 'wachtturm-studium-{month}-{year}',
      workbookSpecific: 'Unser-Leben-und-Dienst-als-Christ-{start}-{startMonth}-{end}-{endMonth}-{year}'
    }
  },

  // Italian
  it: {
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    isDefault: false,
    paths: {
      base: 'biblioteca',
      workbook: 'quaderno-vita-ministero-cristiano',
      watchtower: 'biblioteca/riviste',
      videos: 'biblioteca/video',
      music: 'biblioteca/musica-cantici'
    },
    terminology: {
      workbookName: 'Quaderno per la Vita e il ministero cristiano',
      watchtowerName: 'La Torre di Guardia',
      meetingTypes: {
        midweek: 'Vita e ministero cristiano',
        weekend: 'Adunanza del fine settimana'
      },
      sections: {
        song: 'Cantico',
        prayer: 'Preghiera',
        talk: 'Discorso',
        study: 'Studio',
        reading: 'Lettura della Bibbia',
        video: 'Video',
        discussion: 'Discussione'
      }
    },
    dateFormats: {
      months: [
        'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
      ],
      weekFormat: 'Settimana del {start} - {end}',
      datePattern: /(\d{1,2})\s+(\w+)\s+(\d{4})/i,
      bimonthlyFormat: '{month1}-{month2}-{year}'
    },
    selectors: {
      meetingTitle: '.contextTxt h1, .pub-w h2, .docTitle',
      meetingDate: '.contextNav time, .pageDate, [datetime]',
      sections: '.bodyTxt .groupItems li, .todayItems .groupItems li',
      sectionTitle: '.itemTitle h4, .it-title, .sectionTitle',
      weekTitle: '.weekRange, .contextTxt h2'
    },
    patterns: {
      watchtowerPattern: 'torre-di-guardia-studio-{month}-{year}',
      workbookSpecific: 'Vita-e-ministero-cristiano-{start}-{startMonth}-{end}-{endMonth}-{year}'
    }
  }
};

/**
 * Default fallback language (English)
 */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Get language configuration with fallback
 */
export function getLanguageConfig(langCode) {
  const normalizedLang = langCode?.toLowerCase();
  return SUPPORTED_LANGUAGES[normalizedLang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(langCode) {
  return langCode && SUPPORTED_LANGUAGES.hasOwnProperty(langCode.toLowerCase());
}

/**
 * Get list of all supported languages
 */
export function getSupportedLanguages() {
  return Object.keys(SUPPORTED_LANGUAGES).map(code => ({
    code,
    ...SUPPORTED_LANGUAGES[code],
    isSupported: true
  }));
}

/**
 * Generate bimonthly period for a given date and language
 */
export function getBimonthlyPeriod(date, langCode) {
  const config = getLanguageConfig(langCode);
  const month = date.getMonth();
  const year = date.getFullYear();
  
  const periods = {
    0: `${config.dateFormats.months[0]}-${config.dateFormats.months[1]}`, // Jan-Feb
    1: `${config.dateFormats.months[0]}-${config.dateFormats.months[1]}`, // Jan-Feb
    2: `${config.dateFormats.months[2]}-${config.dateFormats.months[3]}`, // Mar-Apr
    3: `${config.dateFormats.months[2]}-${config.dateFormats.months[3]}`, // Mar-Apr
    4: `${config.dateFormats.months[4]}-${config.dateFormats.months[5]}`, // May-Jun
    5: `${config.dateFormats.months[4]}-${config.dateFormats.months[5]}`, // May-Jun
    6: `${config.dateFormats.months[6]}-${config.dateFormats.months[7]}`, // Jul-Aug
    7: `${config.dateFormats.months[6]}-${config.dateFormats.months[7]}`, // Jul-Aug
    8: `${config.dateFormats.months[8]}-${config.dateFormats.months[9]}`, // Sep-Oct
    9: `${config.dateFormats.months[8]}-${config.dateFormats.months[9]}`, // Sep-Oct
    10: `${config.dateFormats.months[10]}-${config.dateFormats.months[11]}`, // Nov-Dec
    11: `${config.dateFormats.months[10]}-${config.dateFormats.months[11]}` // Nov-Dec
  };
  
  return `${periods[month]}-${year}`;
}

/**
 * Generate watchtower month pattern for a given date and language
 */
export function getWatchtowerMonth(date, langCode) {
  const config = getLanguageConfig(langCode);
  
  // For Spanish and Portuguese: use current month without delay
  // For other languages: adjust as needed based on publication schedule
  let month = date.getMonth();
  let year = date.getFullYear();
  
  // If January, get December of previous year
  if (month === 0) {
    month = 11; // December
    year -= 1;
  } else {
    month -= 1; // Previous month
  }
  
  return config.patterns.watchtowerPattern
    .replace('{month}', config.dateFormats.months[month])
    .replace('{year}', year);
}

/**
 * Generate URLs for a specific language and date
 */
export function generateLanguageUrls(langCode, weekDate) {
  const config = getLanguageConfig(langCode);
  const baseUrl = 'https://www.jw.org';
  
  const bimonthlyPeriod = getBimonthlyPeriod(weekDate, langCode);
  const watchtowerMonth = getWatchtowerMonth(weekDate, langCode);
  
  return {
    midweek: `${baseUrl}/${langCode}/${config.paths.base}/${config.paths.workbook}/${bimonthlyPeriod}-mwb/`,
    weekend: `${baseUrl}/${langCode}/${config.paths.watchtower}/${watchtowerMonth}/`,
    workbookBase: `${baseUrl}/${langCode}/${config.paths.base}/${config.paths.workbook}/`,
    watchtowerBase: `${baseUrl}/${langCode}/${config.paths.watchtower}/`,
    videos: `${baseUrl}/${langCode}/${config.paths.videos}/`,
    music: `${baseUrl}/${langCode}/${config.paths.music}/`
  };
}

export default {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageConfig,
  isLanguageSupported,
  getSupportedLanguages,
  getBimonthlyPeriod,
  getWatchtowerMonth,
  generateLanguageUrls
};