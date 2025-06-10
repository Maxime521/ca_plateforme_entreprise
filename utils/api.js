import { cache } from './cache'

export class ApiService {
  static async fetchWithCache(url, options = {}, ttl = 300000) {
    const cacheKey = `${url}_${JSON.stringify(options)}`
    const cached = cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      cache.set(cacheKey, data, ttl)
      return data
    } catch (error) {
      console.error('API fetch error:', error)
      throw error
    }
  }

  static async searchCompanies(query) {
    return this.fetchWithCache(`/api/search?q=${encodeURIComponent(query)}`)
  }

  static async getCompanyDetails(siren) {
    return this.fetchWithCache(`/api/entreprise/${siren}`)
  }

  static async getCompanyDocuments(siren) {
    return this.fetchWithCache(`/api/rne/documents?siren=${siren}`)
  }

  static async getFinancialRatios(siren) {
    return this.fetchWithCache(`/api/ratios/${siren}`)
  }

  static async getBodaccPublications(siren) {
    return this.fetchWithCache(`/api/bodacc/search?siren=${siren}`)
  }
}
