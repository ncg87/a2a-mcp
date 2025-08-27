import { createTheme, ThemeOptions } from '@mui/material/styles';

// Clean, minimal color palette
const cleanColors = {
  // Subtle accent colors
  primary: '#0066CC',      // Deep blue
  secondary: '#7C3AED',    // Deep purple
  accent: '#10B981',       // Emerald green
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutral glass layers with better contrast
  glass: {
    light: 'rgba(255, 255, 255, 0.75)',
    medium: 'rgba(255, 255, 255, 0.85)',
    heavy: 'rgba(255, 255, 255, 0.95)',
    solid: 'rgba(255, 255, 255, 0.98)',
  },
  
  darkGlass: {
    light: 'rgba(17, 24, 39, 0.25)',
    medium: 'rgba(17, 24, 39, 0.4)', 
    heavy: 'rgba(17, 24, 39, 0.6)',
    solid: 'rgba(17, 24, 39, 0.9)',
  }
};

// Light theme - Clean and minimal
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: cleanColors.primary,
      light: '#4D94FF',
      dark: '#004C99',
    },
    secondary: {
      main: cleanColors.secondary,
      light: '#9F67FF',
      dark: '#5B21B6',
    },
    background: {
      default: '#F3F4F6',
      paper: 'rgba(255, 255, 255, 0.85)',
    },
    text: {
      primary: 'rgba(17, 24, 39, 0.95)',
      secondary: 'rgba(55, 65, 81, 0.8)',
    },
    success: { main: cleanColors.success },
    warning: { main: cleanColors.warning },
    error: { main: cleanColors.error },
    info: { main: cleanColors.info },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
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
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.3), rgba(124, 58, 237, 0.3))',
            borderRadius: '6px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.5), rgba(124, 58, 237, 0.5))',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            },
            '&:active': {
              background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.7), rgba(124, 58, 237, 0.7))',
            },
          },
          '&::-webkit-scrollbar-corner': {
            background: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 500,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: cleanColors.glass.medium,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: cleanColors.glass.heavy,
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: cleanColors.primary,
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            background: '#004C99',
          },
        },
        outlined: {
          border: '1px solid rgba(0, 102, 204, 0.3)',
          '&:hover': {
            background: 'rgba(0, 102, 204, 0.04)',
            border: '1px solid rgba(0, 102, 204, 0.5)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: cleanColors.glass.light,
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: cleanColors.glass.light,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          background: cleanColors.glass.medium,
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
          background: cleanColors.glass.light,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backdropFilter: 'blur(8px)',
            background: cleanColors.glass.light,
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.08)',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.16)',
            },
            '&.Mui-focused fieldset': {
              borderColor: cleanColors.primary,
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
          padding: '12px 16px',
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
  },
};

// Dark theme - Clean dark glassmorphism
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#60A5FA',
      light: '#93C5FD',
      dark: '#2563EB',
    },
    secondary: {
      main: '#A78BFA',
      light: '#C4B5FD',
      dark: '#7C3AED',
    },
    background: {
      default: '#0F172A',
      paper: cleanColors.darkGlass.light,
    },
    text: {
      primary: 'rgba(248, 250, 252, 0.95)',
      secondary: 'rgba(203, 213, 225, 0.7)',
    },
    success: { main: '#34D399' },
    warning: { main: '#FBBF24' },
    error: { main: '#F87171' },
    info: { main: '#60A5FA' },
  },
  typography: lightThemeOptions.typography,
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(17, 24, 39, 0.3)',
            borderRadius: '6px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.4), rgba(167, 139, 250, 0.4))',
            borderRadius: '6px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.6), rgba(167, 139, 250, 0.6))',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            },
            '&:active': {
              background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.8), rgba(167, 139, 250, 0.8))',
            },
          },
          '&::-webkit-scrollbar-corner': {
            background: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 500,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: cleanColors.darkGlass.light,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: cleanColors.darkGlass.medium,
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: '#60A5FA',
          color: '#0F172A',
          border: 'none',
          fontWeight: 600,
          '&:hover': {
            background: '#93C5FD',
          },
        },
        outlined: {
          border: '1px solid rgba(96, 165, 250, 0.3)',
          '&:hover': {
            background: 'rgba(96, 165, 250, 0.08)',
            border: '1px solid rgba(96, 165, 250, 0.5)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: cleanColors.darkGlass.light,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: cleanColors.darkGlass.light,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          background: cleanColors.darkGlass.medium,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
          background: cleanColors.darkGlass.light,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backdropFilter: 'blur(8px)',
            background: cleanColors.darkGlass.light,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.16)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#60A5FA',
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
          padding: '12px 16px',
          '&.Mui-selected': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
  },
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);