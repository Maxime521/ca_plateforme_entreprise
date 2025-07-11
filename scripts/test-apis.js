// scripts/test-apis.js
// Run with: node scripts/test-apis.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import INSEEAPIService from '../lib/insee-api.js';
import BODACCAPIService from '../lib/bodacc-api.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Test companies
const TEST_COMPANIES = [
  { siren: '542107651', name: 'CARREFOUR' },
  { siren: '552032534', name: 'DANONE' },
  { siren: '632007801', name: 'BNP PARIBAS' }
];

async function testINSEE() {
  console.log('\n=== TESTING INSEE API ===\n');
  
  try {
    // Test 1: Get Access Token
    console.log('1. Testing INSEE Authentication...');
    const token = await INSEEAPIService.getAccessToken();
    console.log('✅ Authentication successful!');
    console.log(`   Token (first 20 chars): ${token.substring(0, 20)}...`);
    
    // Test 2: Search Companies
    console.log('\n2. Testing Company Search...');
    const searchResults = await INSEEAPIService.searchCompanies('CARREFOUR');
    console.log(`✅ Found ${searchResults.total} results`);
    if (searchResults.results.length > 0) {
      const first = searchResults.results[0];
      console.log(`   First result: ${first.denomination} (${first.siren})`);
      console.log(`   Address: ${first.adresseSiege}`);
      console.log(`   Active: ${first.active ? 'Yes' : 'No'}`);
    }
    
    // Test 3: Get Company by SIREN
    console.log('\n3. Testing Get Company by SIREN...');
    const company = await INSEEAPIService.getCompanyBySiren(TEST_COMPANIES[0].siren);
    console.log(`✅ Company found: ${company.denomination}`);
    console.log(`   Created: ${company.dateCreation}`);
    console.log(`   Legal form: ${company.formeJuridique}`);
    console.log(`   APE Code: ${company.codeAPE}`);
    console.log(`   Employees: ${company.effectif || 'N/A'}`);
    
    // Test 4: Get Establishments
    console.log('\n4. Testing Get Establishments...');
    const establishments = await INSEEAPIService.getEstablishments(TEST_COMPANIES[0].siren);
    console.log(`✅ Found ${establishments.length} establishments`);
    if (establishments.length > 0) {
      console.log(`   First establishment: ${establishments[0].siret}`);
      console.log(`   Address: ${establishments[0].adresse}`);
    }
    
  } catch (error) {
    console.error('❌ INSEE API Error:', error.message);
  }
}

async function testBODACC() {
  console.log('\n=== TESTING BODACC API ===\n');
  
  try {
    // Test 1: Get Announcements by SIREN
    console.log('1. Testing Get Announcements by SIREN...');
    const announcements = await BODACCAPIService.getAnnouncementsBySiren(TEST_COMPANIES[0].siren);
    console.log(`✅ Found ${announcements.total} announcements`);
    if (announcements.results.length > 0) {
      const first = announcements.results[0];
      console.log(`   Most recent: ${first.typeAnnonce} - ${new Date(first.dateParution).toLocaleDateString('fr-FR')}`);
      console.log(`   Company: ${first.denomination}`);
      console.log(`   Details: ${first.details?.substring(0, 100)}...`);
    }
    
    // Test 2: Search by Name
    console.log('\n2. Testing Search by Name...');
    const searchResults = await BODACCAPIService.searchByName('CARREFOUR');
    console.log(`✅ Found ${searchResults.total} results for "CARREFOUR"`);
    
    // Test 3: Get Recent Announcements
    console.log('\n3. Testing Get Recent Announcements (last 7 days)...');
    const recent = await BODACCAPIService.getRecentAnnouncements(7);
    console.log(`✅ Found ${recent.total} announcements in the last 7 days`);
    
    // Test 4: Get Company Statistics
    console.log('\n4. Testing Get Company Statistics...');
    const stats = await BODACCAPIService.getCompanyStatistics(TEST_COMPANIES[0].siren);
    console.log(`✅ Statistics for ${TEST_COMPANIES[0].name}:`);
    stats.forEach(stat => {
      console.log(`   ${stat.type}: ${stat.count} announcements`);
    });
    
  } catch (error) {
    console.error('❌ BODACC API Error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting API Tests...');
  console.log('===================');
  
  await testINSEE();
  await testBODACC();
  
  console.log('\n===================');
  console.log('Tests completed!');
}

// Run tests
runAllTests().catch(console.error);
