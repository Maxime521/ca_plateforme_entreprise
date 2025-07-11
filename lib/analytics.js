// lib/analytics.js - User activity and analytics tracking
import logger from './logger'
import { createAdminClient } from './supabase'

class Analytics {
  constructor() {
    this.batchSize = 10
    this.eventQueue = []
    this.flushInterval = 30000 // 30 seconds
    
    // Start periodic flush
    if (typeof window === 'undefined') { // Server-side only
      setInterval(() => this.flush(), this.flushInterval)
    }
  }

  // Track user events
  track(event, properties = {}, userId = null) {
    const eventData = {
      id: this.generateEventId(),
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : properties.url,
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : properties.userAgent,
        referrer: typeof window !== 'undefined' ? document.referrer : properties.referrer,
      },
      userId,
      sessionId: this.getSessionId(),
    }

    // Add to queue
    this.eventQueue.push(eventData)

    // Log immediately for debugging
    logger.userActivity(userId, event, eventData.properties)

    // Flush if batch is full
    if (this.eventQueue.length >= this.batchSize) {
      this.flush()
    }

    return eventData.id
  }

  // Common tracking methods
  pageView(page, userId = null, properties = {}) {
    return this.track('page_view', {
      page,
      ...properties
    }, userId)
  }

  search(query, results, userId = null, properties = {}) {
    return this.track('search_performed', {
      query,
      results_count: Array.isArray(results) ? results.length : results,
      ...properties
    }, userId)
  }

  companyView(siren, userId = null, properties = {}) {
    return this.track('company_viewed', {
      siren,
      ...properties
    }, userId)
  }

  documentDownload(documentId, documentType, userId = null, properties = {}) {
    return this.track('document_downloaded', {
      document_id: documentId,
      document_type: documentType,
      ...properties
    }, userId)
  }

  userLogin(userId, method = 'email', properties = {}) {
    return this.track('user_login', {
      login_method: method,
      ...properties
    }, userId)
  }

  userLogout(userId, properties = {}) {
    return this.track('user_logout', {
      ...properties
    }, userId)
  }

  error(errorType, errorMessage, userId = null, properties = {}) {
    return this.track('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      ...properties
    }, userId)
  }

  featureUsed(feature, userId = null, properties = {}) {
    return this.track('feature_used', {
      feature,
      ...properties
    }, userId)
  }

  // Performance tracking
  performanceMetric(metric, value, userId = null, properties = {}) {
    return this.track('performance_metric', {
      metric,
      value,
      ...properties
    }, userId)
  }

  // A/B testing
  experimentView(experiment, variant, userId = null, properties = {}) {
    return this.track('experiment_viewed', {
      experiment,
      variant,
      ...properties
    }, userId)
  }

  // Business metrics
  businessEvent(eventType, value, userId = null, properties = {}) {
    return this.track('business_event', {
      event_type: eventType,
      value,
      ...properties
    }, userId)
  }

  // Flush events to storage/external services
  async flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      // Store in database
      await this.storeEvents(events)
      
      // Send to external analytics (if configured)
      await this.sendToExternalAnalytics(events)
      
    } catch (error) {
      logger.error('Analytics flush failed', { error, eventsCount: events.length })
      
      // Re-queue events on failure (with limit to prevent infinite growth)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...events)
      }
    }
  }

  async storeEvents(events) {
    try {
      const supabase = createAdminClient()
      
      const eventsToStore = events.map(event => ({
        id: event.id,
        event_type: event.event,
        user_id: event.userId,
        session_id: event.sessionId,
        properties: event.properties,
        created_at: event.properties.timestamp,
      }))

      const { error } = await supabase
        .from('analytics_events')
        .insert(eventsToStore)

      if (error) {
        // If table doesn't exist, log warning but don't fail
        if (error.code === '42P01') {
          logger.warn('Analytics table not found - analytics disabled', { 
            message: 'Create analytics_events table to enable analytics storage' 
          })
          return // Don't throw, just skip analytics
        } else {
          throw error
        }
      }

      logger.debug('Analytics events stored', { count: events.length })
      
    } catch (error) {
      logger.warn('Analytics storage failed - continuing without analytics', { error: error.message })
      // Don't throw - analytics shouldn't break the main flow
    }
  }

  async createAnalyticsTable() {
    // This would be handled by your database migration
    // For now, just log that the table should be created
    logger.warn('Analytics table not found', {
      message: 'Please create analytics_events table in your database'
    })
  }

  async sendToExternalAnalytics(events) {
    // Send to Google Analytics, Mixpanel, etc.
    if (process.env.ANALYTICS_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.ANALYTICS_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ANALYTICS_API_KEY || ''}`
          },
          body: JSON.stringify({
            events,
            source: 'enterprise-data-platform',
            timestamp: new Date().toISOString()
          })
        })

        if (!response.ok) {
          throw new Error(`Analytics webhook failed: ${response.status}`)
        }

        logger.debug('Events sent to external analytics', { count: events.length })
        
      } catch (error) {
        logger.error('Failed to send to external analytics', { error })
        // Don't re-throw - this is not critical
      }
    }
  }

  // Utility methods
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  getSessionId() {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('analytics_session_id')
      if (!sessionId) {
        sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2)}`
        sessionStorage.setItem('analytics_session_id', sessionId)
      }
      return sessionId
    }
    return null
  }

  // React hook for client-side tracking
  useAnalytics() {
    return {
      track: this.track.bind(this),
      pageView: this.pageView.bind(this),
      search: this.search.bind(this),
      companyView: this.companyView.bind(this),
      documentDownload: this.documentDownload.bind(this),
      featureUsed: this.featureUsed.bind(this),
      error: this.error.bind(this),
    }
  }
}

// Create singleton instance
const analytics = new Analytics()

export default analytics

// Server-side analytics API
export const serverAnalytics = {
  track: analytics.track.bind(analytics),
  pageView: analytics.pageView.bind(analytics),
  search: analytics.search.bind(analytics),
  companyView: analytics.companyView.bind(analytics),
  documentDownload: analytics.documentDownload.bind(analytics),
  userLogin: analytics.userLogin.bind(analytics),
  userLogout: analytics.userLogout.bind(analytics),
  error: analytics.error.bind(analytics),
  featureUsed: analytics.featureUsed.bind(analytics),
  performanceMetric: analytics.performanceMetric.bind(analytics),
  businessEvent: analytics.businessEvent.bind(analytics),
}