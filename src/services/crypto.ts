import { inflate } from 'pako';

export class CryptoService {
  /**
   * Genera el hash SHA-256 de un texto.
   * Basado en la lógica del parser de referencia.
   */
  private async generateSHA256(text: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Convierte un string hexadecimal a Uint8Array.
   */
  private hexToBytes(hex: string): Uint8Array {
    const clean = hex.replace(/[^a-fA-F0-9]/g, '');
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  /**
   * Convierte Uint8Array a string hexadecimal.
   */
  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Realiza la operación XOR entre dos buffers.
   */
  private xorBuffers(buf1: Uint8Array, buf2: Uint8Array): Uint8Array {
    return buf1.map((byte, i) => byte ^ buf2[i % buf2.length]);
  }

  /**
   * Obtiene la clave y el IV (Vector de Inicialización) para AES-128-CBC.
   * @param pubCard Una cadena que identifica la publicación (mepsLang_symbol_year_issue)
   */
  async getDeriveKeyAndIv(pubCard: string): Promise<{ key: string; iv: string }> {
    // Clave maestra codificada en base64 (extraída del parser de referencia)
    const masterKeyBase64 = 'MTFjYmI1NTg3ZTMyODQ2ZDRjMjY3OTBjNjMzZGEyODlmNjZmZTU4NDJhM2E1ODVjZTFiYzNhMjk0YWY1YWRhNw==';
    const masterKeyHex = atob(masterKeyBase64);
    
    const hashBytes = await this.generateSHA256(pubCard);
    const keyBytes = this.hexToBytes(masterKeyHex);

    const xored = this.xorBuffers(hashBytes, keyBytes);
    const fullKeyHex = this.bytesToHex(xored);

    // Los primeros 32 caracteres hex (16 bytes) son la KEY
    // Los siguientes 32 caracteres hex (16 bytes) son el IV
    return {
      key: fullKeyHex.slice(0, 32),
      iv: fullKeyHex.slice(32, 64)
    };
  }

  /**
   * Desencripta contenido AES-128-CBC y luego lo descomprime (Inflate).
   */
  async decryptAndInflate(data: Uint8Array, keyHex: string, ivHex: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.hexToBytes(keyHex),
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: this.hexToBytes(ivHex) },
      cryptoKey,
      data
    );

    const decompressed = inflate(new Uint8Array(decrypted));
    return new TextDecoder().decode(decompressed);
  }
}
