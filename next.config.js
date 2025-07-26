/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // À n'utiliser qu'en phase de debug
  },
  typescript: {
    ignoreBuildErrors: true, // Temporaire
  }
}

module.exports = nextConfig