# JW Parser (Rust Engine) 🦀

**JW Parser** es un motor de alto rendimiento escrito en Rust diseñado para descomprimir, desencriptar y procesar publicaciones de JW.org (`.jwpub`). Este proyecto nace de la necesidad de optimizar al límite el procesamiento de datos para aplicaciones de escritorio modernas (como Tauri + Vue), garantizando una experiencia de usuario instantánea y local-first.

## 🏗️ Arquitectura del Proyecto

El proyecto sigue un diseño modular y desacoplado, permitiendo que cada componente sea testeado y mantenido de forma independiente:

- **`crypto`**: Núcleo de seguridad que implementa la derivación de claves mediante SHA-256 y la desencriptación AES-128-CBC, seguida de descompresión Zlib.
- **`db`**: Gestiona la interacción con la base de datos SQLite embebida, abstrayendo las consultas complejas de contenido encriptado.
- **`html`**: Motor de procesamiento de DOM que normaliza el contenido para su renderizado, extrae metadatos multimedia y reescribe rutas.
- **`models`**: Definición estricta de tipos y esquemas de datos, garantizando una salida JSON consistente.
- **`discovery`**: (Opcional) Módulo de red para interactuar con el CDN de JW y facilitar pruebas de integración.

## 🚀 Características Principales

- **Rendimiento Nativo**: Procesamiento de publicaciones completas en menos de 60ms.
- **Desencriptación On-the-Fly**: Implementación exacta del algoritmo de cifrado de publicaciones JW.
- **Normalización de Assets**: 
  - Extrae automáticamente imágenes (`.jpg`, `.png`).
  - Identifica referencias a vídeos (`webpubvid://`).
  - Reescribe el HTML para que las imágenes apunten a carpetas locales relativas.
- **Consumo Simplificado**: Genera un `manifest.json` diseñado para ser inyectado directamente en un frontend mediante `v-html` o componentes reactivos.

## 📊 Esquema de Datos (Output)

La salida principal es un directorio que contiene:
1.  `assets/`: Carpeta con todos los archivos multimedia.
2.  `manifest.json`: Archivo central con la estructura de la publicación.

### Estructura del Manifiesto:
```json
{
  "publication": "mwb",
  "year": 2025,
  "issue": "20250100",
  "language": "1",
  "title": "Parsed Publication",
  "extractedAt": "2026-02-11T...",
  "documents": [
    {
      "id": 202025001,
      "title": "6-12 de enero",
      "html": "<header>...</header><div class='bodyTxt'>...</div>",
      "references": [
        { "type": "bible", "link": "bible://...", "text": "Sal 127:1" },
        { "type": "video", "link": "webpubvid://...", "text": "Video" }
      ],
      "assets": [
        { "fileName": "202025001_univ_cnt_1.jpg", "altText": "...", "type": "image" }
      ],
      "paragraphs": ["Texto plano del párrafo 1...", "Párrafo 2..."]
    }
  ]
}
```

## 🛠️ Instalación y Uso

### Prerrequisitos
- Rust (Edition 2021)
- Cargo

### Compilación y Ejecución (CLI)
Para procesar un archivo localmente:
```bash
# Compilar el binario de herramientas
cargo build --release

# Ejecutar el parser
./target/release/jw_cli --input temp/ejemplo.jwpub --output data/resultado
```

## 🔌 Integración con Tauri

Este parser ha sido diseñado específicamente para funcionar como el backend de una aplicación Tauri. Al ser una librería nativa, puedes invocarla desde Rust sin sobrecarga:

```rust
// En tu src-tauri/src/main.rs
use jw_parser::parse_jwpub;

#[tauri::command]
fn get_publication_content(file_path: String, out_dir: String) -> Result<Manifest, String> {
    parse_jwpub(file_path, out_dir)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_publication_content])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 📜 Estándares de Código

- **Nomenclatura**:
  - Rust: `snake_case` para funciones y variables, `PascalCase` para structs y enums.
  - JSON: `camelCase` para compatibilidad idiomática con JavaScript/Vue.
- **Documentación**: Todos los métodos públicos incluyen comentarios JSDoc que explican su propósito y manejo de errores.
- **Manejo de Errores**: Uso de `anyhow` para errores en tiempo de ejecución y `thiserror` para definiciones de errores de librería.

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
