// Material 3 Theme - Light Mode with Kleinanzeigen-inspired colors
export const theme = {
  colors: {
    // Primary - Fresh Green (marketplace trust)
    primary: '#10B981',
    primaryContainer: '#D1FAE5',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#065F46',
    
    // Secondary
    secondary: '#6B7280',
    secondaryContainer: '#F3F4F6',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#374151',
    
    // Tertiary - Purple accent
    tertiary: '#8B5CF6',
    tertiaryContainer: '#EDE9FE',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#5B21B6',
    
    // Error
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onError: '#FFFFFF',
    onErrorContainer: '#991B1B',
    
    // Background & Surface
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    onBackground: '#111827',
    onSurface: '#111827',
    onSurfaceVariant: '#6B7280',
    
    // Outline
    outline: '#D1D5DB',
    outlineVariant: '#E5E7EB',
    
    // Inverse
    inverseSurface: '#1F2937',
    inverseOnSurface: '#FFFFFF',
    inversePrimary: '#34D399',
    
    // Other
    shadow: '#000000',
    scrim: '#000000',
    
    // Custom
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Category colors (pastel)
    categoryAuto: '#DBEAFE',
    categoryHome: '#D1FAE5',
    categoryRealEstate: '#EDE9FE',
    categoryFashion: '#FCE7F3',
    categoryElectronics: '#E0F2FE',
    categoryFamily: '#FEF3C7',
    categoryJobs: '#FEE2E2',
    categoryServices: '#F3E8FF',
    categoryMisc: '#F3F4F6',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  typography: {
    displayLarge: {
      fontSize: 57,
      fontWeight: '400' as const,
      lineHeight: 64,
    },
    displayMedium: {
      fontSize: 45,
      fontWeight: '400' as const,
      lineHeight: 52,
    },
    displaySmall: {
      fontSize: 36,
      fontWeight: '400' as const,
      lineHeight: 44,
    },
    headlineLarge: {
      fontSize: 32,
      fontWeight: '400' as const,
      lineHeight: 40,
    },
    headlineMedium: {
      fontSize: 28,
      fontWeight: '400' as const,
      lineHeight: 36,
    },
    headlineSmall: {
      fontSize: 24,
      fontWeight: '400' as const,
      lineHeight: 32,
    },
    titleLarge: {
      fontSize: 22,
      fontWeight: '500' as const,
      lineHeight: 28,
    },
    titleMedium: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
    },
    titleSmall: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    labelSmall: {
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
  },
  
  elevation: {
    level0: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// Category colors mapping
export const CATEGORY_COLORS: Record<string, string> = {
  vehicles: '#DBEAFE',
  home: '#D1FAE5',
  realestate: '#EDE9FE',
  fashion: '#FCE7F3',
  electronics: '#E0F2FE',
  family: '#FEF3C7',
  jobs: '#FEE2E2',
  services: '#F3E8FF',
  misc: '#F3F4F6',
};

export const CATEGORY_ICON_COLORS: Record<string, string> = {
  vehicles: '#3B82F6',
  home: '#10B981',
  realestate: '#8B5CF6',
  fashion: '#EC4899',
  electronics: '#0EA5E9',
  family: '#F59E0B',
  jobs: '#EF4444',
  services: '#A855F7',
  misc: '#6B7280',
};

export type Theme = typeof theme;
