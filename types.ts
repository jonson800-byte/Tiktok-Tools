export enum AppMode {
  IMAGE_SUITE = 'IMAGE_SUITE',
  VIDEO_SUITE = 'VIDEO_SUITE',
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  isLoading: boolean;
}

export interface SceneSuggestion {
  title: string;
  description: string;
}

export enum Industry {
  BEAUTY = '美妆护肤',
  FASHION = '服装鞋包',
  HOME = '家居百货',
  ELECTRONICS = '3C数码',
  FOOD = '食品饮料',
  TOYS = '母婴玩具',
  CUSTOM = '自定义行业',
}

export interface VideoState {
  isGenerating: boolean;
  progress: string;
  videoUrl: string | null;
  error: string | null;
}

// Window interface extension for AI Studio key selection
declare global {
  // Define AIStudio interface to match the existing type expected by the environment (or create it if missing)
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
