export type PhotoFilter = 
  | 'normal'
  | 'bw'
  | 'warm'
  | 'noir'
  | 'chrome'
  | 'vintage'
  | 'glow';

export type FrameStyle = 
  | 'classic-white'
  | 'minimal-white'
  | 'matte-black'
  | 'cream-retro'
  | 'film-border';

export type LayoutFormat = 'strip-4' | 'grid-4';

export interface SignatureData {
  dataUrl: string; // PNG base64 transparent drawing
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  scale?: number; // default 1
  color?: string;
}

export interface PhotoStripData {
  id: string;
  createdAt: number;
  photos: string[]; // Array of 4 data URLs / image sources
  filter: PhotoFilter;
  frameStyle: FrameStyle;
  layout: LayoutFormat;
  caption?: string;
  showDate: boolean;
  showLogo: boolean;
  dateString?: string;
  signature?: SignatureData;
}

export type PageView = 'home' | 'booth' | 'result' | 'gallery';

export interface FilterOption {
  id: PhotoFilter;
  name: string;
  description: string;
  cssFilter: string;
}

export interface FrameOption {
  id: FrameStyle;
  name: string;
  bgHex: string;
  textHex: string;
  description: string;
}
