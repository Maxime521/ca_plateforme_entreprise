// Unit tests for search API endpoints
import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/companies/search-v2'
import { mockSupabaseSuccess, mockSupabaseError } from '../../tests/utils/api-mocks'

// Mock the Supabase client
jest.mock('../../lib/supabase', () => ({
  createAdminClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue(Promise.resolve(mockSupabaseSuccess([]))),
    })),
  }),
}))

// Mock the INSEE API service
jest.mock('../../lib/insee-api', () => ({
  searchCompanies: jest.fn(),
}))

// Mock axios for BODACC API
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: { records: [], total_count: 0 }
  })
}))

// Mock the INSEE OAuth service
jest.mock('../../lib/insee-oauth', () => ({
  default: {
    searchCompanies: jest.fn().mockResolvedValue({ results: [] })
  }
}))

// Mock logger to avoid console noise
jest.mock('../../lib/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    apiRequest: jest.fn(),
    performance: jest.fn()
  }
}))

// Mock analytics
jest.mock('../../lib/analytics', () => ({
  serverAnalytics: {
    search: jest.fn(),
    error: jest.fn()
  }
}))

describe('/api/companies/search-v2', () => {
  // Set default timeout for all tests in this suite
  jest.setTimeout(10000)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({
      success: false,
      message: 'Method not allowed'
    })
  })

  it('should validate query parameter', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'ab' }, // Too short
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
  })

  it('should search companies successfully', async () => {
    const mockCompanies = [
      {
        siren: '652014051',
        denomination: 'CARREFOUR',
        active: true,
      }
    ]

    // Mock Supabase response
    const { createAdminClient } = require('../../lib/supabase')
    const mockClient = createAdminClient()
    mockClient.from().or().limit.mockResolvedValue(mockSupabaseSuccess(mockCompanies))

    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'carrefour' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.success).toBe(true)
    expect(responseData.results).toBeDefined()
    expect(responseData.sources).toBeDefined()
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error
    const { createAdminClient } = require('../../lib/supabase')
    const mockClient = createAdminClient()
    mockClient.from().or().limit.mockResolvedValue(mockSupabaseError('Database connection failed'))

    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'test' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200) // Should still return 200 but with errors in response
    const responseData = JSON.parse(res._getData())
    expect(responseData.success).toBe(true)
    expect(responseData.errors).toContainEqual(
      expect.objectContaining({
        source: 'local',
        type: 'DATABASE_ERROR'
      })
    )
  })

  it('should sanitize query input', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: '<script>alert("xss")</script>carrefour' },
    })

    await handler(req, res)

    const responseData = JSON.parse(res._getData())
    expect(responseData.originalQuery).toBe('<script>alert("xss")</script>carrefour')
    expect(responseData.query).toBe('scriptalert("xss")/scriptcarrefour') // Sanitized
  })

  it('should handle different search sources', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'test', source: 'local' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const responseData = JSON.parse(res._getData())
    expect(responseData.sources.local).toBeDefined()
    expect(responseData.sources.insee).toBe(0) // Should be 0 since we're only searching local
  })
})