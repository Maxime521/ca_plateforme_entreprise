import { promises as fs } from 'fs';
import path from 'path';

class PreviewLogger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'preview-operations.log');
    this.errorFile = path.join(this.logDir, 'preview-errors.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    
    // Ensure log directory exists
    this.ensureLogDir();
  }

  async ensureLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  // Log preview operation
  async logOperation(type, siren, siret, operation, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      siren,
      siret,
      operation,
      details,
      level: 'info'
    };

    await this.writeLog(this.logFile, logEntry);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📄 ${operation}: ${type}/${siren}${siret ? `/${siret}` : ''}`, details);
    }
  }

  // Log preview error
  async logError(type, siren, siret, error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type,
      siren,
      siret,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      level: 'error'
    };

    await this.writeLog(this.errorFile, errorEntry);
    
    // Also log to console
    console.error(`❌ Preview error: ${type}/${siren}${siret ? `/${siret}` : ''}`, error.message);
  }

  // Log cache operations
  async logCacheOperation(operation, type, siren, siret, hit = false) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: `cache_${operation}`,
      type,
      siren,
      siret,
      hit,
      level: 'debug'
    };

    await this.writeLog(this.logFile, logEntry);
  }

  // Log performance metrics
  async logPerformance(type, siren, siret, duration, size = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: 'performance',
      type,
      siren,
      siret,
      duration,
      size,
      level: 'info'
    };

    await this.writeLog(this.logFile, logEntry);
  }

  // Write log entry to file
  async writeLog(file, entry) {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(file, logLine);
      
      // Check if log rotation is needed
      await this.rotateLogIfNeeded(file);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // Rotate logs if they exceed maximum size
  async rotateLogIfNeeded(file) {
    try {
      const stats = await fs.stat(file);
      
      if (stats.size > this.maxLogSize) {
        await this.rotateLog(file);
      }
    } catch (error) {
      // File doesn't exist or other error, ignore
    }
  }

  // Rotate log file
  async rotateLog(file) {
    try {
      const baseName = path.basename(file, '.log');
      const dir = path.dirname(file);
      
      // Move existing numbered logs up
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}.log`);
        const newFile = path.join(dir, `${baseName}.${i + 1}.log`);
        
        try {
          await fs.rename(oldFile, newFile);
        } catch (error) {
          // File doesn't exist, continue
        }
      }
      
      // Move current log to .1
      const archivedFile = path.join(dir, `${baseName}.1.log`);
      await fs.rename(file, archivedFile);
      
      console.log(`📄 Log rotated: ${file}`);
    } catch (error) {
      console.error('Failed to rotate log:', error);
    }
  }

  // Get recent log entries
  async getRecentLogs(limit = 100, level = null) {
    try {
      const content = await fs.readFile(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      
      let logs = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return null;
          }
        })
        .filter(log => log !== null);
      
      if (level) {
        logs = logs.filter(log => log.level === level);
      }
      
      return logs.reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  // Get error statistics
  async getErrorStats(hours = 24) {
    try {
      const logs = await this.getRecentLogs(1000, 'error');
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const recentErrors = logs.filter(log => new Date(log.timestamp) > cutoff);
      
      const stats = {
        totalErrors: recentErrors.length,
        errorsByType: {},
        errorsByOperation: {},
        recentErrors: recentErrors.slice(0, 10)
      };
      
      recentErrors.forEach(log => {
        stats.errorsByType[log.type] = (stats.errorsByType[log.type] || 0) + 1;
        stats.errorsByOperation[log.operation] = (stats.errorsByOperation[log.operation] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return { totalErrors: 0, errorsByType: {}, errorsByOperation: {}, recentErrors: [] };
    }
  }

  // Get performance statistics
  async getPerformanceStats(hours = 24) {
    try {
      const logs = await this.getRecentLogs(1000, 'info');
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const performanceLogs = logs.filter(log => 
        log.operation === 'performance' && new Date(log.timestamp) > cutoff
      );
      
      if (performanceLogs.length === 0) {
        return { avgDuration: 0, totalRequests: 0, performanceByType: {} };
      }
      
      const stats = {
        totalRequests: performanceLogs.length,
        avgDuration: performanceLogs.reduce((sum, log) => sum + log.duration, 0) / performanceLogs.length,
        performanceByType: {}
      };
      
      performanceLogs.forEach(log => {
        if (!stats.performanceByType[log.type]) {
          stats.performanceByType[log.type] = {
            count: 0,
            totalDuration: 0,
            avgDuration: 0
          };
        }
        
        stats.performanceByType[log.type].count++;
        stats.performanceByType[log.type].totalDuration += log.duration;
        stats.performanceByType[log.type].avgDuration = 
          stats.performanceByType[log.type].totalDuration / stats.performanceByType[log.type].count;
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      return { avgDuration: 0, totalRequests: 0, performanceByType: {} };
    }
  }

  // Clean old logs
  async cleanOldLogs(days = 30) {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const files = await fs.readdir(this.logDir);
      
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoff) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} old log files`);
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}

// Export singleton instance
export default new PreviewLogger();

// Background job to clean old logs daily
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const logger = new PreviewLogger();
    logger.cleanOldLogs();
  }, 24 * 60 * 60 * 1000); // Daily
}