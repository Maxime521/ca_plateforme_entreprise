import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

class PreviewCache {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache', 'previews');
    this.maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.memoryCache = new Map();
    this.maxMemoryItems = 50;
    
    // Ensure cache directory exists
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  // Generate cache key from document parameters
  generateCacheKey(type, siren, siret = null) {
    const keyData = `${type}:${siren}:${siret || 'default'}`;
    return crypto.createHash('md5').update(keyData).digest('hex');
  }

  // Get cached preview data
  async get(type, siren, siret = null) {
    const cacheKey = this.generateCacheKey(type, siren, siret);
    
    // Check memory cache first
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem && !this.isExpired(memoryItem.timestamp)) {
      console.log(`📦 Memory cache hit for ${type}/${siren}`);
      
      // Convert buffer data back to Buffer if it exists (for safety)
      const data = memoryItem.data;
      if (data.buffer && data.buffer.type === 'Buffer' && Array.isArray(data.buffer.data)) {
        data.buffer = Buffer.from(data.buffer.data);
      }
      
      return data;
    }

    // Check disk cache
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      const stat = await fs.stat(cacheFile);
      
      if (!this.isExpired(stat.mtime.getTime())) {
        const cachedData = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
        
        // Convert buffer data back to Buffer if it exists
        if (cachedData.buffer && cachedData.buffer.type === 'Buffer' && Array.isArray(cachedData.buffer.data)) {
          cachedData.buffer = Buffer.from(cachedData.buffer.data);
        }
        
        // Update memory cache
        this.setMemoryCache(cacheKey, cachedData);
        
        console.log(`💾 Disk cache hit for ${type}/${siren}`);
        return cachedData;
      } else {
        // Remove expired cache file
        await fs.unlink(cacheFile);
      }
    } catch (error) {
      // Cache miss or error reading cache
    }

    return null;
  }

  // Set cached preview data
  async set(type, siren, data, siret = null) {
    const cacheKey = this.generateCacheKey(type, siren, siret);
    const cacheData = {
      ...data,
      cachedAt: new Date().toISOString(),
      type,
      siren,
      siret
    };

    // Update memory cache
    this.setMemoryCache(cacheKey, cacheData);

    // Update disk cache
    try {
      const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached preview for ${type}/${siren}`);
    } catch (error) {
      console.error('Failed to write cache file:', error);
    }
  }

  // Set memory cache with LRU eviction
  setMemoryCache(key, data) {
    // Remove if already exists to update position
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
    }

    // Add new item
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Evict oldest items if over limit
    if (this.memoryCache.size > this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
  }

  // Check if cache item is expired
  isExpired(timestamp) {
    return Date.now() - timestamp > this.maxAge;
  }

  // Clear all cache
  async clear() {
    this.memoryCache.clear();
    
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.cacheDir, file)))
      );
      console.log('🧹 Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Clean expired cache files
  async cleanExpired() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        
        if (this.isExpired(stat.mtime.getTime())) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} expired cache files`);
      }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.maxMemoryItems,
      maxAge: this.maxAge,
      cacheDir: this.cacheDir
    };
  }

  // Preload document preview
  async preload(type, siren, siret = null) {
    const cached = await this.get(type, siren, siret);
    if (cached) {
      return cached;
    }

    // Generate preview data based on type
    let previewData = null;
    
    switch (type) {
      case 'inpi':
        previewData = await this.generateINPIPreview(siren);
        break;
      case 'insee':
        previewData = await this.generateINSEEPreview(siren, siret);
        break;
      case 'bodacc':
        previewData = await this.generateBODACCPreview(siren);
        break;
      default:
        return null;
    }

    if (previewData) {
      await this.set(type, siren, previewData, siret);
    }

    return previewData;
  }

  // Generate INPI preview metadata
  async generateINPIPreview(siren) {
    const inpiToken = process.env.INPI_API_TOKEN;
    if (!inpiToken) {
      return null;
    }

    const url = `https://data.inpi.fr/export/companies?format=pdf&ids=[%22${siren}%22]&est=all`;
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${inpiToken}`,
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      if (response.ok) {
        return {
          url: `/api/documents/preview/inpi/${siren}`,
          contentType: response.headers.get('content-type') || 'application/pdf',
          size: response.headers.get('content-length'),
          available: true,
          lastModified: response.headers.get('last-modified')
        };
      }
    } catch (error) {
      console.error('INPI preview generation failed:', error);
    }

    return null;
  }

  // Generate INSEE preview metadata
  async generateINSEEPreview(siren, siret) {
    const targetSIRET = siret || `${siren}00001`;
    const formattedSIRET = this.formatSIRETWithSpaces(targetSIRET);
    const url = `https://api-avis-situation-sirene.insee.fr/identification/pdf/${formattedSIRET}`;
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Accept': 'application/pdf',
          'User-Agent': 'DataCorp-Platform/1.0'
        }
      });

      if (response.ok) {
        return {
          url: `/api/documents/preview/insee/${siren}/${siret || ''}`,
          contentType: response.headers.get('content-type') || 'application/pdf',
          size: response.headers.get('content-length'),
          available: true,
          lastModified: response.headers.get('last-modified')
        };
      }
    } catch (error) {
      console.error('INSEE preview generation failed:', error);
    }

    return null;
  }

  // Generate BODACC preview metadata
  async generateBODACCPreview(siren) {
    const url = `https://data.economie.gouv.fr/explore/dataset/bodacc-c/table/?refine.siren=${siren}`;
    
    return {
      url: url,
      contentType: 'text/html',
      available: true,
      external: true
    };
  }

  // Format SIRET with spaces
  formatSIRETWithSpaces(siret) {
    if (!siret || siret.length !== 14) {
      throw new Error('SIRET must be exactly 14 digits');
    }
    
    const cleanSiret = siret.replace(/\s/g, '');
    return `${cleanSiret.substring(0, 3)} ${cleanSiret.substring(3, 6)} ${cleanSiret.substring(6, 9)} ${cleanSiret.substring(9, 14)}`;
  }
}

// Export singleton instance
export default new PreviewCache();

// Background job to clean expired cache every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cache = new PreviewCache();
    cache.cleanExpired();
  }, 10 * 60 * 1000);
}