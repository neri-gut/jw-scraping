# Registro de Investigación: Estructura JWPUB y Proceso de Extracción (Rust Edition)

Este documento detalla los hallazgos técnicos realizados durante la migración y optimización del parser.

## 4. Estado del Desarrollo (Actualizado Feb 2026)

### Migración a Rust (Optimización al Límite)
Se ha decidido migrar el núcleo del parser de TypeScript a Rust para integrarse nativamente con Tauri.

**Beneficios obtenidos:**
- **Rendimiento:** Reducción drástica en el tiempo de desencriptación y procesamiento de archivos.
- **Seguridad:** Manejo robusto de errores y seguridad de memoria.
- **Tauri Ready:** El parser funciona como un comando nativo, evitando el uso de Node.js en la app final.

### Componentes Implementados en Rust:
- [x] **CryptoModule**: Implementación de AES-128-CBC con `aes` y `cbc` crates.
- [x] **DbModule**: Uso de `rusqlite` con binario embebido para máxima portabilidad.
- [x] **HtmlModule**: Parsing ultra rápido usando la librería `scraper`.
- [x] **DiscoveryModule**: Servicio independiente para pruebas de descarga (CDN).

### Logros Técnicos:
- Reescritura dinámica de rutas de imágenes en el HTML para renderizado local inmediato.
- Extracción de referencias a vídeos (`webpubvid://`) como metadatos estructurados.
- Generación de `manifest.json` que actúa como base de datos local para la UI en Vue.

## 5. Arquitectura del Manifiesto
El archivo generado tiene la siguiente estructura optimizada:
```json
{
  "publication": "mwb",
  "documents": [
    {
      "id": 202025001,
      "title": "...",
      "html": "... <img src='./assets/image.jpg'> ...",
      "assets": [ { "fileName": "image.jpg", "type": "image" } ]
    }
  ]
}
```
