import React from 'react';
import { Box } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Flowing waterfall animation
const flowDown = keyframes`
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 0% 100%;
  }
`;

const shimmer = keyframes`
  0% {
    filter: hue-rotate(0deg) brightness(1);
  }
  50% {
    filter: hue-rotate(180deg) brightness(1.2);
  }
  100% {
    filter: hue-rotate(360deg) brightness(1);
  }
`;

const BackgroundContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  zIndex: -1,
  
  // Base gradient for depth
  background: theme.palette.mode === 'dark'
    ? 'radial-gradient(ellipse at center, #0a0e1a 0%, #000000 100%)'
    : 'radial-gradient(ellipse at center, #f5f5fa 0%, #e0e0e8 100%)',
    
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-100%',
    left: 0,
    right: 0,
    bottom: '-100%',
    background: `
      linear-gradient(0deg,
        #FF006E 0%,
        #8338EC 10%,
        #3A86FF 20%,
        #06FFB4 30%,
        #FFBE0B 40%,
        #FB5607 50%,
        #FF006E 60%,
        #8338EC 70%,
        #3A86FF 80%,
        #06FFB4 90%,
        #FFBE0B 100%
      )
    `,
    backgroundSize: '100% 200%',
    opacity: theme.palette.mode === 'dark' ? 0.15 : 0.08,
    animation: `${flowDown} 15s linear infinite, ${shimmer} 20s ease-in-out infinite`,
    mixBlendMode: 'normal',
  },
  
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-100%',
    left: 0,
    right: 0,
    bottom: '-100%',
    background: `
      linear-gradient(0deg,
        transparent 0%,
        rgba(0, 255, 255, 0.1) 25%,
        transparent 50%,
        rgba(255, 0, 255, 0.1) 75%,
        transparent 100%
      )
    `,
    backgroundSize: '100% 200%',
    animation: `${flowDown} 7s linear infinite`,
    animationDelay: '-3s',
  },
}));

// Additional flowing layers for depth
const FlowLayer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '-100%',
  left: 0,
  right: 0,
  bottom: '-100%',
  opacity: 0.05,
  mixBlendMode: 'normal',
}));

const flowLayer1 = keyframes`
  0% {
    transform: translateY(0) scaleY(1);
  }
  100% {
    transform: translateY(100%) scaleY(1);
  }
`;

const flowLayer2 = keyframes`
  0% {
    transform: translateY(0) scaleX(1);
  }
  100% {
    transform: translateY(100%) scaleX(1.1);
  }
`;

const FlowStream1 = styled(FlowLayer)({
  background: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 10px,
      rgba(0, 255, 255, 0.1) 10px,
      rgba(0, 255, 255, 0.1) 20px
    )
  `,
  animation: `${flowLayer1} 6s linear infinite`,
});

const FlowStream2 = styled(FlowLayer)({
  background: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 15px,
      rgba(255, 0, 255, 0.1) 15px,
      rgba(255, 0, 255, 0.1) 25px
    )
  `,
  animation: `${flowLayer2} 8s linear infinite`,
  animationDelay: '-2s',
});

const FlowStream3 = styled(FlowLayer)({
  background: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 20px,
      rgba(255, 255, 0, 0.05) 20px,
      rgba(255, 255, 0, 0.05) 30px
    )
  `,
  animation: `${flowLayer1} 9s linear infinite`,
  animationDelay: '-4s',
});

// Floating particles animation
const float = keyframes`
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 0;
  }
  10%, 90% {
    opacity: 1;
  }
  50% {
    transform: translate(30px, -100vh) rotate(180deg);
  }
`;

const floatReverse = keyframes`
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 0;
  }
  10%, 90% {
    opacity: 0.7;
  }
  50% {
    transform: translate(-50px, -100vh) rotate(-180deg);
  }
`;

// Energy pulse animation
const energyPulse = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.3;
  }
`;

// Floating particles container
const ParticleLayer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundImage: `
      radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.5), transparent),
      radial-gradient(2px 2px at 40px 70px, rgba(255, 0, 255, 0.4), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 0, 0.6), transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(0, 255, 150, 0.5), transparent),
      radial-gradient(2px 2px at 160px 30px, rgba(255, 100, 0, 0.4), transparent)
    `,
    backgroundRepeat: 'repeat',
    backgroundSize: '200px 100px',
    animation: `${float} 15s linear infinite`,
  },
  
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundImage: `
      radial-gradient(1px 1px at 60px 50px, rgba(255, 0, 100, 0.4), transparent),
      radial-gradient(2px 2px at 120px 20px, rgba(0, 150, 255, 0.5), transparent),
      radial-gradient(1px 1px at 180px 60px, rgba(150, 255, 0, 0.3), transparent)
    `,
    backgroundRepeat: 'repeat',
    backgroundSize: '250px 120px',
    animation: `${floatReverse} 18s linear infinite`,
  },
}));

// Energy nodes/pulses
const EnergyNode = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 255, 255, 0.8)' : 'rgba(0, 100, 200, 0.6)',
  boxShadow: `0 0 10px ${theme.palette.mode === 'dark' ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 100, 200, 0.3)'}`,
  animation: `${energyPulse} 3s ease-in-out infinite`,
  
  '&:nth-of-type(2)': {
    top: '20%',
    left: '15%',
    animationDelay: '-0.5s',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 0, 255, 0.8)' : 'rgba(150, 0, 200, 0.6)',
    boxShadow: `0 0 10px ${theme.palette.mode === 'dark' ? 'rgba(255, 0, 255, 0.5)' : 'rgba(150, 0, 200, 0.3)'}`,
  },
  
  '&:nth-of-type(3)': {
    top: '60%',
    right: '20%',
    animationDelay: '-1s',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 0, 0.8)' : 'rgba(200, 150, 0, 0.6)',
    boxShadow: `0 0 10px ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 0, 0.5)' : 'rgba(200, 150, 0, 0.3)'}`,
  },
  
  '&:nth-of-type(4)': {
    bottom: '25%',
    left: '70%',
    animationDelay: '-1.5s',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 255, 150, 0.8)' : 'rgba(0, 150, 100, 0.6)',
    boxShadow: `0 0 10px ${theme.palette.mode === 'dark' ? 'rgba(0, 255, 150, 0.5)' : 'rgba(0, 150, 100, 0.3)'}`,
  },
}));

export const AnimatedBackground: React.FC = () => {
  return (
    <BackgroundContainer>
      <FlowStream1 />
      <FlowStream2 />
      <FlowStream3 />
      <ParticleLayer />
      <EnergyNode sx={{ top: '40%', left: '25%' }} />
      <EnergyNode />
      <EnergyNode />
      <EnergyNode />
    </BackgroundContainer>
  );
};