// lib/prisma.js - Enhanced version

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  
  // 🚀 PERFORMANCE CONFIGURATION
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  
  // Connection pool settings
  // Note: SQLite doesn't use connection pooling, but good for PostgreSQL
  // __dirname + '/../prisma/connection-pool.js'
});

// 🚀 CONNECTION OPTIMIZATION
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Connection test with timeout
async function testConnection() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Database connection timeout')), 5000)
  );
  
  try {
    await Promise.race([
      prisma.$connect(),
      timeout
    ]);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();

module.exports = { prisma };
