use scraper::{Html, Selector};
use crate::models::{Reference, ReferenceType, Asset, AssetType};

pub struct HtmlParser;

impl HtmlParser {
    pub fn parse(html_content: &str) -> (String, Vec<Reference>, Vec<Asset>, Vec<String>) {
        let document = Html::parse_document(html_content);
        let mut references = Vec::new();
        let mut assets = Vec::new();
        let mut paragraphs = Vec::new();

        // Selectors
        let a_selector = Selector::parse("a").unwrap();
        let img_selector = Selector::parse("img").unwrap();
        let p_selector = Selector::parse("p").unwrap();

        // 1. Extract References and Video Links
        for element in document.select(&a_selector) {
            let href = element.value().attr("href").unwrap_or("").to_string();
            let data_video = element.value().attr("data-video").unwrap_or("").to_string();
            let text = element.text().collect::<Vec<_>>().join(" ").trim().to_string();

            if href.starts_with("bible://") {
                references.push(Reference {
                    r#type: ReferenceType::Bible,
                    link: href.clone(),
                    text: text.clone(),
                });
            } else if href.starts_with("jwpub://") {
                references.push(Reference {
                    r#type: ReferenceType::Publication,
                    link: href.clone(),
                    text: text.clone(),
                });
            }

            if href.starts_with("webpubvid://") || data_video.starts_with("webpubvid://") {
                let link = if !data_video.is_empty() { data_video } else { href };
                references.push(Reference {
                    r#type: ReferenceType::Video,
                    link: link.clone(),
                    text: if text.is_empty() { "Video".to_string() } else { text.clone() },
                });
                
                assets.push(Asset {
                    file_name: link,
                    alt_text: if text.is_empty() { "Video".to_string() } else { text },
                    r#type: AssetType::Video,
                });
            }
        }

        // 2. Extract Images & Rewrite Paths (Simulation)
        // Note: Real rewriting would involve modifying the DOM tree. 
        // scraper is mostly for parsing/extracting. For rewriting attributes effectively 
        // while keeping the structure, we might need to serialize differently or just 
        // return the extracted assets and let the frontend map them.
        // HOWEVER, for this output, we will return the raw HTML and the assets list.
        // The frontend can replace `src="path"` with the local asset URL easily or we can do string replacement.
        // For simplicity and speed in Rust, string replacement on the final HTML is often faster than DOM manipulation for this specific task.
        
        let mut modified_html = html_content.to_string();

        for element in document.select(&img_selector) {
            let src = element.value().attr("src").unwrap_or("").to_string();
            let alt = element.value().attr("alt").unwrap_or("").to_string();

            let file_name = src.replace("jwpub-media://", "");
            let file_name = file_name.split('/').last().unwrap_or(&file_name).to_string();

            assets.push(Asset {
                file_name: file_name.clone(),
                alt_text: alt,
                r#type: AssetType::Image,
            });

            // Basic string replacement for paths (Naive but effective for standard JWPUB HTML)
            // We replace the original src with a relative path
            modified_html = modified_html.replace(&src, &format!("./assets/{}", file_name));
        }

        // 3. Extract Paragraphs
        for element in document.select(&p_selector) {
            let text = element.text().collect::<Vec<_>>().join(" ").trim().to_string();
            if !text.is_empty() {
                paragraphs.push(text);
            }
        }

        (modified_html, references, assets, paragraphs)
    }
}
