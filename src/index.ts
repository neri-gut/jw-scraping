import { DiscoveryService } from './services/discovery.js';
import { FileService } from './services/file.js';
import { DatabaseService } from './services/database.js';
import { CryptoService } from './services/crypto.js';
import { ParsingService, StructuredContent } from './services/parsing.js';
import { AssetService } from './services/asset.js';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';

async function main() {
  const discovery = new DiscoveryService();
  const fileService = new FileService();
  const dbService = new DatabaseService();
  const cryptoService = new CryptoService();
  const parsingService = new ParsingService();
  const assetService = new AssetService();
  
  const languages = ['S', 'E']; // S = Español, E = Inglés
  const pubs = ['mwb', 'w']; 
  const baseOutputDir = join('temp', 'data');

  console.log('🚀 Iniciando Scraper Optimizado para App Local...');

  for (const lang of languages) {
    for (const pub of pubs) {
      console.log(`\n🔍 Procesando ${pub.toUpperCase()} [${lang}]...`);
      const results = await discovery.discover(pub, lang);
      
      // Tomamos las últimas 2 ediciones encontradas para no saturar la prueba
      const targets = results.filter(r => r.jwpubUrl).slice(0, 2);

      for (const target of targets) {
        if (!target.jwpubUrl) continue;

        const year = target.issue.substring(0, 4);
        const issueDir = join(baseOutputDir, pub, year, target.issue, lang.toLowerCase());
        const assetsDir = join(issueDir, 'assets');
        
        await mkdir(assetsDir, { recursive: true });

        console.log(`  📦 Edición: ${target.issue}`);
        const fileName = `${pub}_${lang}_${target.issue}.jwpub`;
        const filePath = join('temp', fileName);
        
        const buffer = await fileService.downloadFile(target.jwpubUrl, filePath);
        const zip = await fileService.unzip(buffer);
        const contentsBuffer = await fileService.getFileFromZip(zip, 'contents');
        const contentsZip = await fileService.unzip(contentsBuffer);
        
        // 1. Extraer Assets Multimedia
        await assetService.extractAssets(contentsZip, assetsDir);

        // 2. Procesar Base de Datos
        const dbFileName = Object.keys(contentsZip.files).find(f => f.endsWith('.db'));
        if (dbFileName) {
          const dbBuffer = await fileService.getFileFromZip(contentsZip, dbFileName);
          const db = await dbService.loadDatabase(dbBuffer);
          
          const pubData = dbService.executeQuery(db, 'SELECT MepsLanguageIndex, Symbol, Year, IssueTagNumber FROM Publication')[0];
          const pubCard = `${pubData.MepsLanguageIndex}_${pubData.Symbol}_${pubData.Year}_${pubData.IssueTagNumber}`;
          const { key, iv } = await cryptoService.getDeriveKeyAndIv(pubCard);

          const docClass = pub === 'mwb' ? 106 : 40;
          const documents = dbService.executeQuery(db, `SELECT MepsDocumentId, Title, Content FROM Document WHERE Class = ${docClass}`);

          const processedDocs: StructuredContent[] = [];

          for (const doc of documents) {
            const html = await cryptoService.decryptAndInflate(doc.Content, key, iv);
            const structured = parsingService.parseDocument(html, doc.MepsDocumentId.toString());
            processedDocs.push(structured);
          }

          // 3. Generar Manifest JSON para la App Local
          const manifest = {
            publication: pub,
            year: year,
            issue: target.issue,
            language: lang,
            title: pub === 'mwb' ? `Guía de Actividades ${target.issue}` : `La Atalaya ${target.issue}`,
            extractedAt: new Date().toISOString(),
            documents: processedDocs
          };

          await writeFile(
            join(issueDir, 'manifest.json'), 
            JSON.stringify(manifest, null, 2)
          );

          console.log(`    ✅ Manifest generado: ${processedDocs.length} artículos, Assets extraídos.`);
          db.close();
        }
      }
    }
  }

  console.log(`\n✨ Proceso completado. Datos listos en: ${baseOutputDir}`);
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});