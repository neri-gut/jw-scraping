# 🕷️ JW.org Meeting Content API

API automatizada para contenido semanal de reuniones de Testigos de Jehová mediante scraping de JW.org.

## 🎯 **Propósito**

Este proyecto genera automáticamente una API REST con datos estructurados de las reuniones semanales, incluyendo:

- **Reuniones entre semana** (Vida y Ministerio Cristianos)
- **Reuniones de fin de semana** (Reunión Pública + Estudio de La Atalaya)
- **Materiales multimedia** (videos, imágenes, audio)
- **Información de cánticos**
- **Duración y estructura de secciones**

## 🏗️ **Arquitectura**

```
📁 jw-scraping/
├── .github/workflows/
│   └── scrape-weekly.yml     # GitHub Actions para scraping automático
├── src/
│   ├── scraper.js           # Scraper principal con Puppeteer
│   ├── validator.js         # Validación de datos
│   ├── api-generator.js     # Generador de endpoints API
│   └── summary.js           # Generador de resúmenes
├── data/
│   └── {year}/
│       └── week-{nn}.json   # Datos semanales
├── api/
│   ├── index.json          # Información general de la API
│   ├── latest.json         # Semana más reciente
│   ├── weeks.json          # Lista de semanas
│   ├── stats.json          # Estadísticas generales
│   └── data/               # Copia de todos los datos
└── package.json
```

## 🚀 **Uso Local**

### Instalación
```bash
npm install
```

### Scraping manual
```bash
# Scrapear semana actual
npm run scrape

# Scrapear semana específica
npm run scrape -- --week=2025-01-20

# Forzar actualización
npm run scrape -- --force

# Diferente idioma
npm run scrape -- --language=en
```

### Validación
```bash
npm run validate
```

### Generar API
```bash
npm run generate-api
```

### Resumen
```bash
npm run summary
```

## 🤖 **Automatización con GitHub Actions**

### Configuración
1. **Habilitar GitHub Pages** en tu repositorio
2. **Configurar fuente** como GitHub Actions
3. El workflow se ejecuta **cada lunes a las 6:00 AM UTC**

### Ejecución manual
1. Ve a **Actions** en tu repositorio
2. Selecciona **"Scrape Weekly Meeting Content"**
3. Haz clic en **"Run workflow"**
4. Configura parámetros opcionales

### URLs de la API
Una vez configurado, la API estará disponible en:

```
https://TU-USUARIO.github.io/jw-scraping/
```

## 📡 **Endpoints de la API**

### 📋 **Información general**
```
GET /index.json
```
Metadatos de la API, endpoints disponibles y estadísticas generales.

### 🕐 **Última semana**
```
GET /latest.json
```
Datos completos de la semana más reciente.

### 📅 **Lista de semanas**
```
GET /weeks.json
```
Resumen de todas las semanas disponibles con enlaces a datos completos.

### 📊 **Estadísticas**
```
GET /stats.json
```
Estadísticas detalladas: total de reuniones, materiales, duración, etc.

### 🗂️ **Datos específicos**
```
GET /data/{year}/week-{number}.json
```

Ejemplos:
- `/data/2025/week-03.json` - Tercera semana de 2025
- `/data/2025/week-15.json` - Decimoquinta semana de 2025

## 📄 **Estructura de Datos**

### Formato de semana completa
```json
{
  "id": "week-2025-3",
  "weekStartDate": "2025-01-13T00:00:00.000Z",
  "weekEndDate": "2025-01-19T00:00:00.000Z",
  "weekOf": "Semana del 13-19 ene",
  "year": 2025,
  "weekNumber": 3,
  "meetings": [
    {
      "type": "midweek",
      "title": "Reunión Entre Semana",
      "date": "2025-01-15T00:00:00.000Z",
      "sections": [
        {
          "id": "section-1",
          "order": 1,
          "title": "Cántico y oración",
          "duration": 5,
          "type": "song",
          "materials": []
        }
      ],
      "materials": {
        "videos": [],
        "images": [],
        "audio": [],
        "songs": []
      },
      "totalDuration": 105
    }
  ],
  "stats": {
    "totalSections": 12,
    "totalMaterials": 8,
    "totalDuration": 225
  },
  "metadata": {
    "generatedAt": "2025-01-20T06:30:00.000Z",
    "version": "1.0",
    "language": "es"
  }
}
```

## 🔧 **Configuración**

### Variables de entorno
```bash
# Opcional: configurar directorio de salida
CONTENT_OUTPUT_DIR=./custom-data
API_OUTPUT_DIR=./custom-api

# Opcional: configurar idioma
SCRAPER_LANGUAGE=es
```

### Personalización del scraper
Edita `src/scraper.js` para:
- Agregar nuevos selectores CSS
- Modificar lógica de extracción
- Agregar soporte para más idiomas
- Cambiar formato de salida

## 🛠️ **Desarrollo**

### Ejecutar en modo desarrollo
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Servidor de preview local
```bash
npm run preview
```

## 📊 **Monitoreo**

### Logs del GitHub Actions
- Ve a la pestaña **Actions** de tu repositorio
- Cada ejecución muestra logs detallados
- Los errores se reportan automáticamente

### Validación automática
- Todos los datos se validan antes de generar la API
- Los archivos con errores no se publican
- Los errores se muestran en el resumen del workflow

## 🤝 **Contribuir**

1. **Fork** este repositorio
2. **Crea** una rama para tu feature
3. **Haz** tus cambios
4. **Asegúrate** de que los tests pasen
5. **Envía** un Pull Request

### Reportar problemas
- Usa los **Issues** para reportar bugs
- Incluye logs del scraper si es posible
- Especifica la semana que causó problemas

## ⚖️ **Consideraciones Legales**

- Este proyecto hace scraping **responsable** de contenido público
- **Respeta** los términos de uso de JW.org
- **No sobrecarga** los servidores (máximo 1 ejecución semanal)
- Los datos extraídos son para **uso personal/religioso**

## 📜 **Licencia**

MIT License - ver archivo `LICENSE` para detalles.

## 🆘 **Soporte**

¿Problemas? ¡Estamos aquí para ayudar!

1. **Revisa** la documentación arriba
2. **Busca** en Issues existentes
3. **Crea** un nuevo Issue con detalles
4. **Incluye** logs y configuración relevante

---

**⭐ Si este proyecto te es útil, ¡dale una estrella en GitHub!**