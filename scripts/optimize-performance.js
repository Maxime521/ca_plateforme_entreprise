#!/usr/bin/env node
// scripts/optimize-performance.js - Performance optimization script

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

// Performance optimization configurations
const OPTIMIZATIONS = {
  // Remove console.log statements from production builds
  removeConsoleLog: true,
  
  // Optimize images in uploads directory
  optimizeImages: true,
  
  // Clean up temporary files
  cleanupTempFiles: true,
  
  // Optimize bundle size
  bundleOptimization: true
};

function removeConsoleStatements() {
  console.log('🔍 Removing console.log statements from components...');
  
  const componentDir = path.join(PROJECT_ROOT, 'components');
  const files = fs.readdirSync(componentDir, { recursive: true })
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(componentDir, file));
  
  let totalRemoved = 0;
  
  files.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove console.log statements (but keep console.error)
    content = content.replace(/console\.log\([^)]*\);?\n?/g, '');
    content = content.replace(/console\.warn\([^)]*\);?\n?/g, '');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      const removed = (originalContent.match(/console\.(log|warn)/g) || []).length;
      totalRemoved += removed;
      console.log(`  ✅ ${path.relative(PROJECT_ROOT, filePath)}: ${removed} statements removed`);
    }
  });
  
  console.log(`📊 Total console statements removed: ${totalRemoved}\n`);
}

function optimizeUploadsDirectory() {
  console.log('📁 Analyzing uploads directory...');
  
  const uploadsDir = path.join(PROJECT_ROOT, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('  ℹ️  No uploads directory found\n');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  let totalSize = 0;
  let largeFiles = [];
  
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    
    // Flag files larger than 1MB
    if (stats.size > 1024 * 1024) {
      largeFiles.push({
        name: file,
        size: Math.round(stats.size / 1024 / 1024 * 100) / 100
      });
    }
  });
  
  console.log(`📊 Uploads directory analysis:`);
  console.log(`  Total files: ${files.length}`);
  console.log(`  Total size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB`);
  
  if (largeFiles.length > 0) {
    console.log(`  ⚠️  Large files (>1MB):`);
    largeFiles.forEach(file => {
      console.log(`    - ${file.name}: ${file.size}MB`);
    });
    console.log(`  💡 Consider moving large files to cloud storage\n`);
  } else {
    console.log(`  ✅ No large files found\n`);
  }
}

function cleanupTempFiles() {
  console.log('🧹 Cleaning up temporary files...');
  
  const tempPatterns = [
    '.next',
    'node_modules/.cache',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '*.tmp'
  ];
  
  let cleaned = 0;
  
  tempPatterns.forEach(pattern => {
    const fullPattern = path.join(PROJECT_ROOT, pattern);
    
    try {
      if (pattern.includes('*')) {
        // Handle glob patterns (simplified)
        const dir = path.dirname(fullPattern);
        const fileName = path.basename(fullPattern);
        
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            if (fileName === '*.log' && file.endsWith('.log')) {
              fs.unlinkSync(path.join(dir, file));
              cleaned++;
            }
          });
        }
      } else {
        // Handle direct paths
        if (fs.existsSync(fullPattern)) {
          const stats = fs.statSync(fullPattern);
          if (stats.isDirectory()) {
            fs.rmSync(fullPattern, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPattern);
          }
          cleaned++;
          console.log(`  🗑️  Removed: ${pattern}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Could not remove ${pattern}: ${error.message}`);
    }
  });
  
  console.log(`📊 Temporary files cleaned: ${cleaned}\n`);
}

function analyzeBundleSize() {
  console.log('📦 Analyzing bundle size...');
  
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const deps = Object.keys(packageJson.dependencies || {});
  const devDeps = Object.keys(packageJson.devDependencies || {});
  
  console.log(`📊 Bundle analysis:`);
  console.log(`  Production dependencies: ${deps.length}`);
  console.log(`  Development dependencies: ${devDeps.length}`);
  
  // Check for potentially large dependencies
  const largeDependencies = [
    'lodash', 'moment', 'rxjs', 'core-js', 'webpack'
  ];
  
  const foundLarge = deps.filter(dep => 
    largeDependencies.some(large => dep.includes(large))
  );
  
  if (foundLarge.length > 0) {
    console.log(`  ⚠️  Potentially large dependencies:`);
    foundLarge.forEach(dep => {
      console.log(`    - ${dep} (consider tree shaking or alternatives)`);
    });
  }
  
  console.log(`\n💡 Bundle optimization recommendations:`);
  console.log(`  1. Run "npm run analyze" to see bundle composition`);
  console.log(`  2. Consider dynamic imports for large components`);
  console.log(`  3. Use tree shaking for unused code elimination`);
  console.log(`  4. Implement code splitting for better loading\n`);
}

function generateOptimizationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    optimizations: [],
    recommendations: []
  };
  
  // Check if Next.js optimization features are enabled
  const nextConfigPath = path.join(PROJECT_ROOT, 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    
    if (!nextConfig.includes('compress: true')) {
      report.recommendations.push('Enable gzip compression in next.config.js');
    }
    
    if (!nextConfig.includes('swcMinify: true')) {
      report.recommendations.push('Enable SWC minification for better performance');
    }
    
    if (nextConfig.includes('productionBrowserSourceMaps: true')) {
      report.recommendations.push('Disable source maps in production');
    }
  }
  
  // Check for performance monitoring
  const appJsPath = path.join(PROJECT_ROOT, 'pages/_app.js');
  if (fs.existsSync(appJsPath)) {
    const appContent = fs.readFileSync(appJsPath, 'utf8');
    
    if (!appContent.includes('reportWebVitals')) {
      report.recommendations.push('Add Web Vitals monitoring');
    }
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'performance-optimization-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('📋 Performance optimization report saved to: performance-optimization-report.json\n');
}

function main() {
  console.log('🚀 Starting performance optimization...\n');
  
  const startTime = Date.now();
  
  if (OPTIMIZATIONS.removeConsoleLog) {
    removeConsoleStatements();
  }
  
  if (OPTIMIZATIONS.optimizeImages) {
    optimizeUploadsDirectory();
  }
  
  if (OPTIMIZATIONS.cleanupTempFiles) {
    cleanupTempFiles();
  }
  
  if (OPTIMIZATIONS.bundleOptimization) {
    analyzeBundleSize();
  }
  
  generateOptimizationReport();
  
  const duration = Date.now() - startTime;
  console.log(`🎉 Performance optimization completed in ${duration}ms`);
  console.log('\n📋 Next steps:');
  console.log('  1. Run "npm run build" to verify optimizations');
  console.log('  2. Test application functionality');
  console.log('  3. Monitor performance metrics');
  console.log('  4. Consider implementing code splitting for large components');
}

if (require.main === module) {
  main();
}

module.exports = { 
  main, 
  removeConsoleStatements, 
  optimizeUploadsDirectory, 
  cleanupTempFiles 
};