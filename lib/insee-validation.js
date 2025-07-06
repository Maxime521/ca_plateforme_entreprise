export class INSEEValidation {
  
  /**
   * Validate SIREN number format and checksum
   */
  static validateSIREN(siren) {
    // Remove any spaces or formatting
    const cleanSiren = String(siren).replace(/\s/g, '');
    
    // Check basic format
    if (!/^\d{9}$/.test(cleanSiren)) {
      return {
        valid: false,
        error: 'SIREN must be exactly 9 digits',
        code: 'INVALID_FORMAT'
      };
    }
    
    // Check Luhn algorithm (SIREN checksum)
    if (!this.luhnCheck(cleanSiren)) {
      return {
        valid: false,
        error: 'Invalid SIREN checksum',
        code: 'INVALID_CHECKSUM'
      };
    }
    
    // Check for obvious test/invalid numbers
    const invalidPatterns = [
      /^000000000$/, // All zeros
      /^111111111$/, // All ones
      /^123456789$/, // Sequential
      /^987654321$/, // Reverse sequential
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(cleanSiren)) {
        return {
          valid: false,
          error: 'SIREN appears to be a test or invalid number',
          code: 'SUSPICIOUS_PATTERN'
        };
      }
    }
    
    return {
      valid: true,
      cleanSiren: cleanSiren
    };
  }
  
  /**
   * Validate SIRET number format and checksum
   */
  static validateSIRET(siret) {
    // Remove any spaces or formatting
    const cleanSiret = String(siret).replace(/\s/g, '');
    
    // Check basic format
    if (!/^\d{14}$/.test(cleanSiret)) {
      return {
        valid: false,
        error: 'SIRET must be exactly 14 digits',
        code: 'INVALID_FORMAT'
      };
    }
    
    // Extract SIREN from SIRET
    const siren = cleanSiret.substring(0, 9);
    const nic = cleanSiret.substring(9, 14);
    
    // Validate the SIREN part
    const sirenValidation = this.validateSIREN(siren);
    if (!sirenValidation.valid) {
      return {
        valid: false,
        error: `Invalid SIREN in SIRET: ${sirenValidation.error}`,
        code: sirenValidation.code
      };
    }
    
    // Validate NIC (establishment number) - basic checks
    if (nic === '00000') {
      return {
        valid: false,
        error: 'NIC cannot be 00000',
        code: 'INVALID_NIC'
      };
    }
    
    // Check SIRET checksum using Luhn algorithm
    if (!this.luhnCheckSIRET(cleanSiret)) {
      return {
        valid: false,
        error: 'Invalid SIRET checksum',
        code: 'INVALID_CHECKSUM'
      };
    }
    
    return {
      valid: true,
      cleanSiret: cleanSiret,
      siren: siren,
      nic: nic
    };
  }
  
  /**
   * Luhn algorithm check for SIREN
   */
  static luhnCheck(siren) {
    let sum = 0;
    let alternate = false;
    
    // Process digits from right to left
    for (let i = siren.length - 1; i >= 0; i--) {
      let digit = parseInt(siren.charAt(i), 10);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return (sum % 10) === 0;
  }
  
  /**
   * Luhn algorithm check for SIRET (modified version)
   */
  static luhnCheckSIRET(siret) {
    let sum = 0;
    let alternate = false;
    
    // Process digits from right to left
    for (let i = siret.length - 1; i >= 0; i--) {
      let digit = parseInt(siret.charAt(i), 10);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return (sum % 10) === 0;
  }
  
  /**
   * Validate batch request parameters
   */
  static validateBatchRequest(companies, options = {}) {
    const errors = [];
    
    // Check array
    if (!Array.isArray(companies)) {
      return {
        valid: false,
        errors: ['Companies must be an array']
      };
    }
    
    // Check batch size limits
    if (companies.length === 0) {
      errors.push('At least one company is required');
    }
    
    if (companies.length > 50) {
      errors.push('Maximum 50 companies per batch');
    }
    
    // Check rate limiting options
    if (options.delayMs && (options.delayMs < 100 || options.delayMs > 5000)) {
      errors.push('Delay must be between 100ms and 5000ms');
    }
    
    // Validate each company
    const invalidCompanies = [];
    const duplicateSirens = new Set();
    
    companies.forEach((company, index) => {
      const issues = [];
      
      // Check required fields
      if (!company.siren) {
        issues.push('SIREN is required');
      } else {
        // Validate SIREN
        const sirenValidation = this.validateSIREN(company.siren);
        if (!sirenValidation.valid) {
          issues.push(`SIREN: ${sirenValidation.error}`);
        }
        
        // Check for duplicates
        if (duplicateSirens.has(company.siren)) {
          issues.push('Duplicate SIREN in batch');
        } else {
          duplicateSirens.add(company.siren);
        }
      }
      
      // Validate SIRET if provided
      if (company.siret) {
        const siretValidation = this.validateSIRET(company.siret);
        if (!siretValidation.valid) {
          issues.push(`SIRET: ${siretValidation.error}`);
        }
        
        // Check if SIRET matches SIREN
        if (company.siren && siretValidation.valid && siretValidation.siren !== company.siren) {
          issues.push('SIRET does not match SIREN');
        }
      }
      
      if (issues.length > 0) {
        invalidCompanies.push({
          index: index,
          siren: company.siren,
          issues: issues
        });
      }
    });
    
    if (invalidCompanies.length > 0) {
      errors.push(`Invalid companies found: ${invalidCompanies.map(c => `#${c.index + 1} (${c.siren}): ${c.issues.join(', ')}`).join('; ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      invalidCompanies: invalidCompanies.length > 0 ? invalidCompanies : undefined,
      duplicateCount: companies.length - duplicateSirens.size
    };
  }
  
  /**
   * Sanitize filename for file system safety
   */
  static sanitizeFilename(filename) {
    // Remove or replace dangerous characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace filesystem-unsafe chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }
  
  /**
   * Rate limiting check
   */
  static checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // In a real implementation, this would use Redis or a database
    // For now, we'll use a simple in-memory store
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }
    
    // Clean old entries
    const requests = this.rateLimitStore.get(identifier) || [];
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: Math.min(...validRequests) + windowMs,
        retryAfter: Math.ceil((Math.min(...validRequests) + windowMs - now) / 1000)
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(identifier, validRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - validRequests.length
    };
  }
  
  /**
   * Format SIRET with spaces for INSEE API
   */
  static formatSIRETForAPI(siret) {
    const validation = this.validateSIRET(siret);
    if (!validation.valid) {
      throw new Error(`Invalid SIRET: ${validation.error}`);
    }
    
    const clean = validation.cleanSiret;
    return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)} ${clean.substring(9, 14)}`;
  }
  
  /**
   * Security audit log entry
   */
  static createAuditLog(action, details, userId = null, ipAddress = null) {
    return {
      timestamp: new Date().toISOString(),
      action: action,
      userId: userId,
      ipAddress: ipAddress,
      details: details,
      severity: this.getActionSeverity(action)
    };
  }
  
  /**
   * Get severity level for audit actions
   */
  static getActionSeverity(action) {
    const severityMap = {
      'INSEE_PDF_DOWNLOAD': 'INFO',
      'BATCH_DOWNLOAD_START': 'INFO',
      'BATCH_DOWNLOAD_COMPLETE': 'INFO',
      'VALIDATION_FAILED': 'WARNING',
      'RATE_LIMIT_EXCEEDED': 'WARNING',
      'SUSPICIOUS_ACTIVITY': 'ERROR',
      'AUTHENTICATION_FAILED': 'ERROR'
    };
    
    return severityMap[action] || 'INFO';
  }
}

export default INSEEValidation;