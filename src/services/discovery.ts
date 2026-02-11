import { CDNResult, DiscoveredPublication } from '../types/cdn.js';

const JW_CDN_API = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?';

export class DiscoveryService {
  /**
   * Descubre publicaciones iterando meses hacia adelante desde la fecha actual
   * hasta encontrar un 404.
   */
  async discover(pub: string, language: string): Promise<DiscoveredPublication[]> {
    const discovered: DiscoveredPublication[] = [];
    let currentMonth: number;
    let currentYear: number;

    const now = new Date();
    currentYear = 2025; // Forzamos 2025 para pruebas con contenido actual
    currentMonth = now.getMonth() + 1;

    // Para mwb (Guía de Actividades), las ediciones son bimensuales (ene-feb, mar-abr, etc.)
    if (pub === 'mwb') {
      if (currentMonth % 2 === 0) {
        currentMonth -= 1;
      }
    }

    let notFoundCount = 0;
    const maxNotFound = 1; // Detenerse tras el primer 404

    while (notFoundCount < maxNotFound) {
      const issueDate = `${currentYear}${String(currentMonth).padStart(2, '0')}`;
      
      try {
        const url = new URL(JW_CDN_API);
        url.searchParams.append('langwritten', language);
        url.searchParams.append('pub', pub);
        url.searchParams.append('output', 'json');
        url.searchParams.append('issue', issueDate);

        const response = await fetch(url.toString());

        if (response.status === 200) {
          const data: any = await response.json();
          // La API devuelve archivos bajo la clave del idioma (ej: "S")
          const langData = data.files?.[language];

          if (langData) {
            discovered.push({
              pub,
              issue: issueDate,
              language,
              jwpubUrl: langData.JWPUB?.[0]?.file?.url || langData.JWPUB?.[0]?.url,
              epubUrl: langData.EPUB?.[0]?.file?.url || langData.EPUB?.[0]?.url
            });
          }
          notFoundCount = 0; // Resetear si encontramos algo
        } else if (response.status === 404) {
          notFoundCount++;
        } else {
          console.warn(`Unexpected status ${response.status} for ${pub} ${issueDate}`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`Error fetching ${pub} ${issueDate}:`, error);
        notFoundCount++;
      }

      // Avanzar al siguiente issue
      if (pub === 'mwb') {
        currentMonth += 2;
      } else {
        currentMonth += 1;
      }

      if (currentMonth > 12) {
        currentMonth = currentMonth - 12;
        currentYear++;
      }
    }

    return discovered;
  }
}
