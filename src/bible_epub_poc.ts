import { FileService } from './services/file.js';
import { ParsingService } from './services/parsing.js';
import { join } from 'path';
import { performance } from 'perf_hooks';
import JSZip from 'jszip';

// --- Tipos para el Buscador ---
interface BibleNode {
  id: string;
  title: string;
  text: string;
  html: string;
}

class EpubSearchEngine {
  private index: Map<string, string[]> = new Map(); // Palabra -> IDs de nodos
  private nodes: Map<string, BibleNode> = new Map();

  addNode(id: string, title: string, html: string) {
    // Extraer texto plano quitando etiquetas HTML
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    this.nodes.set(id, { id, title, text, html });
    
    const words = this.tokenize(text);
    words.forEach(word => {
      if (!this.index.has(word)) {
        this.index.set(word, []);
      }
      if (!this.index.get(word)!.includes(id)) {
        this.index.get(word)!.push(id);
      }
    });
  }

  search(query: string) {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    const results: Map<string, number> = new Map();

    tokens.forEach(token => {
      const matches = this.index.get(token) || [];
      matches.forEach(id => {
        results.set(id, (results.get(id) || 0) + 1);
      });
    });

    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({
        score,
        node: this.nodes.get(id)!
      }));
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:"«»()!?]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  getStats() {
    return { totalNodes: this.nodes.size, totalTerms: this.index.size };
  }
}

async function main() {
  const fileService = new FileService();
  const searchEngine = new EpubSearchEngine();

  console.log('🚀 Iniciando Prueba de Concepto: Buscador Bíblico vía EPUB');

  // 1. Obtener URL del EPUB de la Biblia
  const nwtUrl = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?langwritten=S&pub=nwt&output=json&fileformat=EPUB';
  
  console.log(`
📥 Consultando última versión de la Biblia (EPUB)...`);
  const response = await fetch(nwtUrl);
  const data: any = await response.json();
  const epubUrl = data.files.S.EPUB[0].file.url;
  
  console.log(`  📥 Descargando: ${epubUrl}...`);
  const buffer = await fileService.downloadFile(epubUrl, join('temp', 'nwt_S.epub'));

  console.log(`  📂 Procesando EPUB...`);
  const zip = await fileService.unzip(buffer);
  
  // 2. Indexación
  console.log(`
⚙️  Indexando contenido HTML del EPUB...`);
  const startTime = performance.now();

  // En un EPUB, los capítulos suelen ser archivos .xhtml o .html
  const htmlFiles = Object.keys(zip.files).filter(f => f.endsWith('.xhtml') || f.endsWith('.html'));
  
  // Para la prueba, indexaremos los primeros 100 archivos (libros/capítulos)
  const limit = Math.min(htmlFiles.length, 100);
  
  for (let i = 0; i < limit; i++) {
    const fileName = htmlFiles[i];
    const html = await zip.file(fileName)!.async('string');
    
    // Usamos el nombre del archivo como ID
    searchEngine.addNode(fileName, fileName, html);
  }

  const endTime = performance.now();
  const indexTime = (endTime - startTime) / 1000;
  
  console.log(`  ✅ Indexación completada en ${indexTime.toFixed(2)}s`);
  console.log(`    - Archivos indexados: ${limit}`);
  console.log(`    - Términos únicos: ${searchEngine.getStats().totalTerms}`);

  // 3. Búsqueda
  const queries = ['Jehova', 'Jesucristo', 'Reino', 'Resurreccion'];
  
  console.log(`
🔎  Ejecutando pruebas de búsqueda...`);
  
  for (const q of queries) {
    const tStart = performance.now();
    const results = searchEngine.search(q);
    const tEnd = performance.now();
    
    console.log(`  🔍 Query: "${q}" (${(tEnd - tStart).toFixed(2)}ms)`);
    if (results.length > 0) {
      console.log(`     Top resultado: ${results[0].node.id} (Score: ${results[0].score})`);
      console.log(`     Snippet: ${results[0].node.text.substring(0, 150)}...`);
    } else {
      console.log('     No se encontraron resultados.');
    }
    console.log('');
  }

  console.log('✨ POC Finalizada.');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
