
import os
import subprocess
import xml.etree.ElementTree as ET
import re
from dotenv import load_dotenv
from supabase import create_client, Client
from bs4 import BeautifulSoup

# Cargar variables de entorno desde .env para desarrollo local
load_dotenv()

# Identificador del scraper que se guardará en la base de datos
MODIFIED_BY_IDENTIFIER = "pyScraper"

def get_supabase_client():
    """Crea y devuelve un cliente de Supabase usando variables de entorno."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_KEY son necesarias.")
    return create_client(supabase_url, supabase_key)

def fetch_languages_from_sitemap(sitemap_url: str):
    """
    Obtiene la lista de códigos de idioma desde el sitemap principal de jw.org usando subprocess + curl.
    Esta implementación evita la detección de bots que afecta a las bibliotecas HTTP de Python.
    """
    try:
        print(f"Obteniendo sitemap desde: {sitemap_url}")
        
        # Usar curl con User-Agent de navegador y timeout de 60 segundos
        curl_command = [
            'curl',
            '-s',  # Silencioso
            '-L',  # Seguir redirecciones
            '--max-time', '60',  # Timeout de 60 segundos
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            sitemap_url
        ]
        
        # Ejecutar curl y capturar la salida
        result = subprocess.run(
            curl_command,
            capture_output=True,
            text=True,
            timeout=70  # Timeout adicional de Python por si acaso
        )
        
        # Verificar si curl fue exitoso
        if result.returncode != 0:
            print(f"Error en curl (código {result.returncode}): {result.stderr}")
            return []
        
        if not result.stdout:
            print("Error: curl no devolvió contenido")
            return []
        
        print(f"Sitemap obtenido exitosamente ({len(result.stdout)} caracteres)")
        
        # Parsear XML directamente del stdout de curl
        root = ET.fromstring(result.stdout.encode('utf-8'))
        namespaces = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        languages = []
        
        # Extraer códigos de idioma del sitemap
        for sitemap in root.findall('sitemap:sitemap', namespaces):
            loc = sitemap.find('sitemap:loc', namespaces)
            if loc is not None:
                loc_text = loc.text
                # Extraer códigos de idioma de URLs como https://www.jw.org/es/sitemap.xml
                if '/sitemap.xml' in loc_text:
                    # Obtener el código de idioma de la URL
                    parts = loc_text.rstrip('/').split('/')
                    if len(parts) >= 4:  # https://www.jw.org/LANG/sitemap.xml
                        lang_code = parts[3]  # El código está en la posición 3
                        if len(lang_code) <= 10 and lang_code != 'sitemap.xml':  # Filtrar códigos válidos
                            languages.append({
                                'code': lang_code,
                                'modified_by': MODIFIED_BY_IDENTIFIER
                            })
        
        print(f"Se encontraron {len(languages)} códigos de idioma")
        return languages
        
    except subprocess.TimeoutExpired:
        print("Error: Timeout al ejecutar curl (más de 70 segundos)")
        return []
    except ET.ParseError as e:
        print(f"Error al parsear XML del sitemap: {e}")
        print(f"Contenido recibido (primeros 500 chars): {result.stdout[:500] if 'result' in locals() else 'No disponible'}")
        return []
    except FileNotFoundError:
        print("Error: curl no está disponible en el sistema")
        return []
    except Exception as e:
        print(f"Error inesperado al obtener sitemap: {e}")
        return []

def extract_language_names_from_jw_homepage():
    """
    Extrae los nombres de idiomas desde la página principal de JW.org.
    Utiliza los metadatos <link rel="alternate"> que contienen los nombres nativos.
    """
    try:
        print("Extrayendo nombres de idiomas desde la página principal de JW.org...")
        
        # Usar curl para obtener la página principal en español (tiene muchos idiomas referenciados)
        curl_command = [
            'curl',
            '-s',  # Silencioso
            '-L',  # Seguir redirecciones
            '--max-time', '60',  # Timeout de 60 segundos
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'https://www.jw.org/es/'
        ]
        
        # Ejecutar curl y capturar la salida
        result = subprocess.run(
            curl_command,
            capture_output=True,
            text=True,
            timeout=70  # Timeout adicional de Python por si acaso
        )
        
        # Verificar si curl fue exitoso
        if result.returncode != 0:
            print(f"Error en curl (código {result.returncode}): {result.stderr}")
            return {}
        
        if not result.stdout:
            print("Error: curl no devolvió contenido")
            return {}
        
        print(f"Página principal obtenida exitosamente ({len(result.stdout)} caracteres)")
        
        # Parsear HTML con BeautifulSoup
        soup = BeautifulSoup(result.stdout, 'html.parser')
        
        # Buscar todos los links alternate que contienen hreflang
        alternate_links = soup.find_all('link', {'rel': 'alternate', 'hreflang': True})
        
        language_names = {}
        
        for link in alternate_links:
            hreflang = link.get('hreflang')
            title = link.get('title', '')
            
            if hreflang and title and '|' in title:
                # Extraer el nombre del idioma después del "|"
                # Formato: "Título de la página | NOMBRE_IDIOMA"
                name_part = title.split('|')[-1].strip()
                
                if name_part:
                    language_names[hreflang] = name_part
        
        print(f"Se extrajeron nombres para {len(language_names)} idiomas")
        return language_names
        
    except subprocess.TimeoutExpired:
        print("Error: Timeout al ejecutar curl para obtener nombres de idiomas")
        return {}
    except Exception as e:
        print(f"Error inesperado al extraer nombres de idiomas: {e}")
        return {}

def update_language_names_in_supabase(supabase, language_names_dict):
    """
    Actualiza los nombres de idiomas en la base de datos Supabase.
    """
    try:
        print("Actualizando nombres de idiomas en Supabase...")
        
        updated_count = 0
        
        for lang_code, lang_name in language_names_dict.items():
            try:
                # Actualizar el registro específico
                result = supabase.table('languages').update(
                    {'name': lang_name}
                ).eq('code', lang_code).execute()
                
                # Verificar si se actualizó algún registro
                if result.data:
                    updated_count += 1
                    
            except Exception as e:
                print(f"Error actualizando idioma {lang_code}: {e}")
                continue
        
        print(f"Se actualizaron {updated_count} nombres de idiomas exitosamente")
        return updated_count
        
    except Exception as e:
        print(f"Error general al actualizar nombres de idiomas: {e}")
        return 0

def main():
    """Función principal para ejecutar el scraper de idiomas y guardarlos en Supabase."""
    print("Iniciando el proceso de scraping de idiomas...")
    
    # 1. Conectar a Supabase
    try:
        supabase = get_supabase_client()
        print("Conexión a Supabase establecida exitosamente.")
    except ValueError as e:
        print(f"Error de configuración: {e}")
        return

    # 2. Obtener idiomas del sitemap
    sitemap_url = "https://www.jw.org/sitemap.xml"
    languages_to_insert = fetch_languages_from_sitemap(sitemap_url)

    if not languages_to_insert:
        print("No se encontraron idiomas o hubo un error al obtenerlos. Abortando.")
        return

    print(f"Se encontraron {len(languages_to_insert)} idiomas para insertar/actualizar.")

    # 3. Insertar códigos de idioma en Supabase
    try:
        print("Intentando insertar/actualizar los datos en la tabla 'languages'...")
        # `upsert` evita duplicados. Si un `code` ya existe, lo actualiza.
        # `on_conflict` especifica la columna que debe ser única.
        data, count = supabase.table('languages').upsert(
            languages_to_insert,
            on_conflict='code'
        ).execute()
        
        inserted_rows_count = len(data[1])
        print(f"¡Éxito! Se insertaron/actualizaron {inserted_rows_count} idiomas.")
        
    except Exception as e:
        print(f"Error al insertar datos en Supabase: {e}")
        return

    # 4. Extraer nombres de idiomas desde JW.org
    language_names = extract_language_names_from_jw_homepage()
    
    if not language_names:
        print("No se pudieron extraer nombres de idiomas. Continuando sin actualizar nombres.")
        return
    
    # 5. Actualizar nombres en Supabase
    updated_names_count = update_language_names_in_supabase(supabase, language_names)
    
    print(f"Proceso completado:")
    print(f"  - Códigos de idioma procesados: {inserted_rows_count}")
    print(f"  - Nombres de idioma actualizados: {updated_names_count}")

if __name__ == "__main__":
    main()
