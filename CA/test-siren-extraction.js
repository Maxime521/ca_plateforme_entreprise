// test-siren-extraction.js
console.log('🧪 Testing SIREN extraction logic...\n');

// This is the actual data format from BODACC
const testData = [
  '433 926 979,433926979',  // Format: "spaced siren,clean siren" 
  '840 363 238,840363238',
  '345 130 488,345130488'
];

function extractSIREN(registre) {
  if (!registre) return '';
  
  const registreStr = String(registre);
  console.log(`🔍 Processing: "${registreStr}"`);
  
  // Method 1: Split by comma and take second part
  if (registreStr.includes(',')) {
    const parts = registreStr.split(',');
    if (parts.length > 1) {
      const siren = parts[1].trim();
      console.log(`   Found SIREN: "${siren}" (length: ${siren.length})`);
      if (siren.length === 9 && /^\d{9}$/.test(siren)) {
        console.log(`   ✅ Valid SIREN!`);
        return siren;
      }
    }
  }
  
  console.log(`   ❌ No valid SIREN found`);
  return '';
}

// Test the extraction
testData.forEach((registre, index) => {
  console.log(`Test ${index + 1}:`);
  const result = extractSIREN(registre);
  console.log(`   Final result: "${result}"\n`);
});
