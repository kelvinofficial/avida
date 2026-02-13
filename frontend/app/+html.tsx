import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        
        {/* Using raw CSS text to ensure full-width rendering */}
        <style dangerouslySetInnerHTML={{ __html: responsiveStyle }} />
        
        {/* Load fonts using FontFace API to ensure they're registered before app renders */}
        <script dangerouslySetInnerHTML={{ __html: fontLoadScript }} />
        
        {/* Disable body scrolling - ScrollView handles this */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveStyle = `
  /* Load icon fonts from backend API - bypasses Metro asset serving issues */
  @font-face {
    font-family: 'ionicons';
    src: url('/api/fonts/Ionicons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'material';
    src: url('/api/fonts/MaterialIcons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'material-community';
    src: url('/api/fonts/MaterialCommunityIcons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'FontAwesome';
    src: url('/api/fonts/FontAwesome.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'FontAwesome5_Solid';
    src: url('/api/fonts/FontAwesome5_Solid.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'feather';
    src: url('/api/fonts/Feather.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  html, body, #root {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    background-color: #1A1A1A; /* Dark footer color */
  }
  
  body {
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  #root {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  
  /* Ensure full width on all devices */
  * {
    box-sizing: border-box;
  }
  
  /* Fix black rectangle focus outline on input fields */
  input, textarea, select, button {
    outline: none !important;
  }
  
  input:focus, textarea:focus, select:focus {
    outline: none !important;
    box-shadow: none !important;
  }
  
  /* React Native Web specific - remove default focus ring */
  [data-focusable="true"]:focus {
    outline: none !important;
  }
  
  /* Full-width footer styles */
  [data-footer="true"] {
    width: 100vw !important;
    position: relative !important;
    left: 50% !important;
    right: 50% !important;
    margin-left: -50vw !important;
    margin-right: -50vw !important;
  }
  
  /* Shimmer animation for skeleton loaders */
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  [data-shimmer="true"] {
    background: linear-gradient(90deg, #E0E0E0 0%, #F5F5F5 50%, #E0E0E0 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite ease-in-out;
  }
`;


// JavaScript to load fonts using the FontFace API before React renders
const fontLoadScript = `
(function() {
  const fontConfigs = [
    { name: 'ionicons', url: '/api/fonts/Ionicons.ttf' },
    { name: 'material', url: '/api/fonts/MaterialIcons.ttf' },
    { name: 'material-community', url: '/api/fonts/MaterialCommunityIcons.ttf' },
    { name: 'FontAwesome', url: '/api/fonts/FontAwesome.ttf' },
    { name: 'FontAwesome5_Solid', url: '/api/fonts/FontAwesome5_Solid.ttf' },
    { name: 'feather', url: '/api/fonts/Feather.ttf' }
  ];
  
  fontConfigs.forEach(function(config) {
    try {
      var font = new FontFace(config.name, 'url(' + config.url + ')');
      font.load().then(function(loadedFont) {
        document.fonts.add(loadedFont);
        console.log('[Font] Loaded: ' + config.name);
      }).catch(function(err) {
        console.warn('[Font] Failed to load ' + config.name + ':', err);
      });
    } catch(e) {
      console.warn('[Font] FontFace API error for ' + config.name + ':', e);
    }
  });
})();
`;

