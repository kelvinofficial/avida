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
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/api/pwa/manifest.json" />
        <meta name="theme-color" content="#2E7D32" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LocalMarket" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        
        {/* Using raw CSS text to ensure full-width rendering */}
        <style dangerouslySetInnerHTML={{ __html: responsiveStyle }} />
        
        {/* Load fonts using FontFace API to ensure they're registered before app renders */}
        <script dangerouslySetInnerHTML={{ __html: fontLoadScript }} />
        
        {/* Register Service Worker for caching and offline support */}
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript }} />
        
        {/* Fix icon font widths on web */}
        <script dangerouslySetInnerHTML={{ __html: iconFixScript }} />
        
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
  
  /* Fix for icon fonts showing zero width on web */
  /* Target react-native-web text elements with specific computed styles */
  .css-text-146c3p1 {
    min-width: auto;
  }
  
  /* Hide scrollbar for horizontal scroll containers */
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
  
  /* Category scroll on desktop - horizontal scrolling */
  [data-categoryscroll="true"] {
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  [data-categoryscroll="true"]::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
  
  /* Force horizontal scroll on category row - target by structure */
  .r-borderBottomColor-o7c05e {
    overflow-x: auto !important;
    overflow-y: hidden !important;
  }
  
  .r-borderBottomColor-o7c05e::-webkit-scrollbar {
    display: none;
  }
  
  /* Use JavaScript to detect and fix icon elements on page load */
`;

// Add JavaScript to fix icon widths and category scroll after render
const iconFixScript = `
(function() {
  function fixIconWidths() {
    var elements = document.querySelectorAll('div, span');
    elements.forEach(function(el) {
      var style = window.getComputedStyle(el);
      var fontFamily = style.fontFamily.toLowerCase();
      if (fontFamily.includes('ionicons') || 
          fontFamily.includes('material') || 
          fontFamily.includes('fontawesome') ||
          fontFamily.includes('feather')) {
        el.style.minWidth = '1em';
        el.style.display = 'inline-block';
        el.style.textAlign = 'center';
      }
    });
  }
  
  // Fix for category row horizontal scrolling on desktop
  function fixCategoryScroll() {
    // Target the category row by looking for elements with categories
    var allDivs = document.querySelectorAll('div');
    allDivs.forEach(function(el) {
      // Check if this contains category items (has many children with small text)
      var text = el.textContent || '';
      if (text.includes('Auto & Vehicles') && 
          text.includes('Properties') && 
          text.includes('Electronics') &&
          text.includes('Friendship')) {
        // Check if overflow is needed
        if (el.scrollWidth > el.clientWidth + 20) {
          el.style.overflowX = 'auto';
          el.style.overflowY = 'hidden';
          el.style.webkitOverflowScrolling = 'touch';
          el.style.scrollbarWidth = 'none';
          el.style.msOverflowStyle = 'none';
        }
      }
    });
  }
  
  // Run fixes
  function runFixes() {
    fixIconWidths();
    fixCategoryScroll();
  }
  
  // Use MutationObserver to catch dynamic content
  var observer = new MutationObserver(function(mutations) {
    runFixes();
  });
  
  // Start observing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      runFixes();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    runFixes();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  
  // Also run periodically as a fallback
  setInterval(runFixes, 2000);
})();
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

// Service Worker registration script for caching and offline support
const serviceWorkerScript = `
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/api/pwa/sw.js', { scope: '/' })
        .then(function(registration) {
          console.log('[SW] Service Worker registered:', registration.scope);
          
          // Check for updates periodically
          registration.addEventListener('updatefound', function() {
            var newWorker = registration.installing;
            console.log('[SW] Update found, installing new version...');
            newWorker.addEventListener('statechange', function() {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version available, refresh to update');
              }
            });
          });
        })
        .catch(function(error) {
          console.warn('[SW] Service Worker registration failed:', error);
        });
    });
  }
})();
`;
