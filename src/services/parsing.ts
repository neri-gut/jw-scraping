import { parse, HTMLElement } from 'node-html-parser';

export interface ExtractedReference {
  type: 'bible' | 'publication' | 'video';
  link: string;
  text: string;
  metadata?: any;
}

export interface ExtractedAsset {
  fileName: string;
  altText?: string;
  type: 'image' | 'video';
  multimediaId?: number;
}

export interface StructuredContent {
  id: string;
  title: string;
  references: ExtractedReference[];
  assets: ExtractedAsset[];
  html: string;
  paragraphs: string[]; // Para búsquedas rápidas o previsualizaciones
}

export class ParsingService {
  /**
   * Procesa el HTML de un documento para extraer referencias, imágenes, vídeos y limpiar el contenido.
   */
  parseDocument(html: string, docId: string = ''): StructuredContent {
    const root = parse(html);
    
    // 1. Extraer título (suele estar en h1 o h2 con clase específica)
    const title = root.querySelector('h1')?.textContent?.trim() || 
                  root.querySelector('h2')?.textContent?.trim() || '';

    // 2. Extraer Referencias y Vídeos
    const references: ExtractedReference[] = [];
    const links = root.querySelectorAll('a');

    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      const dataVideo = a.getAttribute('data-video') || '';
      const text = a.textContent.trim();

      if (href.startsWith('bible://')) {
        references.push({ type: 'bible', link: href, text });
      } else if (href.startsWith('jwpub://')) {
        references.push({ type: 'publication', link: href, text });
      }
      
      // Capturar vídeos tanto en href como en data-video
      if (href.startsWith('webpubvid://') || dataVideo.startsWith('webpubvid://')) {
        references.push({ 
          type: 'video', 
          link: dataVideo || href, 
          text: text || 'Video' 
        });
      }
    });

    // 3. Extraer Assets (Imágenes) y reescribir rutas para App Local
    const assets: ExtractedAsset[] = [];
    const images = root.querySelectorAll('img');

    images.forEach(img => {
      let src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      
      // En JWPUB el src puede venir como jwpub-media:// o solo el nombre
      const fileName = src.replace('jwpub-media://', '').split('/').pop() || src;
      
      assets.push({
        fileName: fileName,
        altText: alt,
        type: 'image'
      });

      // Reescribimos el src para que la app local lo encuentre en la carpeta assets
      img.setAttribute('src', `./assets/${fileName}`);
      // Limpiamos atributos de estilo en línea para dejar que Vue/CSS manejen el diseño
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.classList.add('jw-image');
    });

    // 4. Integrar vídeos detectados en la lista de assets para la UI
    references.filter(r => r.type === 'video').forEach(v => {
      assets.push({
        fileName: v.link,
        altText: v.text,
        type: 'video'
      });
    });

    // 5. Extraer párrafos para previsualización o búsqueda (limpios de HTML)
    const paragraphs = root.querySelectorAll('p').map(p => p.textContent.trim()).filter(t => t.length > 0);

    return {
      id: docId,
      title,
      references,
      assets,
      html: root.toString(),
      paragraphs
    };
  }
}
