# Registro de Investigación: Estructura JWPUB y Proceso de Extracción

Este documento detalla los hallazgos técnicos realizados durante la fase de ingeniería inversa y desarrollo del scraper/parser para publicaciones de JW.org.

## 1. Estructura del Archivo `.jwpub`

El archivo `.jwpub` es un contenedor comprimido con una estructura de dos niveles:

### Nivel 1: Contenedor Principal (ZIP)
- **`manifest.json`**: Metadatos generales del paquete.
- **`contents`**: Un segundo archivo comprimido que contiene la lógica y los activos.

### Nivel 2: Contenido (`contents` ZIP)
- **Base de Datos SQLite (`.db`)**: El núcleo de la publicación. Contiene tablas como `Document`, `Asset`, `Multimedia`, `Publication`.
- **Activos Multimedia (`.jpg`, `.png`, etc.)**: Imágenes en diversas resoluciones. Los nombres suelen seguir un patrón numérico (ej. `202025001_univ_cnt_1.jpg`) que se vincula con la base de datos.

## 2. Hallazgos en la Base de Datos SQLite

Tras analizar el parser de referencia y la estructura interna, se han identificado tablas clave:

- **`Document`**: Almacena el contenido de los artículos.
  - El campo `Content` está encriptado con **AES-128-CBC** y comprimido con **Zlib (Inflate)**.
  - La clase de documento (`Class`) identifica el tipo de contenido (ej. `106` para reuniones, `40` para artículos de estudio).
- **`Asset` / `Multimedia`**: Contienen las referencias a los archivos físicos encontrados en el ZIP.
  - Permiten vincular una etiqueta `<img>` en el HTML con el archivo real.
- **`Publication`**: Metadatos sobre el idioma, año y símbolo de la publicación.

## 3. Lógica de Desencriptación

Para acceder al texto de los documentos, se requiere:
1. **Derivación de Clave**: Una clave maestra XOR con un "PubCard" (combinación de idioma, año y símbolo).
2. **Algoritmo**: AES-128-CBC.
3. **Post-procesamiento**: Descompresión Zlib tras la desencriptación.

## 4. Estado del Desarrollo

### Componentes Implementados:
- [x] **DiscoveryService**: Localiza URLs de descarga en el CDN de JW iterando por fechas y tipos de publicación (`mwb`, `w`).
- [x] **FileService**: Gestiona la descarga de binarios y la descompresión de archivos ZIP de forma recursiva.
- [x] **DatabaseService**: Realiza consultas SQL sobre la base de datos extraída usando `sql.js`.
- [x] **CryptoService**: Implementa derivación de claves XOR y desencriptación AES-128-CBC + Inflate para leer el contenido de `Document`.
- [x] **Hito de Desencriptación**: Se ha logrado extraer HTML legible de la Clase 106 (MWB). El "PubCard" utilizado sigue el formato `MepsLanguageIndex_Symbol_Year_IssueTagNumber`.

### Observaciones del HTML Nativo:
- El HTML extraído contiene clases CSS de JW.org (ej. `du-fontSize--base`, `dc-icon--music`).
- Las referencias utilizan protocolos personalizados (`jwpub://`, `bible://`).
- Las imágenes en el HTML (`<img>`) apuntan a nombres de archivo que coinciden con los extraídos del ZIP `contents`.
- **Potencial**: Una aplicación local podría renderizar este HTML directamente si se inyectan los estilos adecuados y se resuelven las rutas de las imágenes localmente.

## 5. Análisis Estructural y Parsing Local (En curso)

### Objetivos de Investigación Local:
- **La Atalaya (W)**: Identificar clases para preguntas de estudio (`.p1`, `.p2`), párrafos (`.pGroup`) y recuadros de repaso.
- **Biblia (nwt/bi12)**: Analizar la estructura de capítulos y versículos si se procesa un JWPUB de la Biblia.
- **Protocolos**: Mapear cómo resolver `jwpub-media://` a rutas locales de archivos extraídos.

### Estado del Desarrollo:
- [x] **DiscoveryService**: Soporte para `mwb` y `w`.
- [x] **DatabaseService**: Consultas genéricas para cualquier JWPUB.
- [x] **CryptoService**: Desencriptación universal basada en PubCard.
- [x] **ParsingService**: Extracción de referencias y assets.
- [x] **AssetManager**: Implementado `AssetService` para extracción y organización de multimedia.
- [x] **HTML Cleaner**: Implementada inyección de estilos y resolución de rutas locales.
- [x] **Prueba Local**: Generación exitosa de visualizaciones `.html` offline para MWB y W.

## 6. Prueba de Concepto: Buscador Bíblico (En curso)

### Objetivos:
- **Indexación**: Crear un índice invertido para búsquedas rápidas en el texto bíblico.
- **Extracción Granular**: Parsear parrafos y versículos específicos en lugar de documentos completos.
- **Métricas**: Evaluar rendimiento de indexación y búsqueda en un entorno local.

### Estrategia:
1. Descargar la Biblia (NWT) usando la API.
2. Identificar la estructura de clases para libros/capítulos en la DB.
3. Construir un motor de búsqueda ligero en memoria.
