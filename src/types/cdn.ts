export interface PublicationFile {
  url: string;
  checksum?: string;
  modified?: string;
}

export interface CDNResult {
  pub: string;
  issue: string;
  language: string;
  files: {
    [lang: string]: {
      JWPUB?: PublicationFile[];
      EPUB?: PublicationFile[];
    };
  };
}

export interface DiscoveredPublication {
  pub: string;
  issue: string;
  language: string;
  jwpubUrl?: string;
  epubUrl?: string;
}
