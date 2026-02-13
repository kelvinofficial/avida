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
        
        {/* Disable body scrolling - ScrollView handles this */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveStyle = `
  /* Load icon fonts from CDN as fallback for bundled fonts */
  @font-face {
    font-family: 'ionicons';
    src: url('https://unpkg.com/ionicons@7.1.0/dist/fonts/ionicons.woff2') format('woff2'),
         url('https://unpkg.com/ionicons@7.1.0/dist/fonts/ionicons.woff') format('woff'),
         url('https://unpkg.com/ionicons@7.1.0/dist/fonts/ionicons.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'Material Icons';
    font-style: normal;
    font-weight: 400;
    src: url('https://fonts.gstatic.com/s/materialicons/v142/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2') format('woff2');
  }
  
  @font-face {
    font-family: 'material';
    font-style: normal;
    font-weight: 400;
    src: url('https://fonts.gstatic.com/s/materialicons/v142/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2') format('woff2');
  }
  
  @font-face {
    font-family: 'Material Design Icons';
    src: url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/fonts/materialdesignicons-webfont.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'material-community';
    src: url('https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/fonts/materialdesignicons-webfont.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'FontAwesome';
    src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  
  @font-face {
    font-family: 'feather';
    src: url('https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/feather-sprite.svg');
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
`;
