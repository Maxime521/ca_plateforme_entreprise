import { test, expect } from '@playwright/test'

test.describe('Company Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the search page
    await page.goto('/')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('should search for companies and display results', async ({ page }) => {
    // Find the search input (might be on home page or search page)
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await expect(searchInput).toBeVisible()

    // Enter search query
    await searchInput.fill('carrefour')
    
    // Find and click search button
    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    // Wait for search results to load
    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Check that results are displayed
    const resultsContainer = page.locator('[data-testid="search-results"], .search-results, .company-results').first()
    await expect(resultsContainer).toBeVisible()

    // Check for company cards or result items
    const companyResults = page.locator('.company-card, .search-result, [data-testid="company-result"]')
    await expect(companyResults.first()).toBeVisible()

    // Verify SIREN numbers are displayed
    await expect(page.locator('text=/\\d{9}/')).toBeVisible()
  })

  test('should handle search with SIREN number', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('652014051') // CARREFOUR SIREN

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    // Wait for results
    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Should find CARREFOUR
    await expect(page.locator('text=CARREFOUR')).toBeVisible()
    await expect(page.locator('text=652014051')).toBeVisible()
  })

  test('should display different data sources', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('carrefour')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Check for source indicators (INSEE, BODACC, etc.)
    const sourceIndicators = page.locator('.source-badge, [data-source], text=/INSEE|BODACC/i')
    await expect(sourceIndicators.first()).toBeVisible()
  })

  test('should open company details', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('652014051')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Click on the first company result
    const firstCompany = page.locator('.company-card, .search-result, [data-testid="company-result"]').first()
    await firstCompany.click()

    // Should navigate to company details or open modal
    await expect(
      page.locator('.company-details, .modal, [data-testid="company-modal"]').first()
    ).toBeVisible()
  })

  test('should handle empty search results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('nonexistentcompany12345')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Should show no results message
    await expect(
      page.locator('text=/aucun résultat|no results|pas de résultats/i')
    ).toBeVisible()
  })

  test('should show loading state during search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('carrefour')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    
    // Click and immediately check for loading state
    await searchButton.click()
    
    // Should show loading indicator
    await expect(
      page.locator('.loading, .spinner, text=/recherche/i, text=/loading/i').first()
    ).toBeVisible()
  })

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('carrefour')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Results should be visible on mobile
    const resultsContainer = page.locator('[data-testid="search-results"], .search-results, .company-results').first()
    await expect(resultsContainer).toBeVisible()
  })

  test('should handle navigation between search and results', async ({ page }) => {
    // Perform search
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('carrefour')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    await page.waitForResponse(response => 
      response.url().includes('/api/companies/search') && response.status() === 200
    )

    // Navigate to company details
    const firstResult = page.locator('.company-card, .search-result').first()
    await firstResult.click()

    // Go back to search results
    await page.goBack()

    // Search results should still be visible
    await expect(firstResult).toBeVisible()
  })

  test('should persist search query in URL', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="recherche" i], input[placeholder*="search" i]').first()
    await searchInput.fill('carrefour')

    const searchButton = page.locator('button:has-text("Rechercher"), button:has-text("Search")').first()
    await searchButton.click()

    // URL should contain search parameters
    await expect(page).toHaveURL(/[?&]q=carrefour/)
  })
})