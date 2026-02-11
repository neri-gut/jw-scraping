pub mod discovery;
pub mod crypto;
pub mod db;
pub mod html;
pub mod models;

use anyhow::{anyhow, Result};
use std::fs::{self, File};
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

use crate::crypto::CryptoService;
use crate::db::DatabaseService;
use crate::html::HtmlParser;
use crate::models::{Manifest, Document};

/// Main function to parse a JWPUB file and export it to a target directory
pub fn parse_jwpub<P: AsRef<Path>>(jwpub_path: P, output_dir: P) -> Result<Manifest> {
    let output_dir = output_dir.as_ref();
    let assets_dir = output_dir.join("assets");
    fs::create_dir_all(&assets_dir)?;

    // 1. Open JWPUB (ZIP)
    let file = File::open(&jwpub_path)?;
    let mut archive = ZipArchive::new(file)?;

    // 2. Extract 'contents' file (which is another ZIP)
    let mut contents_zip_buffer = Vec::new();
    {
        let mut contents_file = archive.by_name("contents")
            .map_err(|_| anyhow!("'contents' file not found in JWPUB"))?;
        contents_file.read_to_end(&mut contents_zip_buffer)?;
    }

    // 3. Open Inner ZIP
    let contents_cursor = std::io::Cursor::new(contents_zip_buffer);
    let mut contents_archive = ZipArchive::new(contents_cursor)?;

    // 4. Extract SQLite Database
    let db_name = contents_archive.file_names()
        .find(|name| name.ends_with(".db"))
        .map(|name| name.to_string())
        .ok_or_else(|| anyhow!("Database file not found in contents"))?;

    let db_path = output_dir.join("temp.db");
    {
        let mut db_file_in_zip = contents_archive.by_name(&db_name)?;
        let mut db_file_on_disk = File::create(&db_path)?;
        std::io::copy(&mut db_file_in_zip, &mut db_file_on_disk)?;
    }

    // 5. Initialize Services
    let db_service = DatabaseService::from_file(&db_path)?;
    let crypto_service = CryptoService::new()?;

    // 6. Get Metadata & Keys
    let pub_data = db_service.get_publication_data()?;
    let pub_card = format!("{}_{}_{}_{}", 
        pub_data.meps_language_index,
        pub_data.symbol,
        pub_data.year,
        pub_data.issue_tag_number
    );
    println!("DEBUG: Derived PubCard: {}", pub_card);
    let (key, iv) = crypto_service.derive_keys(&pub_card);

    // 7. Determine Class ID based on publication type
    // MWB = 106, W = 40. We can guess based on symbol
    let class_id = if pub_data.symbol.to_lowercase().contains("mwb") { 106 } else { 40 };

    // 8. Process Documents
    let raw_docs = db_service.get_documents_by_class(class_id)?;
    let mut documents = Vec::new();

    for (id, title, encrypted_content) in raw_docs {
        if encrypted_content.is_empty() { continue; }

        let html_raw = crypto_service.decrypt_and_inflate(&encrypted_content, &key, &iv)?;
        let (html, references, assets, paragraphs) = HtmlParser::parse(&html_raw);

        documents.push(Document {
            id,
            title,
            html,
            references,
            assets,
            paragraphs,
        });
    }

    // 9. Extract Physical Assets (Images)
    for i in 0..contents_archive.len() {
        let mut file = contents_archive.by_index(i)?;
        let name = file.name().to_string();
        
        if name.ends_with(".jpg") || name.ends_with(".png") || name.ends_with(".jpeg") {
            let mut out_file = File::create(assets_dir.join(Path::new(&name).file_name().unwrap()))?;
            std::io::copy(&mut file, &mut out_file)?;
        }
    }

    // Cleanup
    let _ = fs::remove_file(db_path);

    // 10. Build Manifest
    let manifest = Manifest {
        publication: pub_data.symbol,
        year: pub_data.year as u16,
        issue: pub_data.issue_tag_number.to_string(), // Simplified
        language: pub_data.meps_language_index.to_string(), // Simplified
        title: format!("Parsed Publication"),
        extracted_at: chrono::Utc::now().to_rfc3339(),
        documents,
    };

    Ok(manifest)
}
