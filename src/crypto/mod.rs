use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use flate2::read::ZlibDecoder;
use sha2::{Digest, Sha256};
use std::io::Read;

type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;

// Master key from reference implementation
const MASTER_KEY_BASE64: &str = "MTFjYmI1NTg3ZTMyODQ2ZDRjMjY3OTBjNjMzZGEyODlmNjZmZTU4NDJhM2E1ODVjZTFiYzNhMjk0YWY1YWRhNw==";

pub struct CryptoService {
    master_key: Vec<u8>,
}

impl CryptoService {
    pub fn new() -> Result<Self> {
        let master_key_hex_bytes = general_purpose::STANDARD
            .decode(MASTER_KEY_BASE64)
            .map_err(|e| anyhow!("Failed to decode master key base64: {}", e))?;
        
        let master_key_hex_str = String::from_utf8(master_key_hex_bytes)
            .map_err(|e| anyhow!("Invalid UTF-8 in master key: {}", e))?;

        let master_key = hex::decode(master_key_hex_str)
            .map_err(|e| anyhow!("Failed to decode hex master key: {}", e))?;
        
        Ok(Self { master_key })
    }

    /// Derives Key and IV based on the PubCard string (mepsLang_symbol_year_issue)
    pub fn derive_keys(&self, pub_card: &str) -> (Vec<u8>, Vec<u8>) {
        let mut hasher = Sha256::new();
        hasher.update(pub_card.as_bytes());
        let hash = hasher.finalize();

        let xored: Vec<u8> = hash
            .iter()
            .zip(self.master_key.iter().cycle())
            .map(|(h, k)| h ^ k)
            .collect();

        let key = xored[0..16].to_vec();
        let iv = xored[16..32].to_vec();

        (key, iv)
    }

    /// Decrypts AES-128-CBC encrypted content and then decompresses it using Zlib
    pub fn decrypt_and_inflate(&self, encrypted_data: &[u8], key: &[u8], iv: &[u8]) -> Result<String> {
        // 1. Decrypt
        let decryptor = Aes128CbcDec::new(key.into(), iv.into());
        // We clone data because decrypt_padded_mut modifies the buffer in place
        let mut buffer = encrypted_data.to_vec();
        
        let decrypted_bytes = decryptor
            .decrypt_padded_mut::<Pkcs7>(&mut buffer)
            .map_err(|e| anyhow!("AES decryption failed: {}", e))?;

        // 2. Inflate (Decompress)
        let mut decoder = ZlibDecoder::new(decrypted_bytes);
        let mut s = String::new();
        decoder.read_to_string(&mut s)?;

        Ok(s)
    }
}
