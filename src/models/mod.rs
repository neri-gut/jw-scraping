use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Manifest {
    pub publication: String,
    pub year: u16,
    pub issue: String,
    pub language: String,
    pub title: String,
    pub extracted_at: String,
    pub documents: Vec<Document>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    pub id: u32,
    pub title: String,
    pub html: String,
    pub references: Vec<Reference>,
    pub assets: Vec<Asset>,
    pub paragraphs: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reference {
    pub r#type: ReferenceType,
    pub link: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ReferenceType {
    Bible,
    Publication,
    Video,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub file_name: String,
    pub alt_text: String,
    pub r#type: AssetType,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    Image,
    Video,
}

// Internal struct for DB mapping (not exposed in JSON necessarily)
#[derive(Debug)]
pub struct DbPublication {
    pub meps_language_index: i32,
    pub symbol: String,
    pub year: i32,
    pub issue_tag_number: String,
}
