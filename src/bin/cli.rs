use clap::Parser;
use jw_parser::parse_jwpub;
use std::path::PathBuf;
use std::fs;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the .jwpub file
    #[arg(short, long)]
    input: PathBuf,

    /// Output directory
    #[arg(short, long)]
    output: PathBuf,
}

fn main() -> anyhow::Result<()> {
    env_logger::init();
    let args = Args::parse();

    println!("🚀 Starting JW Parser (Rust Edition)");
    println!("📂 Input: {:?}", args.input);
    println!("📂 Output: {:?}", args.output);

    if !args.input.exists() {
        eprintln!("❌ Input file does not exist!");
        std::process::exit(1);
    }

    let start = std::time::Instant::now();

    match parse_jwpub(&args.input, &args.output) {
        Ok(manifest) => {
            let json_path = args.output.join("manifest.json");
            let json = serde_json::to_string_pretty(&manifest)?;
            fs::write(&json_path, json)?;
            
            let duration = start.elapsed();
            println!("✅ Success! Parsed in {:.2?}", duration);
            println!("📄 Manifest saved to: {:?}", json_path);
            println!("📚 Documents processed: {}", manifest.documents.len());
        },
        Err(e) => {
            eprintln!("❌ Error parsing file: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}
