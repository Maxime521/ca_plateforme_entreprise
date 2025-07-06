import { jest } from '@jest/globals'

// Mock Supabase client
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    then: jest.fn(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
  })),
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  rpc: jest.fn(),
}

// Mock successful Supabase responses
export const mockSupabaseSuccess = (data: any) => ({
  data,
  error: null,
  status: 200,
  statusText: 'OK',
})

export const mockSupabaseError = (message: string, code?: string) => ({
  data: null,
  error: {
    message,
    code: code || 'UNKNOWN_ERROR',
    details: null,
    hint: null,
  },
  status: 400,
  statusText: 'Bad Request',
})

// Mock INSEE API responses
export const mockINSEESearchResponse = {
  results: [
    {
      siren: '652014051',
      siret: '65201405100716',
      denomination: 'CARREFOUR',
      adresseSiege: '26 QUAI CHARLES PASQUA 92300 LEVALLOIS-PERRET',
      codeAPE: '64.20Z',
      categorieJuridique: '5599',
      formeJuridique: 'Forme 5599',
      dateCreation: '1963-01-01',
      active: false,
      effectif: '02',
      siegeSocial: false,
      libelleAPE: 'Activité 64.20Z',
    }
  ],
  total: 1,
}

// Mock BODACC API responses
export const mockBODACCSearchResponse = {
  records: [
    {
      record: {
        fields: {
          siren: '652014051',
          registre: 'RCS Paris,652014051',
          commercant: 'CARREFOUR',
          dateparution: '2023-01-01',
          typeavis: 'Modification',
          ville: 'Paris',
          cp: '75001',
          departement_nom_officiel: 'Paris',
        }
      }
    }
  ],
  total_count: 1,
}

// Mock fetch for API endpoints
export const mockFetch = (mockResponse: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(mockResponse),
    text: () => Promise.resolve(JSON.stringify(mockResponse)),
  } as Response)
}

// Mock Next.js API response helpers
export const mockNextApiRequest = (method: string, query: any = {}, body: any = {}) => ({
  method,
  query,
  body,
  headers: {},
  cookies: {},
})

export const mockNextApiResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn(),
    setHeader: jest.fn(),
  }
  return res
}

// Mock authentication states
export const mockAuthenticatedUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
}

export const mockAdminUser = {
  ...mockAuthenticatedUser,
  role: 'admin',
  email: 'admin@example.com',
}

// Helper to setup common mocks for component tests
export const setupComponentMocks = () => {
  // Mock router
  const mockPush = jest.fn()
  const mockReplace = jest.fn()
  const mockPrefetch = jest.fn()
  
  jest.mock('next/router', () => ({
    useRouter: () => ({
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: mockPush,
      replace: mockReplace,
      prefetch: mockPrefetch,
      back: jest.fn(),
      reload: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }),
  }))

  // Mock Supabase
  jest.mock('../../lib/supabase', () => ({
    createAdminClient: () => mockSupabaseClient,
    supabase: mockSupabaseClient,
  }))

  return {
    mockPush,
    mockReplace,
    mockPrefetch,
  }
}

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks()
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockClear()
  }
}