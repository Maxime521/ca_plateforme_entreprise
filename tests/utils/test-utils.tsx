// Test utilities for React Testing Library with custom providers
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTheme } from '../../hooks/useTheme'

// Mock theme provider for tests
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-theme="light" className="light">
      {children}
    </div>
  )
}

// Create a new QueryClient instance for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <MockThemeProvider>
        {children}
      </MockThemeProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Helper functions for common test scenarios
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
  ...overrides,
})

export const createMockCompany = (overrides = {}) => ({
  id: 'test-company-id',
  siren: '123456789',
  denomination: 'Test Company',
  active: true,
  formeJuridique: 'SARL',
  codeAPE: '6201Z',
  dateCreation: '2020-01-01',
  ...overrides,
})

export const createMockDocument = (overrides = {}) => ({
  id: 'test-document-id',
  company_id: 'test-company-id',
  type_document: 'PDF BODACC',
  source: 'BODACC',
  description: 'Test Document',
  lien_document: '/uploads/test-document.pdf',
  date_publication: '2023-01-01',
  ...overrides,
})

// Mock fetch responses
export const createMockFetchResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

// Mock API responses
export const mockApiSuccess = (data: any) => createMockFetchResponse({
  success: true,
  data,
})

export const mockApiError = (message: string, status = 500) => createMockFetchResponse({
  success: false,
  message,
}, status)

// Wait for element to appear/disappear
export const waitForElementToBeRemoved = async (element: HTMLElement) => {
  const { waitForElementToBeRemoved: originalWait } = await import('@testing-library/react')
  return originalWait(element)
}

// Custom matchers for better assertions
expect.extend({
  toHaveAccessibleName(received, expected) {
    const hasName = received.getAttribute('aria-label') === expected ||
                   received.getAttribute('aria-labelledby') ||
                   received.textContent === expected
    
    return {
      message: () => `expected element to have accessible name "${expected}"`,
      pass: hasName,
    }
  },
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAccessibleName(expected: string): R
    }
  }
}