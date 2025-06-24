// Apple-inspired design system for OptiGains Nutrition
// Based on SF Pro typography and Apple's Human Interface Guidelines

export const theme = {
  // Color palette inspired by Apple and MacroFactor
  colors: {
    // Blue colors
    blue: {
      50: '#E7F2FF',
      100: '#C3E0FF',
      200: '#9BCBFF',
      300: '#73B6FF',
      400: '#4BA1FF',
      500: '#007AFF', // Apple blue
      600: '#0066CC',
      700: '#0051A5',
      800: '#003D7E',
      900: '#002857',
    },
    
    // Green colors
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    // Orange colors
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    
    // Purple colors
    purple: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',
      800: '#6B21A8',
      900: '#581C87',
    },
    
    // Primary colors
    primary: {
      50: '#E7F2FF',
      100: '#C3E0FF',
      200: '#9BCBFF',
      300: '#73B6FF',
      400: '#4BA1FF',
      500: '#007AFF', // Apple blue
      600: '#0066CC',
      700: '#0051A5',
      800: '#003D7E',
      900: '#002857',
    },
    
    // Grayscale for light mode
    gray: {
      50: '#FAFAFA',
      100: '#F5F5F7', // Apple light gray
      200: '#E8E8ED',
      300: '#D2D2D7',
      400: '#AEAEB2',
      500: '#8E8E93', // Apple system gray
      600: '#636366',
      700: '#48484A',
      800: '#3A3A3C',
      900: '#1C1C1E',
      950: '#000000',
    },
    
    // Dark mode specific colors
    dark: {
      background: {
        primary: '#000000',
        secondary: '#1C1C1E',
        tertiary: '#2C2C2E',
        elevated: '#3A3A3C',
      },
      surface: {
        primary: '#1C1C1E',
        secondary: '#2C2C2E',
        tertiary: '#3A3A3C',
      },
    },
    
    // Semantic colors
    semantic: {
      success: '#34C759', // Apple green
      warning: '#FF9500', // Apple orange
      error: '#FF3B30', // Apple red
      info: '#5856D6', // Apple purple
    },
    
    // Glass morphism colors
    glass: {
      background: 'rgba(255, 255, 255, 0.1)',
      backgroundDark: 'rgba(0, 0, 0, 0.3)',
      border: 'rgba(255, 255, 255, 0.18)',
      borderDark: 'rgba(255, 255, 255, 0.08)',
    },
  },
  
  // Typography scale based on SF Pro
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Inter", system-ui, sans-serif',
      mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
    },
    
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
      '6xl': '3.75rem', // 60px
    },
    
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
    },
    
    lineHeight: {
      tight: 1.1,
      snug: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
    
    letterSpacing: {
      tighter: '-0.03em',
      tight: '-0.02em',
      normal: '-0.01em',
      wide: '0.01em',
      wider: '0.02em',
    },
  },
  
  // Spacing system (8px grid)
  spacing: {
    0: '0px',
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    3.5: '0.875rem', // 14px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
  },
  
  // Border radius
  borderRadius: {
    none: '0px',
    sm: '0.375rem', // 6px
    DEFAULT: '0.5rem', // 8px
    md: '0.625rem', // 10px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },
  
  // Shadow system (subtle, layered)
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    DEFAULT: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0 6px 12px rgba(0, 0, 0, 0.08), 0 3px 6px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
    xl: '0 15px 30px rgba(0, 0, 0, 0.12), 0 6px 12px rgba(0, 0, 0, 0.07)',
    '2xl': '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)',
    
    // Dark mode shadows
    dark: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.2)',
      sm: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
      DEFAULT: '0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
      md: '0 6px 12px rgba(0, 0, 0, 0.5), 0 3px 6px rgba(0, 0, 0, 0.3)',
      lg: '0 10px 20px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)',
      xl: '0 15px 30px rgba(0, 0, 0, 0.7), 0 6px 12px rgba(0, 0, 0, 0.5)',
    },
    
    // Inset shadows for pressed states
    inset: {
      sm: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
      DEFAULT: 'inset 0 2px 4px rgba(0, 0, 0, 0.08)',
      lg: 'inset 0 3px 6px rgba(0, 0, 0, 0.1)',
    },
  },
  
  // Animation constants
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slower: '500ms',
    },
    
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      // Apple's custom easing
      appleEase: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      // Spring animations
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  // Blur values for glass morphism
  blur: {
    none: '0',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
  },
  
  // Z-index scale
  zIndex: {
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

// Helper function to get CSS variables
export const getCSSVariable = (path: string): string => {
  const keys = path.split('.');
  let value: any = theme;
  
  for (const key of keys) {
    value = value[key];
    if (!value) return '';
  }
  
  return value;
};

// Export individual theme sections for easier imports
export const { colors, typography, spacing, borderRadius, shadows, animation, blur, zIndex } = theme;