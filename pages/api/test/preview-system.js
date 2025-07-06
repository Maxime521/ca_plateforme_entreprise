import previewCache from '../../../lib/preview-cache';
import previewLogger from '../../../lib/preview-logger';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action = 'status', siren = '552032534', siret = null } = req.query;

  try {
    switch (action) {
      case 'status':
        return await testSystemStatus(req, res);
      
      case 'cache':
        return await testCacheSystem(req, res, siren, siret);
      
      case 'preview':
        return await testPreviewGeneration(req, res, siren, siret);
      
      case 'performance':
        return await testPerformanceMetrics(req, res);
      
      case 'errors':
        return await testErrorHandling(req, res);
      
      case 'logs':
        return await testLoggingSystem(req, res);
      
      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: ['status', 'cache', 'preview', 'performance', 'errors', 'logs']
        });
    }
  } catch (error) {
    console.error('Test system error:', error);
    return res.status(500).json({
      error: 'Test system error',
      message: error.message
    });
  }
}

async function testSystemStatus(req, res) {
  const status = {
    timestamp: new Date().toISOString(),
    system: 'Document Preview System',
    version: '1.0.0',
    components: {
      previewProxy: {
        status: 'active',
        endpoint: '/api/documents/preview/[...params]'
      },
      cacheSystem: {
        status: 'active',
        stats: previewCache.getStats()
      },
      loggingSystem: {
        status: 'active',
        recentLogs: (await previewLogger.getRecentLogs(5)).length
      }
    },
    apiIntegrations: {
      inpi: {
        status: process.env.INPI_API_TOKEN ? 'configured' : 'not_configured',
        endpoint: 'https://data.inpi.fr/export/companies'
      },
      insee: {
        status: 'active',
        endpoint: 'https://api-avis-situation-sirene.insee.fr/identification/pdf'
      },
      bodacc: {
        status: 'active',
        endpoint: 'https://data.economie.gouv.fr/explore/dataset/bodacc-c'
      }
    }
  };

  return res.status(200).json(status);
}

async function testCacheSystem(req, res, siren, siret) {
  const testResults = {
    timestamp: new Date().toISOString(),
    test: 'Cache System Test',
    siren,
    siret,
    results: {}
  };

  try {
    // Test cache operations for each document type
    for (const type of ['inpi', 'insee', 'bodacc']) {
      const testData = {
        type,
        siren,
        siret,
        available: true,
        testData: `Test data for ${type}`,
        timestamp: Date.now()
      };

      // Test cache set
      await previewCache.set(type, siren, testData, siret);
      
      // Test cache get
      const cached = await previewCache.get(type, siren, siret);
      
      testResults.results[type] = {
        setOperation: 'success',
        getOperation: cached ? 'success' : 'failed',
        dataIntegrity: cached?.testData === testData.testData ? 'valid' : 'invalid',
        cached: !!cached
      };
    }

    // Test cache statistics
    testResults.cacheStats = previewCache.getStats();
    
    return res.status(200).json(testResults);
  } catch (error) {
    testResults.error = error.message;
    return res.status(500).json(testResults);
  }
}

async function testPreviewGeneration(req, res, siren, siret) {
  const testResults = {
    timestamp: new Date().toISOString(),
    test: 'Preview Generation Test',
    siren,
    siret,
    results: {}
  };

  // Test each document type
  for (const type of ['inpi', 'insee', 'bodacc']) {
    const startTime = Date.now();
    
    try {
      // Test preview URL generation
      const previewUrl = `/api/documents/preview/${type}/${siren}${siret ? `/${siret}` : ''}`;
      
      // Test HEAD request to check availability
      const response = await fetch(`${req.headers.origin || 'http://localhost:3000'}${previewUrl}`, {
        method: 'HEAD'
      });
      
      const duration = Date.now() - startTime;
      
      testResults.results[type] = {
        url: previewUrl,
        status: response.status,
        statusText: response.statusText,
        available: response.ok,
        duration: `${duration}ms`,
        contentType: response.headers.get('content-type'),
        size: response.headers.get('content-length')
      };
    } catch (error) {
      testResults.results[type] = {
        error: error.message,
        duration: `${Date.now() - startTime}ms`,
        available: false
      };
    }
  }

  return res.status(200).json(testResults);
}

async function testPerformanceMetrics(req, res) {
  const testResults = {
    timestamp: new Date().toISOString(),
    test: 'Performance Metrics Test',
    metrics: {}
  };

  try {
    // Get performance statistics
    const stats = await previewLogger.getPerformanceStats(24);
    testResults.metrics = stats;
    
    // Performance thresholds
    const thresholds = {
      maxAvgDuration: 3000, // 3 seconds
      maxErrorRate: 0.05, // 5%
      minCacheHitRate: 0.3 // 30%
    };

    // Evaluate performance
    testResults.evaluation = {
      avgDuration: {
        value: stats.avgDuration,
        threshold: thresholds.maxAvgDuration,
        status: stats.avgDuration <= thresholds.maxAvgDuration ? 'pass' : 'fail'
      },
      totalRequests: {
        value: stats.totalRequests,
        status: stats.totalRequests > 0 ? 'pass' : 'no_data'
      }
    };

    return res.status(200).json(testResults);
  } catch (error) {
    testResults.error = error.message;
    return res.status(500).json(testResults);
  }
}

async function testErrorHandling(req, res) {
  const testResults = {
    timestamp: new Date().toISOString(),
    test: 'Error Handling Test',
    results: {}
  };

  try {
    // Get error statistics
    const errorStats = await previewLogger.getErrorStats(24);
    testResults.results.errorStats = errorStats;
    
    // Test error scenarios
    const errorTests = [
      {
        name: 'Invalid SIREN',
        url: '/api/documents/preview/inpi/invalid_siren',
        expectedStatus: 400
      },
      {
        name: 'Unsupported document type',
        url: '/api/documents/preview/unknown/552032534',
        expectedStatus: 400
      },
      {
        name: 'Missing parameters',
        url: '/api/documents/preview/',
        expectedStatus: 400
      }
    ];

    for (const test of errorTests) {
      try {
        const response = await fetch(`${req.headers.origin || 'http://localhost:3000'}${test.url}`);
        testResults.results[test.name] = {
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          status: response.status === test.expectedStatus ? 'pass' : 'fail'
        };
      } catch (error) {
        testResults.results[test.name] = {
          error: error.message,
          status: 'error'
        };
      }
    }

    return res.status(200).json(testResults);
  } catch (error) {
    testResults.error = error.message;
    return res.status(500).json(testResults);
  }
}

async function testLoggingSystem(req, res) {
  const testResults = {
    timestamp: new Date().toISOString(),
    test: 'Logging System Test',
    results: {}
  };

  try {
    // Test logging operations
    await previewLogger.logOperation('test', '123456789', null, 'test_operation', {
      testData: 'This is a test log entry'
    });

    // Test error logging
    const testError = new Error('Test error for logging system');
    await previewLogger.logError('test', '123456789', null, testError, {
      testContext: 'Error logging test'
    });

    // Get recent logs
    const recentLogs = await previewLogger.getRecentLogs(10);
    const testLogs = recentLogs.filter(log => log.type === 'test');

    testResults.results = {
      operationLogging: testLogs.some(log => log.operation === 'test_operation') ? 'pass' : 'fail',
      errorLogging: testLogs.some(log => log.level === 'error') ? 'pass' : 'fail',
      recentLogsCount: recentLogs.length,
      testLogsCount: testLogs.length
    };

    return res.status(200).json(testResults);
  } catch (error) {
    testResults.error = error.message;
    return res.status(500).json(testResults);
  }
}