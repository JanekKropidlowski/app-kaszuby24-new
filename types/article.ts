export interface Article {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  featured_media: number;
  featured_media_url?: string;
  categories: number[];
  tags: number[];
  author: number;
  meta?: {
    youtube?: string;
    galeria?: string[];
    zrodlo?: string;
    foto?: string;
    flickr?: string;
    "czy-slider-galeria"?: string;
    "czy-fotogaleria"?: string;
    "plik-dzwiekowy"?: string;
    "opis-plik-dziekowy"?: string;
    views?: string;
    zrudlo?: string;
    footnotes?: string;
    photo_credit?: string;
  };
  _embedded?: {
    author?: Array<{
      id: number;
      name: string;
      url: string;
      avatar_urls: {
        [key: string]: string;
      };
    }>;
    "wp:featuredmedia"?: Array<{
      id: number;
      source_url: string;
      media_details?: {
        sizes?: {
          medium?: {
            source_url: string;
          };
          thumbnail?: {
            source_url: string;
          };
        };
      };
    }>;
    "wp:term"?: Array<Array<{
      id: number;
      name: string;
      slug: string;
    }>>;
  };
}

export interface Nekrolog {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: "nekrolog";
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  featured_media: number;
  template: string;
  region: number[];
  class_list: string[];
}

export interface Category {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface MediaItem {
  id: number;
  source_url: string;
  alt_text: string;
  caption?: {
    rendered: string;
  };
  media_details?: {
    width: number;
    height: number;
    sizes?: {
      medium?: {
        source_url: string;
        width: number;
        height: number;
      };
      thumbnail?: {
        source_url: string;
        width: number;
        height: number;
      };
      large?: {
        source_url: string;
        width: number;
        height: number;
      };
    };
  };
}

export interface Artist {
  id: number;
  name: string;
  slug: string;
  description: string;
  meta: {
    'nazwa-artysty'?: string;
    'opis-artysty'?: string;
    'osoby'?: string;
    'link-do-artysty'?: string;
  };
}

export interface Venue {
  id: number;
  name: string;
  slug: string;
  description: string;
  meta: {
    adres?: string;
    'kod-pocztowy'?: string;
    'opis-obiektu'?: string;
    'dlugosc-i-szerokosc-geograficzna'?: string;
  };
}

export interface Event {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  date: string;
  slug: string;
  featured_media?: number;
  featured_media_url?: string;
  image?: string;
  categories?: string[];
  'kategoria-wydarzenia'?: number[];
  meta?: {
    'data-rozpoczecia'?: string;
    'data-zakonczenia'?: string;
    'godzina-rozpoczecia'?: string;
    'godzina-zakonczenia'?: string;
    cena?: string;
    artysci?: number[];
    miejsca?: number[];
    'czy-caly-dzien'?: string;
    'czy-powtarzajace-sie'?: string;
    miasto?: string;
    'opis-wydarzenia'?: string;
    'link-do-wydarzenia'?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      id: number;
      source_url: string;
      media_details?: {
        sizes?: {
          medium?: {
            source_url: string;
          };
          thumbnail?: {
            source_url: string;
          };
        };
      };
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      slug: string;
      taxonomy: string;
    }>>;
  };
}