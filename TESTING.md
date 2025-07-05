# Testing Infrastructure

This document describes the comprehensive testing setup for the Enterprise Data Platform.

## Overview

Our testing strategy includes:
- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test interactions between components
- **API Tests**: Test API endpoints and business logic
- **E2E Tests**: Test complete user workflows

## Tech Stack

- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing
- **Supabase**: Test database (separate instance)

## Test Structure

```
├── __tests__/                    # Unit tests (co-located with code)
│   ├── api/                     # API endpoint tests
│   ├── components/              # React component tests
│   ├── hooks/                   # Custom hooks tests
│   └── utils/                   # Utility function tests
├── tests/
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   └── utils/                   # Test utilities and helpers
│       ├── test-utils.tsx       # React testing utilities
│       ├── api-mocks.ts         # API mocking utilities
│       └── test-db.ts           # Test database utilities
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup and global mocks
├── playwright.config.ts         # Playwright configuration
└── .env.test                    # Test environment variables
```

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test search.test.js

# Run tests matching pattern
npm test -- --testNamePattern="search"
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm run test:e2e:headed

# Run specific E2E test
npx playwright test search-flow.spec.ts
```

### All Tests

```bash
# Run all tests (unit + E2E)
npm run test:all
```

## Writing Tests

### Unit Tests

```javascript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '../../tests/utils/test-utils'
import Button from '../../components/Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Tests

```javascript
// __tests__/api/search.test.js
import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/companies/search-v2'

describe('/api/companies/search-v2', () => {
  it('should return search results', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { q: 'carrefour' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
  })
})
```

### Integration Tests

```javascript
// tests/integration/search.test.tsx
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import SearchPage from '../../pages/search'

describe('Search Integration', () => {
  it('should perform complete search flow', async () => {
    render(<SearchPage />)
    
    const searchInput = screen.getByPlaceholderText(/recherche/i)
    fireEvent.change(searchInput, { target: { value: 'carrefour' } })
    
    const searchButton = screen.getByText(/rechercher/i)
    fireEvent.click(searchButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
    })
  })
})
```

### E2E Tests

```typescript
// tests/e2e/search-flow.spec.ts
import { test, expect } from '@playwright/test'

test('should search for companies', async ({ page }) => {
  await page.goto('/')
  
  await page.fill('input[placeholder*="recherche"]', 'carrefour')
  await page.click('button:has-text("Rechercher")')
  
  await expect(page.locator('.search-results')).toBeVisible()
})
```

## Test Utilities

### Custom Render

Use the custom render function from `tests/utils/test-utils.tsx`:

```javascript
import { render, screen } from '../../tests/utils/test-utils'
// This includes all necessary providers (QueryClient, Theme, etc.)
```

### API Mocking

```javascript
import { mockFetch, mockApiSuccess, mockApiError } from '../../tests/utils/api-mocks'

// Mock successful API response
mockFetch(mockApiSuccess({ companies: [] }))

// Mock API error
mockFetch(mockApiError('Server error'), 500)
```

### Test Database

```javascript
import { setupTestDatabase, clearTestData, createTestCompany } from '../../tests/utils/test-db'

beforeEach(async () => {
  await setupTestDatabase()
})

afterEach(async () => {
  await clearTestData()
})
```

## Best Practices

### 1. Test Structure
- Follow AAA pattern: Arrange, Act, Assert
- Use descriptive test names
- Group related tests in `describe` blocks

### 2. Mocking
- Mock external dependencies (APIs, databases)
- Use consistent mock data
- Reset mocks between tests

### 3. Assertions
- Use specific assertions (toHaveTextContent vs toBeTruthy)
- Test behavior, not implementation
- Use accessibility queries when possible

### 4. Performance
- Keep tests fast and focused
- Use `beforeEach` and `afterEach` for cleanup
- Avoid unnecessary async/await

### 5. Coverage
- Aim for 70%+ code coverage
- Focus on critical business logic
- Don't test implementation details

## Environment Setup

### Test Environment Variables

Create `.env.test` for test-specific configuration:

```bash
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
DISABLE_EXTERNAL_APIS=true
```

### Test Database

- Use a separate Supabase project for testing
- Reset database state between test runs
- Use transactions for isolated tests

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

## Debugging Tests

### Jest Debugging

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test with logs
npm test -- --verbose search.test.js
```

### Playwright Debugging

```bash
# Run with debug mode
npx playwright test --debug

# Run with trace
npx playwright test --trace on
```

## Troubleshooting

### Common Issues

1. **Module not found**: Check `moduleNameMapper` in jest.config.js
2. **Timeout errors**: Increase timeout in test files
3. **Mock issues**: Ensure mocks are reset between tests
4. **Async issues**: Use `waitFor` for async operations

### Getting Help

- Check Jest documentation: https://jestjs.io/docs/
- Check Testing Library guides: https://testing-library.com/docs/
- Check Playwright documentation: https://playwright.dev/docs/

## Examples

See the following files for implementation examples:
- `__tests__/api/search.test.js` - API testing
- `__tests__/components/DocumentCartIcon.test.tsx` - Component testing  
- `tests/integration/search.test.tsx` - Integration testing
- `tests/e2e/search-flow.spec.ts` - E2E testing