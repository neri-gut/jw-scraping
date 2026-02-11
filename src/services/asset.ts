import JSZip from 'jszip';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class AssetService {
  /**
   * Extrae todos los archivos multimedia de un JSZip a una carpeta local.
   * Mapea jwpub-media:// a rutas locales.
   */
  async extractAssets(contentsZip: JSZip, outputDir: string): Promise<string[]> {
    await mkdir(outputDir, { recursive: true });
    const extractedPaths: string[] = [];

    const files = Object.keys(contentsZip.files);
    const mediaFiles = files.filter(f => 
      f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg') || f.endsWith('.gif')
    );

    for (const fileName of mediaFiles) {
      const buffer = await contentsZip.file(fileName)!.async('nodebuffer');
      const outputPath = join(outputDir, fileName);
      await writeFile(outputPath, buffer);
      extractedPaths.push(outputPath);
    }

    return extractedPaths;
  }

  /**
   * Genera un CSS básico para inyectar en el HTML nativo y que se vea correctamente.
   */
  getLocalStyles(): string {
    return `
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: auto; padding: 20px; }
        .pageNum { color: #999; font-size: 0.8em; display: block; margin: 10px 0; }
        .b { color: #4a90e2; text-decoration: none; font-weight: bold; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        .dc-icon--music::before { content: "🎵 "; }
        .du-color--textSubdued { color: #666; }
        /* Clases de La Atalaya */
        .themeScrp { font-style: italic; color: #555; border-left: 3px solid #ccc; padding-left: 10px; }
        .pubRefs { font-size: 0.9em; color: #777; }
      </style>
    `;
  }
}
