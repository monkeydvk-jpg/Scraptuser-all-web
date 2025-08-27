import { create } from 'zustand';
import { ScrapingConfig, ScrapingProgress, Theme, THEMES } from '@/types';

interface AppStore {
  // Theme state
  currentTheme: string;
  theme: Theme;
  setTheme: (themeName: string) => void;
  
  // Scraping configuration
  config: ScrapingConfig;
  updateConfig: (updates: Partial<ScrapingConfig>) => void;
  
  // Scraping progress
  progress: ScrapingProgress;
  setProgress: (progress: ScrapingProgress) => void;
  
  // UI state
  isScrapingActive: boolean;
  setScrapingActive: (active: boolean) => void;
  
  // Preview text
  previewText: string;
  updatePreview: () => void;
  
  // Utility functions
  generateRandomPrefix: () => string;
}

const generateRandomPrefix = () => {
  return Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
};

const defaultConfig: ScrapingConfig = {
  url: 'https://stock.adobe.com/vn/search?creator_id=206854500&filters%5Bcontent_type%3Aphoto%5D=1',
  startPage: 1,
  endPage: 5,
  filename: 'output',
  includePrefix: true,
  includeSuffix: true,
  includeDate: true,
  includeParams: true,
  includeAspectRatio: true,
  toLowerCase: false,
  prefix: generateRandomPrefix(),
  suffix: 'dumnaf',
  aspectRatio: '16:9',
  additionalParams: '--no dust --p 5y3izqx'
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Theme state
  currentTheme: 'cyberpunk',
  theme: THEMES.cyberpunk,
  setTheme: (themeName: string) => {
    if (THEMES[themeName]) {
      set({
        currentTheme: themeName,
        theme: THEMES[themeName]
      });
    }
  },
  
  // Scraping configuration
  config: defaultConfig,
  updateConfig: (updates: Partial<ScrapingConfig>) => {
    set((state) => ({
      config: { ...state.config, ...updates }
    }));
    // Update preview when config changes
    get().updatePreview();
  },
  
  // Scraping progress
  progress: {
    currentPage: 0,
    totalPages: 0,
    prompts: 0,
    status: 'idle',
    message: 'Ready to scrape',
    percentage: 0
  },
  setProgress: (progress: ScrapingProgress) => set({ progress }),
  
  // UI state
  isScrapingActive: false,
  setScrapingActive: (active: boolean) => set({ isScrapingActive: active }),
  
  // Preview text
  previewText: '',
  updatePreview: () => {
    const { config } = get();
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '');
    
    const sampleText = 'A cheerful real estate agent exhibits a spacious, empty office with large windows. The setting radiates opportunity and potential, ideal for businesses ready to move forward.';
    
    let preview = '';
    
    if (config.includePrefix) {
      preview += `${config.prefix} 01 `;
    }
    
    preview += config.toLowerCase ? sampleText.toLowerCase() : sampleText;
    
    if (config.includeDate) {
      preview += ` ${currentDate}`;
    }
    
    if (config.includeSuffix) {
      preview += config.suffix;
    }
    
    if (config.includeParams) {
      preview += ` ${config.additionalParams}`;
    }
    
    if (config.includeAspectRatio) {
      preview += ` --ar ${config.aspectRatio}`;
    }
    
    set({ previewText: preview });
  },
  
  // Utility functions
  generateRandomPrefix: () => {
    const newPrefix = generateRandomPrefix();
    set((state) => ({
      config: { ...state.config, prefix: newPrefix }
    }));
    get().updatePreview();
    return newPrefix;
  }
}));

// Initialize preview on store creation
useAppStore.getState().updatePreview();
