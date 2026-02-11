use anyhow::{Result, anyhow};
use serde::Deserialize;
use std::fs::File;
use std::io::copy;
use std::path::Path;

const JW_CDN_API: &str = "https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?";

#[derive(Debug, Deserialize)]
pub struct ApiResponse {
    pub files: std::collections::HashMap<String, LanguageFiles>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub struct LanguageFiles {
    pub jwpub: Option<Vec<PublicationFile>>,
}

#[derive(Debug, Deserialize)]
pub struct PublicationFile {
    pub file: FileInfo,
}

#[derive(Debug, Deserialize)]
pub struct FileInfo {
    pub url: String,
}

pub struct DiscoveryService;

impl DiscoveryService {
    /// Discovers and returns the URL for a specific publication and issue
    pub fn find_url(pub_name: &str, lang: &str, issue: &str) -> Result<String> {
        let url = format!(
            "{}langwritten={}&pub={}&issue={}&output=json&fileformat=JWPUB",
            JW_CDN_API, lang, pub_name, issue
        );

        let response: ApiResponse = reqwest::blocking::get(url)?.json()?;
        
        let lang_files = response.files.get(lang)
            .ok_or_else(|| anyhow!("No files found for language {}", lang))?;

        let jwpub_list = lang_files.jwpub.as_ref()
            .ok_or_else(|| anyhow!("No JWPUB files found"))?;

        let file_url = jwpub_list.first()
            .ok_or_else(|| anyhow!("Empty JWPUB list"))?
            .file.url.clone();

        Ok(file_url)
    }

    /// Downloads a file from a URL to a local path
    pub fn download_file(url: &str, dest_path: &Path) -> Result<()> {
        let mut response = reqwest::blocking::get(url)?;
        let mut file = File::create(dest_path)?;
        copy(&mut response, &mut file)?;
        Ok(())
    }
}
