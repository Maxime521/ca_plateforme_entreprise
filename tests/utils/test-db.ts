import { createClient } from '@supabase/supabase-js'

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'https://test.supabase.co'
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key'
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

// Create test Supabase client
export const createTestSupabaseClient = () => {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
}

export const createTestAdminClient = () => {
  return createClient(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY)
}

// Test data fixtures
export const testCompanies = [
  {
    siren: '652014051',
    denomination: 'CARREFOUR',
    active: true,
    forme_juridique: 'SA',
    code_ape: '64.20Z',
    date_creation: '1963-01-01',
    adresse_siege: '26 QUAI CHARLES PASQUA 92300 LEVALLOIS-PERRET',
  },
  {
    siren: '552032534',
    denomination: 'DANONE',
    active: true,
    forme_juridique: 'SA',
    code_ape: '1051C',
    date_creation: '1919-01-01',
    adresse_siege: '17 BOULEVARD HAUSSMANN 75009 PARIS',
  },
  {
    siren: '775665135',
    denomination: 'FRANCE TELECOM SA',
    active: false,
    forme_juridique: 'SA',
    code_ape: '6110Z',
    date_creation: '1988-01-01',
    adresse_siege: '78 RUE OLIVIER DE SERRES 75015 PARIS',
  }
]

export const testDocuments = [
  {
    company_id: 'test-company-1',
    type_document: 'PDF BODACC',
    source: 'BODACC',
    description: 'Publication BODACC - Modification',
    lien_document: '/uploads/bodacc_652014051_2023.pdf',
    date_publication: '2023-01-01',
    reference: 'BODACC-2023-001',
  },
  {
    company_id: 'test-company-1',
    type_document: 'PDF RAPPORT',
    source: 'MANUEL',
    description: 'Rapport financier annuel',
    lien_document: '/uploads/rapport_652014051_2023.pdf',
    date_publication: '2023-12-31',
    reference: 'RAPPORT-2023-001',
  }
]

export const testUsers = [
  {
    uid: 'test-user-1',
    email: 'user@test.com',
    display_name: 'Test User',
    role: 'user',
    created_at: '2023-01-01T00:00:00.000Z',
  },
  {
    uid: 'test-admin-1',
    email: 'admin@test.com',
    display_name: 'Test Admin',
    role: 'admin',
    created_at: '2023-01-01T00:00:00.000Z',
  }
]

// Database setup utilities
export const setupTestDatabase = async () => {
  const client = createTestAdminClient()
  
  try {
    // Clear existing test data
    await clearTestData()
    
    // Insert test companies
    const { error: companiesError } = await client
      .from('companies')
      .insert(testCompanies)
    
    if (companiesError) {
      console.warn('Test companies insert failed:', companiesError)
    }
    
    // Insert test users
    const { error: usersError } = await client
      .from('users')
      .insert(testUsers)
    
    if (usersError) {
      console.warn('Test users insert failed:', usersError)
    }
    
    // Get company IDs for documents
    const { data: companies } = await client
      .from('companies')
      .select('id, siren')
    
    if (companies && companies.length > 0) {
      // Update document company_ids with actual IDs
      const documentsWithIds = testDocuments.map(doc => ({
        ...doc,
        company_id: companies.find(c => c.siren === '652014051')?.id || doc.company_id
      }))
      
      const { error: documentsError } = await client
        .from('documents')
        .insert(documentsWithIds)
      
      if (documentsError) {
        console.warn('Test documents insert failed:', documentsError)
      }
    }
    
    console.log('Test database setup completed')
    return true
    
  } catch (error) {
    console.error('Test database setup failed:', error)
    return false
  }
}

export const clearTestData = async () => {
  const client = createTestAdminClient()
  
  try {
    // Clear in reverse order due to foreign key constraints
    await client.from('documents').delete().neq('id', '')
    await client.from('companies').delete().neq('id', '')
    await client.from('users').delete().neq('id', '')
    
    console.log('Test data cleared')
    return true
    
  } catch (error) {
    console.error('Failed to clear test data:', error)
    return false
  }
}

// Helper functions for test data management
export const createTestCompany = async (companyData = {}) => {
  const client = createTestAdminClient()
  
  const company = {
    ...testCompanies[0],
    siren: `TEST${Date.now()}`, // Unique SIREN for test
    ...companyData
  }
  
  const { data, error } = await client
    .from('companies')
    .insert(company)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create test company: ${error.message}`)
  }
  
  return data
}

export const createTestDocument = async (documentData = {}, companyId?: string) => {
  const client = createTestAdminClient()
  
  // Create company if not provided
  let actualCompanyId = companyId
  if (!actualCompanyId) {
    const company = await createTestCompany()
    actualCompanyId = company.id
  }
  
  const document = {
    ...testDocuments[0],
    company_id: actualCompanyId,
    reference: `TEST-${Date.now()}`, // Unique reference
    ...documentData
  }
  
  const { data, error } = await client
    .from('documents')
    .insert(document)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create test document: ${error.message}`)
  }
  
  return data
}

export const createTestUser = async (userData = {}) => {
  const client = createTestAdminClient()
  
  const user = {
    ...testUsers[0],
    uid: `test-${Date.now()}`, // Unique UID
    email: `test-${Date.now()}@example.com`, // Unique email
    ...userData
  }
  
  const { data, error } = await client
    .from('users')
    .insert(user)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }
  
  return data
}

// Test environment setup
export const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
}

export const getTestConfig = () => ({
  supabaseUrl: TEST_SUPABASE_URL,
  supabaseAnonKey: TEST_SUPABASE_ANON_KEY,
  supabaseServiceKey: TEST_SUPABASE_SERVICE_ROLE_KEY,
  isTest: isTestEnvironment(),
})

// Setup and teardown hooks for tests
export const setupTestSuite = async () => {
  if (isTestEnvironment()) {
    console.log('Setting up test database...')
    await setupTestDatabase()
  }
}

export const teardownTestSuite = async () => {
  if (isTestEnvironment()) {
    console.log('Cleaning up test database...')
    await clearTestData()
  }
}