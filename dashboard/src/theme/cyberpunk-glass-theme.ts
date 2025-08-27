import { createTheme, ThemeOptions } from '@mui/material/styles';

// Hybrid Liquid Glass + Neon Cyberpunk color system
const neonCyberColors = {
  // Primary neon colors
  neonCyan: '#00FFFF',
  neonMagenta: '#FF00FF', 
  neonPink: '#FF10F0',
  neonLime: '#39FF14',
  neonOrange: '#FF6600',
  neonYellow: '#FFFF00',
  neonPurple: '#9D00FF',
  
  // Apple glass colors
  iosBlue: '#007AFF',
  iosGreen: '#34C759',
  iosRed: '#FF3B30',
  
  // Glass overlays
  glass: {
    white: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.3)',
    blur: 'rgba(255, 255, 255, 0.05)',
  }
};

// Add global CSS for neon animations
const globalStyles = `
  @keyframes neonPulse {
    0%, 100% {
      text-shadow: 
        0 0 5px currentColor,
        0 0 10px currentColor,
        0 0 15px currentColor,
        0 0 20px currentColor;
    }
    50% {
      text-shadow: 
        0 0 10px currentColor,
        0 0 20px currentColor,
        0 0 30px currentColor,
        0 0 40px currentColor;
    }
  }
  
  @keyframes neonBorder {
    0%, 100% {
      box-shadow: 
        0 0 5px var(--neon-color, #00FFFF),
        0 0 10px var(--neon-color, #00FFFF),
        inset 0 0 5px rgba(255, 255, 255, 0.1);
    }
    50% {
      box-shadow: 
        0 0 10px var(--neon-color, #00FFFF),
        0 0 20px var(--neon-color, #00FFFF),
        0 0 30px var(--neon-color, #00FFFF),
        inset 0 0 10px rgba(255, 255, 255, 0.2);
    }
  }
  
  @keyframes glitchEffect {
    0%, 100% { transform: translate(0); filter: hue-rotate(0deg); }
    20% { transform: translate(-1px, 1px); filter: hue-rotate(90deg); }
    40% { transform: translate(-1px, -1px); filter: hue-rotate(180deg); }
    60% { transform: translate(1px, 1px); filter: hue-rotate(270deg); }
    80% { transform: translate(1px, -1px); filter: hue-rotate(360deg); }
  }
`;

// Light theme - Glass with subtle neon accents
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: neonCyberColors.neonCyan,
      light: '#66FFFF',
      dark: '#00CCCC',
    },
    secondary: {
      main: neonCyberColors.neonMagenta,
      light: '#FF66FF',
      dark: '#CC00CC',
    },
    background: {
      default: 'rgba(242, 242, 247, 0.8)',
      paper: 'rgba(255, 255, 255, 0.6)',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    success: { main: neonCyberColors.neonLime },
    warning: { main: neonCyberColors.neonOrange },
    error: { main: neonCyberColors.neonPink },
  },
  typography: {
    fontFamily: '"Orbitron", "JetBrains Mono", -apple-system, monospace',
    h1: { fontWeight: 900, letterSpacing: '0.02em', textTransform: 'uppercase' },
    h2: { fontWeight: 800, letterSpacing: '0.01em', textTransform: 'uppercase' },
    h3: { fontWeight: 700, letterSpacing: '0.01em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    button: { fontWeight: 700, letterSpacing: '0.05em' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: globalStyles,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          backdropFilter: 'blur(20px)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          border: `1px solid ${neonCyberColors.neonCyan}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '--neon-color': neonCyberColors.neonCyan,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${neonCyberColors.neonCyan}40, transparent)`,
            transition: 'left 0.5s',
          },
          '&:hover': {
            transform: 'translateY(-2px)',
            animation: 'neonBorder 1s ease-in-out',
            '&::before': {
              left: '100%',
            },
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${neonCyberColors.neonCyan}, ${neonCyberColors.neonMagenta})`,
          border: 'none',
          color: '#FFFFFF',
          fontWeight: 700,
          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
          border: `1px solid ${neonCyberColors.glass.white}`,
          boxShadow: `
            0 8px 32px 0 rgba(31, 38, 135, 0.15),
            0 0 20px ${neonCyberColors.neonCyan}20
          `,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${neonCyberColors.neonCyan}, transparent)`,
            animation: 'slideGradient 3s linear infinite',
          },
        },
      },
    },
  },
};

// Dark theme - Full cyberpunk neon with glass
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: neonCyberColors.neonCyan,
      light: '#66FFFF',
      dark: '#00CCCC',
    },
    secondary: {
      main: neonCyberColors.neonMagenta,
      light: '#FF66FF',
      dark: '#CC00CC',
    },
    background: {
      default: 'rgba(10, 10, 10, 0.9)',
      paper: 'rgba(20, 20, 30, 0.6)',
    },
    text: {
      primary: neonCyberColors.neonCyan,
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    success: { main: neonCyberColors.neonLime },
    warning: { main: neonCyberColors.neonOrange },
    error: { main: neonCyberColors.neonPink },
  },
  typography: lightThemeOptions.typography,
  shape: {
    borderRadius: 8, // Slightly harder edges for cyberpunk
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: globalStyles,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '12px 24px',
          backdropFilter: 'blur(20px)',
          background: 'rgba(0, 255, 255, 0.05)',
          border: `2px solid ${neonCyberColors.neonCyan}`,
          color: neonCyberColors.neonCyan,
          position: 'relative',
          overflow: 'hidden',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          transition: 'all 0.3s ease',
          '--neon-color': neonCyberColors.neonCyan,
          animation: 'neonBorder 2s ease-in-out infinite',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, ${neonCyberColors.neonCyan}20, transparent)`,
            transform: 'translateX(-100%)',
            transition: 'transform 0.3s',
          },
          '&:hover': {
            transform: 'translateY(-2px) scale(1.02)',
            textShadow: `0 0 20px ${neonCyberColors.neonCyan}`,
            '&::before': {
              transform: 'translateX(0)',
            },
          },
          '&:active': {
            animation: 'glitchEffect 0.3s',
          },
        },
        contained: {
          background: `linear-gradient(45deg, ${neonCyberColors.neonCyan}, ${neonCyberColors.neonMagenta})`,
          border: 'none',
          color: '#000000',
          fontWeight: 900,
          boxShadow: `
            0 0 20px ${neonCyberColors.neonCyan}50,
            0 0 40px ${neonCyberColors.neonMagenta}30,
            inset 0 0 20px rgba(255, 255, 255, 0.2)
          `,
          '&:hover': {
            background: `linear-gradient(45deg, ${neonCyberColors.neonMagenta}, ${neonCyberColors.neonPink})`,
            boxShadow: `
              0 0 30px ${neonCyberColors.neonMagenta}70,
              0 0 60px ${neonCyberColors.neonPink}40,
              inset 0 0 30px rgba(255, 255, 255, 0.3)
            `,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          background: 'linear-gradient(135deg, rgba(20,20,30,0.7) 0%, rgba(10,10,20,0.5) 100%)',
          border: `2px solid ${neonCyberColors.neonCyan}`,
          boxShadow: `
            0 8px 32px 0 rgba(0, 0, 0, 0.5),
            0 0 30px ${neonCyberColors.neonCyan}30,
            0 0 60px ${neonCyberColors.neonMagenta}10,
            inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
          `,
          position: 'relative',
          overflow: 'visible',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            background: `linear-gradient(45deg, ${neonCyberColors.neonCyan}, ${neonCyberColors.neonMagenta}, ${neonCyberColors.neonPink})`,
            borderRadius: 12,
            opacity: 0.5,
            filter: 'blur(10px)',
            zIndex: -1,
            animation: 'neonPulse 3s ease-in-out infinite',
          },
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `
              0 12px 40px 0 rgba(0, 0, 0, 0.6),
              0 0 40px ${neonCyberColors.neonCyan}40,
              0 0 80px ${neonCyberColors.neonMagenta}20
            `,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(20px) saturate(200%)',
          WebkitBackdropFilter: 'blur(20px) saturate(200%)',
          background: 'rgba(10, 10, 20, 0.8)',
          borderBottom: `2px solid ${neonCyberColors.neonCyan}`,
          boxShadow: `0 0 30px ${neonCyberColors.neonCyan}20`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backdropFilter: 'blur(10px)',
          background: 'rgba(0, 255, 255, 0.1)',
          border: `1px solid ${neonCyberColors.neonCyan}`,
          color: neonCyberColors.neonCyan,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          '&:hover': {
            background: 'rgba(0, 255, 255, 0.2)',
            boxShadow: `0 0 15px ${neonCyberColors.neonCyan}`,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backdropFilter: 'blur(10px)',
            background: 'rgba(0, 255, 255, 0.02)',
            '& fieldset': {
              borderWidth: '2px',
              borderColor: `${neonCyberColors.neonCyan}40`,
            },
            '&:hover fieldset': {
              borderColor: `${neonCyberColors.neonCyan}80`,
            },
            '&.Mui-focused fieldset': {
              borderColor: neonCyberColors.neonCyan,
              boxShadow: `0 0 20px ${neonCyberColors.neonCyan}40`,
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          margin: '0 4px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.6)',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: `rgba(0, 255, 255, 0.1)`,
            color: neonCyberColors.neonCyan,
          },
          '&.Mui-selected': {
            background: `rgba(0, 255, 255, 0.15)`,
            color: neonCyberColors.neonCyan,
            textShadow: `0 0 10px ${neonCyberColors.neonCyan}`,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          overflow: 'visible',
        },
        bar: {
          borderRadius: 4,
          background: `linear-gradient(90deg, ${neonCyberColors.neonCyan}, ${neonCyberColors.neonMagenta}, ${neonCyberColors.neonPink})`,
          boxShadow: `0 0 10px currentColor`,
        },
      },
    },
  },
};

// Add custom animations keyframe
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideGradient {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
}

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);