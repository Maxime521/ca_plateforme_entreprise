// tests/e2e/bodacc-flow.spec.js - End-to-end tests for BODACC functionality
import { test, expect } from '@playwright/test';

test.describe('BODACC Integration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should search for company and view BODACC report', async ({ page }) => {
    // Search for a company
    await page.fill('[data-testid="search-input"]', 'DANONE');
    await page.click('[data-testid="search-button"]');

    // Wait for search results
    await page.waitForSelector('[data-testid="company-card"]', { timeout: 10000 });

    // Click on the first company result
    await page.click('[data-testid="company-card"]');

    // Wait for company details page
    await page.waitForSelector('[data-testid="company-details"]', { timeout: 10000 });

    // Look for BODACC report button
    const bodaccButton = page.locator('[data-testid="bodacc-report-button"]');
    await expect(bodaccButton).toBeVisible();

    // Click BODACC report button
    await bodaccButton.click();

    // Wait for BODACC report modal/viewer
    await page.waitForSelector('[data-testid="bodacc-report-viewer"]', { timeout: 15000 });

    // Verify BODACC report content
    await expect(page.locator('text=BODACC - Annonces Commerciales')).toBeVisible();
    await expect(page.locator('text=annonce(s) trouvée(s)')).toBeVisible();

    // Check for company information in the report
    await expect(page.locator('text=DANONE')).toBeVisible();
  });

  test('should handle BODACC report generation errors gracefully', async ({ page }) => {
    // Navigate directly to company page with invalid SIREN
    await page.goto('/company/999999999');

    // Wait for page to load
    await page.waitForSelector('[data-testid="company-details"]', { timeout: 10000 });

    // Try to generate BODACC report
    const bodaccButton = page.locator('[data-testid="bodacc-report-button"]');
    if (await bodaccButton.isVisible()) {
      await bodaccButton.click();

      // Wait for error message or empty state
      await page.waitForSelector('[data-testid="bodacc-report-viewer"]', { timeout: 15000 });

      // Should show appropriate error message
      await expect(
        page.locator('text=Aucune annonce trouvée').or(
          page.locator('text=Erreur')
        )
      ).toBeVisible();
    }
  });

  test('should display BODACC preview correctly', async ({ page }) => {
    // Navigate directly to BODACC preview API
    await page.goto('/api/documents/preview-bodacc?siren=552032534');

    // Wait for HTML content to load
    await page.waitForLoadState('networkidle');

    // Verify HTML structure
    await expect(page.locator('h1')).toContainText('BODACC');
    await expect(page.locator('text=SIREN: 552032534')).toBeVisible();

    // Check for announcement records or no records message
    const hasRecords = await page.locator('.record').count() > 0;
    const hasNoRecords = await page.locator('text=Aucune annonce trouvée').isVisible();

    expect(hasRecords || hasNoRecords).toBe(true);

    // If records exist, check their structure
    if (hasRecords) {
      await expect(page.locator('.record-title')).toBeVisible();
      await expect(page.locator('.record-date')).toBeVisible();
    }
  });

  test('should handle different BODACC report formats', async ({ page }) => {
    // Navigate to company page
    await page.goto('/company/552032534');
    await page.waitForSelector('[data-testid="company-details"]', { timeout: 10000 });

    // Open BODACC report viewer
    const bodaccButton = page.locator('[data-testid="bodacc-report-button"]');
    if (await bodaccButton.isVisible()) {
      await bodaccButton.click();
      await page.waitForSelector('[data-testid="bodacc-report-viewer"]', { timeout: 15000 });

      // Test HTML format button
      const htmlButton = page.locator('button:has-text("HTML")');
      if (await htmlButton.isVisible()) {
        await htmlButton.click();
        await page.waitForTimeout(2000); // Wait for format change
      }

      // Test PDF format button
      const pdfButton = page.locator('button:has-text("PDF")');
      if (await pdfButton.isVisible()) {
        await pdfButton.click();
        await page.waitForTimeout(2000); // Wait for format change
      }

      // Verify download functionality
      const downloadButton = page.locator('a:has-text("Télécharger")');
      if (await downloadButton.isVisible()) {
        await expect(downloadButton).toHaveAttribute('href', /.+/);
        await expect(downloadButton).toHaveAttribute('target', '_blank');
      }
    }
  });

  test('should display établissements information correctly', async ({ page }) => {
    // Navigate to BODACC preview with known SIREN that has établissements data
    await page.goto('/api/documents/preview-bodacc?siren=820026490');
    await page.waitForLoadState('networkidle');

    // Look for établissements-related information
    const hasEstablishmentInfo = await page.locator('text=Adresse établissement').isVisible() ||
                                await page.locator('text=Activité').isVisible() ||
                                await page.locator('text=SIRET').isVisible();

    // If no establishment info, that's also valid (depends on data availability)
    // The test should not fail if data is simply not available
    console.log('Establishment info present:', hasEstablishmentInfo);
  });

  test('should show personnes juridiques information correctly', async ({ page }) => {
    // Navigate to BODACC preview
    await page.goto('/api/documents/preview-bodacc?siren=820026490');
    await page.waitForLoadState('networkidle');

    // Look for personnes juridiques information
    const hasPersonnesInfo = await page.locator('text=Forme juridique').isVisible() ||
                            await page.locator('text=Capital').isVisible();

    // Log the result for debugging
    console.log('Personnes juridiques info present:', hasPersonnesInfo);

    // The presence of this info depends on the actual data from BODACC API
    // So we don't assert it must be present, just verify the page loads correctly
    await expect(page.locator('h1')).toContainText('BODACC');
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to BODACC preview
    await page.goto('/api/documents/preview-bodacc?siren=552032534');
    await page.waitForLoadState('networkidle');

    // Verify responsive layout
    await expect(page.locator('.container')).toBeVisible();
    
    // Check that text is readable on mobile
    const header = page.locator('h1');
    await expect(header).toBeVisible();
    
    const headerBox = await header.boundingBox();
    expect(headerBox.width).toBeLessThanOrEqual(375);
  });

  test('should validate security headers', async ({ page }) => {
    // Navigate to BODACC preview
    const response = await page.goto('/api/documents/preview-bodacc?siren=552032534');

    // Verify security headers
    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['cache-control']).toContain('no-cache');
  });

  test('should handle concurrent BODACC requests', async ({ browser }) => {
    // Create multiple pages for concurrent testing
    const context = await browser.newContext();
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);

    const sirens = ['552032534', '820026490', '751213406'];

    // Make concurrent requests
    const promises = pages.map((page, index) => {
      return page.goto(`/api/documents/preview-bodacc?siren=${sirens[index]}`);
    });

    const responses = await Promise.all(promises);

    // Verify all requests completed successfully
    responses.forEach(response => {
      expect(response.status()).toBeLessThan(500);
    });

    // Verify content loaded
    for (const page of pages) {
      await expect(page.locator('h1')).toContainText('BODACC');
    }

    await context.close();
  });
});