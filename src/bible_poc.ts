import { DiscoveryService } from './services/discovery.js';
import { FileService } from './services/file.js';
import { DatabaseService } from './services/database.js';
import { CryptoService } from './services/crypto.js';
import { ParsingService } from './services/parsing.js';
import { join } from 'path';
import { performance } from 'perf_hooks';

// --- Tipos para el Buscador ---
interface VerseIndex {
  id: number;
  book: string;
  chapter: string;
  verse: string;
  text: string;
  html: string;
}

interface SearchResult {
  score: number;
  verse: VerseIndex;
}

class BibleSearchEngine {
  private index: Map<string, number[]> = new Map(); // Palabra -> IDs de versículos
  private verses: Map<number, VerseIndex> = new Map(); // ID -> Datos del versículo

  addVerse(id: number, book: string, chapter: string, verse: string, text: string, html: string) {
    this.verses.set(id, { id, book, chapter, verse, text, html });
    
    // Indexación simple
    const words = this.tokenize(text);
    words.forEach(word => {
      if (!this.index.has(word)) {
        this.index.set(word, []);
      }
      this.index.get(word)!.push(id);
    });
  }

  search(query: string): SearchResult[] {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) return [];

    const results: Map<number, number> = new Map(); // ID -> Score

    tokens.forEach(token => {
      const matches = this.index.get(token) || [];
      matches.forEach(id => {
        const currentScore = results.get(id) || 0;
        results.set(id, currentScore + 1);
      });
    });

    // Ordenar por relevancia
    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, score]) => ({
        score,
        verse: this.verses.get(id)!
      }));
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[.,;:"«»()]/g, "") // Quitar puntuación
      .split(/\s+/)
      .filter(w => w.length > 2); // Filtrar palabras cortas
  }

  getStats() {
    return {
      totalVerses: this.verses.size,
      totalTerms: this.index.size
    };
  }
}

// --- Script Principal ---
async function main() {
  const fileService = new FileService();
  const dbService = new DatabaseService();
  const cryptoService = new CryptoService();
  const searchEngine = new BibleSearchEngine();

  console.log('🚀 Iniciando Prueba de Concepto: Buscador Bíblico NWT');

  // 1. Obtener la Biblia (Hardcodeamos la URL de la API para 'nwt' que es fija/última versión)
  // Normalmente DiscoveryService itera fechas, pero la biblia no cambia mensualmente así.
  // Usaremos una URL directa a la API para obtener la última versión.
  const nwtUrl = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?langwritten=S&pub=nwt&output=json&fileformat=JWPUB';
  
  console.log(`
📥 Consultando última versión de la Biblia (NWT)...`);
  const response = await fetch(nwtUrl);
  const data: any = await response.json();
  const jwpubUrl = data.files.S.JWPUB[0].file.url;
  
  const fileName = 'nwt_S.jwpub';
  const filePath = join('temp', fileName);

  console.log(`  📥 Descargando: ${jwpubUrl}...`);
  const buffer = await fileService.downloadFile(jwpubUrl, filePath);

  console.log(`  📂 Procesando archivo JWPUB...`);
  const zip = await fileService.unzip(buffer);
  const contentsBuffer = await fileService.getFileFromZip(zip, 'contents');
  const contentsZip = await fileService.unzip(contentsBuffer);
  
  const dbFileName = Object.keys(contentsZip.files).find(f => f.endsWith('.db'));
  
  if (dbFileName) {
    const dbBuffer = await fileService.getFileFromZip(contentsZip, dbFileName);
    const db = await dbService.loadDatabase(dbBuffer);
    
    const pubData = dbService.executeQuery(db, 'SELECT MepsLanguageIndex, Symbol, Year, IssueTagNumber FROM Publication')[0];
    const pubCard = `${pubData.MepsLanguageIndex}_${pubData.Symbol}_${pubData.Year}_${pubData.IssueTagNumber}`;
    const { key, iv } = await cryptoService.getDeriveKeyAndIv(pubCard);

    console.log(`  🔑 Claves derivadas para: ${pubData.Symbol} (${pubData.Year})`);

    // 2. Indexación
    console.log(`
⚙️  Indexando contenido (esto puede tomar un momento)...`);
    const startTime = performance.now();

    // Consultamos documentos de la Biblia. 
    // Nota: Necesitamos identificar la clase correcta.
    // Generalmente Bible Books son una clase específica. Haremos un muestreo rápido para encontrarla.
    const classes = dbService.executeQuery(db, 'SELECT Class, COUNT(*) as c FROM Document GROUP BY Class');
    // Asumiremos la clase con más documentos suele ser la de los capítulos de la biblia (o buscar por título)
    // Para NWT, los libros/capítulos suelen tener una clase específica. 
    // Vamos a probar extrayendo los primeros 50 documentos de la clase más numerosa.
    const bibleClass = classes.sort((a,b) => b.c - a.c)[0].Class;
    console.log(`  ℹ️  Clase detectada para contenido bíblico: ${bibleClass}`);

    // Limitamos a 50 documentos para la prueba de concepto (velocidad)
    const limit = 50; 
    const documents = dbService.executeQuery(db, `SELECT MepsDocumentId, Title, Content FROM Document WHERE Class = ${bibleClass} LIMIT ${limit}`);

    for (const doc of documents) {
      // Asegurar que doc.Content es Uint8Array
      const contentBuffer = new Uint8Array(doc.Content);
      const html = await cryptoService.decryptAndInflate(contentBuffer, key, iv);
      
      // Parsing "a lo bruto" para extraer texto plano del HTML para el índice
      // En una implementación real usaríamos node-html-parser más fino para separar versículos
      // Aquí simularemos que cada documento es un "capítulo"
      
      // Extraemos texto plano simple quitando tags
      const plainText = html.replace(/<[^>]+>/g, ' '); 
      
      searchEngine.addVerse(
        doc.MepsDocumentId, 
        "Biblia", // Simplificado
        doc.Title, // Título del capítulo
        "Completo", // Simplificado
        plainText,
        html
      );
    }

    const endTime = performance.now();
    const indexTime = (endTime - startTime) / 1000;
    const stats = searchEngine.getStats();
    
    console.log(`  ✅ Indexación completada en ${indexTime.toFixed(2)}s`);
    console.log(`    - Documentos indexados: ${limit}`);
    console.log(`    - Términos únicos: ${stats.totalTerms}`);
    console.log(`    - Velocidad: ${(limit / indexTime).toFixed(1)} docs/s`);

    // 3. Búsqueda
    const queries = ['amor', 'reino', 'jehová', 'jesús'];
    
    console.log(`
🔎  Ejecutando pruebas de búsqueda...`);
    
    for (const q of queries) {
        const tStart = performance.now();
        const results = searchEngine.search(q);
        const tEnd = performance.now();
        
        console.log(`  🔍 Query: "${q}"`);
        console.log(`     Latencia: ${(tEnd - tStart).toFixed(2)}ms`);
        console.log(`     Resultados: ${results.length}`);
        if (results.length > 0) {
            console.log(`     Top resultado: ${results[0].verse.chapter} (Score: ${results[0].score})`);
            console.log(`     Snippet: ${results[0].verse.text.substring(0, 100)}...`);
        }
        console.log('');
    }

    db.close();
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
