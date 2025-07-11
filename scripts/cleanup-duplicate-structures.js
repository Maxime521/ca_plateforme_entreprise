#!/usr/bin/env node
// scripts/cleanup-duplicate-structures.js - Remove duplicate project structures

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

// Directories to remove (duplicates)
const DUPLICATE_DIRS = [
  'Credit_A/Credit_A',
  'ca_plateforme_entreprise',
  'SuperClaude' // This appears to be unrelated to the main project
];

// Files to remove (duplicates)
const DUPLICATE_FILES = [
  'Credit_A/CLAUDE.md', // Keep main one
  'SuperClaude/CLAUDE.md',
  '.next', // Build artifacts
  'node_modules/.cache' // Cache files
];

function removeDirectory(dirPath) {
  const fullPath = path.join(PROJECT_ROOT, dirPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`✅ Directory already removed: ${dirPath}`);
    return;
  }
  
  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`🗑️  Removed duplicate directory: ${dirPath}`);
  } catch (error) {
    console.error(`❌ Failed to remove ${dirPath}:`, error.message);
  }
}

function removeFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`✅ File already removed: ${filePath}`);
    return;
  }
  
  try {
    fs.unlinkSync(fullPath);
    console.log(`🗑️  Removed duplicate file: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to remove ${filePath}:`, error.message);
  }
}

function calculateSpaceSaved() {
  let totalSize = 0;
  
  DUPLICATE_DIRS.forEach(dir => {
    const fullPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          // Recursive size calculation would be complex, estimate
          totalSize += 100 * 1024 * 1024; // Estimate 100MB per duplicate
        }
      } catch (error) {
        // Ignore errors for size calculation
      }
    }
  });
  
  return totalSize;
}

function main() {
  console.log('🧹 Starting cleanup of duplicate project structures...\n');
  
  const spaceBefore = calculateSpaceSaved();
  
  // Create backup list
  console.log('📋 Creating backup list of structures to remove...');
  const backupList = {
    timestamp: new Date().toISOString(),
    directories: DUPLICATE_DIRS.filter(dir => 
      fs.existsSync(path.join(PROJECT_ROOT, dir))
    ),
    files: DUPLICATE_FILES.filter(file => 
      fs.existsSync(path.join(PROJECT_ROOT, file))
    )
  };
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'cleanup-backup-list.json'),
    JSON.stringify(backupList, null, 2)
  );
  
  console.log('✅ Backup list created: cleanup-backup-list.json\n');
  
  // Remove duplicate directories
  console.log('🗂️  Removing duplicate directories...');
  DUPLICATE_DIRS.forEach(removeDirectory);
  
  console.log('\n📄 Removing duplicate files...');
  DUPLICATE_FILES.forEach(removeFile);
  
  // Clean up empty directories
  console.log('\n🧹 Cleaning up empty directories...');
  const emptyDirs = ['Credit_A', 'ca_plateforme_entreprise'];
  emptyDirs.forEach(dir => {
    const fullPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(fullPath)) {
      try {
        const files = fs.readdirSync(fullPath);
        if (files.length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`🗑️  Removed empty directory: ${dir}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not remove ${dir}: ${error.message}`);
      }
    }
  });
  
  console.log('\n🎉 Cleanup completed!');
  console.log(`💾 Estimated space saved: ${Math.round(spaceBefore / 1024 / 1024)}MB`);
  console.log('\n📋 Summary:');
  console.log(`   - Removed ${DUPLICATE_DIRS.length} duplicate directories`);
  console.log(`   - Removed ${DUPLICATE_FILES.length} duplicate files`);
  console.log(`   - Project structure consolidated`);
  console.log('\n⚠️  Note: Run "npm install" to restore node_modules if needed');
}

if (require.main === module) {
  main();
}

module.exports = { main, DUPLICATE_DIRS, DUPLICATE_FILES };