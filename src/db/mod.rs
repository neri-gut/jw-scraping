use anyhow::Result;
use rusqlite::{Connection, OpenFlags};
use crate::models::DbPublication;

pub struct DatabaseService {
    conn: Connection,
}

impl DatabaseService {
    /// Opens an SQLite database from a file path
    pub fn from_file(path: &std::path::Path) -> Result<Self> {
        let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        Ok(Self { conn })
    }

    /// Retrieves publication metadata required for key derivation
    pub fn get_publication_data(&self) -> Result<DbPublication> {
        let mut stmt = self.conn.prepare(
            "SELECT MepsLanguageIndex, Symbol, Year, IssueTagNumber FROM Publication LIMIT 1"
        )?;

        let mut rows = stmt.query([])?;

        if let Some(row) = rows.next()? {
            Ok(DbPublication {
                meps_language_index: row.get(0)?,
                symbol: row.get(1)?,
                year: row.get(2)?,
                issue_tag_number: row.get::<_, String>(3)?,
            })
        } else {
            Err(anyhow::anyhow!("No publication data found in DB"))
        }
    }

    /// Retrieves raw encrypted content for documents of a specific class
    /// Returns a tuple of (MepsDocumentId, Title, EncryptedContent)
    pub fn get_documents_by_class(&self, class_id: i32) -> Result<Vec<(u32, String, Vec<u8>)>> {
        let mut stmt = self.conn.prepare(
            "SELECT MepsDocumentId, Title, Content FROM Document WHERE Class = ?"
        )?;

        let rows = stmt.query_map([class_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
            ))
        })?;

        let mut documents = Vec::new();
        for doc in rows {
            documents.push(doc?);
        }

        Ok(documents)
    }
}
