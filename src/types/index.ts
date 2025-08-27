export interface Theme {
  name: string;
  colors: {
    bg: string;
    fg: string;
    frameBg: string;
    buttonBg: string;
    buttonFg: string;
    entryBg: string;
    entryFg: string;
    labelFg: string;
    highlight: string;
    success: string;
    warning: string;
    error: string;
  };
}

export interface ScrapingConfig {
  url: string;
  startPage: number;
  endPage: number;
  filename: string;
  includePrefix: boolean;
  includeSuffix: boolean;
  includeDate: boolean;
  includeParams: boolean;
  includeAspectRatio: boolean;
  toLowerCase: boolean;
  prefix: string;
  suffix: string;
  aspectRatio: string;
  additionalParams: string;
}

export interface ScrapingProgress {
  currentPage: number;
  totalPages: number;
  prompts: number;
  status: 'idle' | 'scraping' | 'processing' | 'complete' | 'error';
  message: string;
  percentage: number;
}

export interface ScrapingResult {
  success: boolean;
  prompts: string[];
  filename?: string;
  error?: string;
  stats: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    totalPrompts: number;
  };
}

export interface SocketEvents {
  'scraping-progress': (data: ScrapingProgress) => void;
  'scraping-complete': (data: ScrapingResult) => void;
  'scraping-error': (error: string) => void;
}

export const THEMES: Record<string, Theme> = {
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      bg: '#0d1117',
      fg: '#c9d1d9',
      frameBg: '#161b22',
      buttonBg: '#21262d',
      buttonFg: '#f0f6fc',
      entryBg: '#0d1117',
      entryFg: '#c9d1d9',
      labelFg: '#58a6ff',
      highlight: '#1f6feb',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149'
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      bg: '#2e2e2e',
      fg: '#ffffff',
      frameBg: '#3d3d3d',
      buttonBg: '#555555',
      buttonFg: '#ffffff',
      entryBg: '#4d4d4d',
      entryFg: '#ffffff',
      labelFg: '#cccccc',
      highlight: '#4d94ff',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#f44336'
    }
  },
  dracula: {
    name: 'Dracula',
    colors: {
      bg: '#282a36',
      fg: '#f8f8f2',
      frameBg: '#44475a',
      buttonBg: '#6272a4',
      buttonFg: '#f8f8f2',
      entryBg: '#44475a',
      entryFg: '#f8f8f2',
      labelFg: '#50fa7b',
      highlight: '#8be9fd',
      success: '#50fa7b',
      warning: '#ffb86c',
      error: '#ff5555'
    }
  },
  light: {
    name: 'Light',
    colors: {
      bg: '#f0f0f0',
      fg: '#000000',
      frameBg: '#ffffff',
      buttonBg: '#e0e0e0',
      buttonFg: '#000000',
      entryBg: '#ffffff',
      entryFg: '#000000',
      labelFg: '#333333',
      highlight: '#0066cc',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#f44336'
    }
  },
  nord: {
    name: 'Nord',
    colors: {
      bg: '#2E3440',
      fg: '#D8DEE9',
      frameBg: '#3B4252',
      buttonBg: '#4C566A',
      buttonFg: '#ECEFF4',
      entryBg: '#434C5E',
      entryFg: '#D8DEE9',
      labelFg: '#88C0D0',
      highlight: '#5E81AC',
      success: '#A3BE8C',
      warning: '#EBCB8B',
      error: '#BF616A'
    }
  }
};
