/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        source: '/api/documents/preview/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=300'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self';"
          }
        ]
      },
      {
        source: '/api/documents/download/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=300'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; frame-ancestors 'self';"
          }
        ]
      },
      {
        source: '/api/((?!documents).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; frame-ancestors 'none';"
          }
        ]
      }
    ];
  },
  
  // Add rewrites to route /uploads/* to the file serving API
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-file/:path*',
      },
    ];
  },
};

module.exports = nextConfig;