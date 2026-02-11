# Proyecto: Scraper y Parser de Publicaciones JW

Elaborar un Scraper para la API pública de jw.org para las publicaciones con la finalidad de obtener una serie de documentos, procesar su contenido mediante un parser extendido y poder consultar la información extraida desde una aplicación local encargada de manejar la indormación multimedia como las imagenes de cada documento, los videos referenciados o los textos de la biblia que se obtienen de las publiaciones descargadas y se utiliza la biblia en formato epub para hacer la busqueda de parrafos, etc.

## Objetivos Alcanzados en el Diseño:
- **Consumo de API CDN**: Implementación de un descubrimiento automático de nuevas ediciones mediante iteración de meses.
- **Parser Extendido**: Evolución del parser actual para extraer no solo texto, sino también imágenes, referencias cruzadas y metadatos estructurados de los archivos `.jwpub`.

Para más detalles sobre la implementación y el esquema de base de datos, consulte el [README.md](./README.md).

Guiate en los repositorios dentro de las siguientes rutas:
- `/home/neri/Documentos/Proyectos/Desktop-Presentation-App/Scraper/sws2apps-api`
- `/home/neri/Documentos/Proyectos/Desktop-Presentation-App/Scraper/meeting-schedules-parser`
