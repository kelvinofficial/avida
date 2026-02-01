// Material 3 Theme - Light Mode
export const theme = {
  colors: {
    // Primary - Fresh Green (marketplace trust)
    primary: '#2E7D32',
    primaryContainer: '#A5D6A7',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#1B5E20',
    
    // Secondary
    secondary: '#546E7A',
    secondaryContainer: '#CFD8DC',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#37474F',
    
    // Tertiary
    tertiary: '#7B1FA2',
    tertiaryContainer: '#E1BEE7',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#4A148C',
    
    // Error
    error: '#D32F2F',
    errorContainer: '#FFCDD2',
    onError: '#FFFFFF',
    onErrorContainer: '#B71C1C',
    
    // Background & Surface
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onBackground: '#212121',
    onSurface: '#212121',
    onSurfaceVariant: '#757575',
    
    // Outline
    outline: '#BDBDBD',
    outlineVariant: '#E0E0E0',
    
    // Inverse
    inverseSurface: '#212121',
    inverseOnSurface: '#FFFFFF',
    inversePrimary: '#81C784',
    
    // Other
    shadow: '#000000',
    scrim: '#000000',
    
    // Custom
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
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
      shadowRadius: 3,
      elevation: 1,
    },
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
};

export type Theme = typeof theme;
