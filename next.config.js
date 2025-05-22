/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Improve production output
  output: 'standalone',
  // Enable image optimization
  images: {
    domains: [],
  },
  // Configure API routes
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  }
}

module.exports = nextConfig 
