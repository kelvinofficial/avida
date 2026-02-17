const fs = require('fs');
const path = require('path');

// Fix missing assets in nested @react-navigation/elements
const sourceDir = path.join(__dirname, '..', 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');
const targetDir = path.join(__dirname, '..', 'node_modules', '@react-navigation', 'native-stack', 'node_modules', '@react-navigation', 'elements', 'lib', 'module', 'assets');

try {
  if (fs.existsSync(sourceDir) && !fs.existsSync(targetDir)) {
    // Create the target directory recursively
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Copy all PNG files
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png'));
    files.forEach(file => {
      fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
    });
    
    console.log(`[fix-assets] Copied ${files.length} asset files to nested @react-navigation/elements`);
  } else {
    console.log('[fix-assets] Assets already exist or source not found, skipping');
  }
} catch (error) {
  console.log('[fix-assets] Non-critical: Could not copy assets:', error.message);
}
