import { createTheme, ThemeOptions } from '@mui/material/styles';

// Apple-inspired liquid glass design system
const glassColors = {
  // Soft, muted tones like Apple's design language
  primary: '#007AFF',     // iOS blue
  secondary: '#5856D6',   // iOS purple
  tertiary: '#FF9500',    // iOS orange
  success: '#34C759',     // iOS green
  warning: '#FF9500',     // iOS orange
  error: '#FF3B30',       // iOS red
  neutral: {
    100: 'rgba(255, 255, 255, 1)',
    90: 'rgba(255, 255, 255, 0.9)',
    80: 'rgba(255, 255, 255, 0.8)',
    60: 'rgba(255, 255, 255, 0.6)',
    40: 'rgba(255, 255, 255, 0.4)',
    20: 'rgba(255, 255, 255, 0.2)',
    10: 'rgba(255, 255, 255, 0.1)',
  },
  dark: {
    100: 'rgba(0, 0, 0, 1)',
    90: 'rgba(0, 0, 0, 0.9)',
    80: 'rgba(0, 0, 0, 0.8)',
    60: 'rgba(0, 0, 0, 0.6)',
    40: 'rgba(0, 0, 0, 0.4)',
    20: 'rgba(0, 0, 0, 0.2)',
    10: 'rgba(0, 0, 0, 0.1)',
  },
};

// Light theme - Clean Apple aesthetic with glassmorphism
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: glassColors.primary,
      light: '#4DA2FF',
      dark: '#0051D5',
    },
    secondary: {
      main: glassColors.secondary,
      light: '#8381F0',
      dark: '#3634A3',
    },
    background: {
      default: '#F2F2F7',  // iOS system gray background
      paper: 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    success: {
      main: glassColors.success,
    },
    warning: {
      main: glassColors.warning,
    },
    error: {
      main: glassColors.error,
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)',
            background: 'rgba(255, 255, 255, 0.9)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: glassColors.primary,
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            background: '#0051D5',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          background: 'rgba(255, 255, 255, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          overflow: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 48px 0 rgba(31, 38, 135, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          background: 'rgba(255, 255, 255, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          fontWeight: 500,
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.8)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.6)',
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: glassColors.primary,
            },
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 0',
          '&:hover': {
            background: 'rgba(0, 122, 255, 0.08)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '0 4px',
          minHeight: 36,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: 'rgba(0, 122, 255, 0.08)',
          },
          '&.Mui-selected': {
            background: 'rgba(0, 122, 255, 0.15)',
          },
        },
      },
    },
  },
};

// Dark theme - Elegant dark glassmorphism like macOS dark mode
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: glassColors.primary,
      light: '#4DA2FF',
      dark: '#0051D5',
    },
    secondary: {
      main: glassColors.secondary,
      light: '#8381F0',
      dark: '#3634A3',
    },
    background: {
      default: '#000000',
      paper: 'rgba(28, 28, 30, 0.8)',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
    },
    success: {
      main: glassColors.success,
    },
    warning: {
      main: glassColors.warning,
    },
    error: {
      main: glassColors.error,
    },
  },
  typography: lightThemeOptions.typography,
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
            background: 'rgba(255, 255, 255, 0.15)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: glassColors.primary,
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            background: '#4DA2FF',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          background: 'rgba(28, 28, 30, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          overflow: 'visible',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 48px 0 rgba(0, 0, 0, 0.6)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          background: 'rgba(28, 28, 30, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          background: 'rgba(28, 28, 30, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontWeight: 500,
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: glassColors.primary,
            },
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 0',
          '&:hover': {
            background: 'rgba(0, 122, 255, 0.15)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '0 4px',
          minHeight: 36,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: 'rgba(0, 122, 255, 0.15)',
          },
          '&.Mui-selected': {
            background: 'rgba(0, 122, 255, 0.25)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          height: 6,
          background: 'rgba(255, 255, 255, 0.1)',
        },
        bar: {
          borderRadius: 10,
          background: `linear-gradient(90deg, ${glassColors.primary}, ${glassColors.secondary})`,
        },
      },
    },
  },
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);