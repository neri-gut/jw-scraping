import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import JSZip from 'jszip';

export class FileService {
  /**
   * Descarga un archivo desde una URL y lo guarda localmente
   */
  async downloadFile(url: string, destPath: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, Buffer.from(buffer));
    return buffer;
  }

  /**
   * Descomprime un buffer ZIP y devuelve un objeto JSZip
   */
  async unzip(buffer: ArrayBuffer | Buffer): Promise<JSZip> {
    const zip = new JSZip();
    return await zip.loadAsync(buffer);
  }

  /**
   * Extrae un archivo específico de un JSZip como ArrayBuffer
   */
  async getFileFromZip(zip: JSZip, fileName: string): Promise<Uint8Array> {
    const file = zip.file(fileName);
    if (!file) {
      throw new Error(`File ${fileName} not found in ZIP`);
    }
    return await file.async('uint8array');
  }
}
