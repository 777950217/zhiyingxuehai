import type { NextConfig } from 'next';

const supabaseHost = process.env.COZE_SUPABASE_URL
  ? new URL(process.env.COZE_SUPABASE_URL).hostname
  : '*.supabase.co';

const cozeDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT
  ? new URL('https://' + process.env.COZE_PROJECT_DOMAIN_DEFAULT).hostname
  : '*.dev.coze.site';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.COZE_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.COZE_SUPABASE_ANON_KEY || '',
  },
  // 图片优化
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // 压缩
  compress: true,
  // 生产优化
  poweredByHeader: false,
  reactStrictMode: false, // 严格模式会导致double render，关闭提升性能
  // 大型包拆分
  experimental: {
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://${cozeDomain}`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.cn`,
              `font-src 'self' https://fonts.gstatic.cn`,
              `img-src 'self' data: blob: https:`,
              `connect-src 'self' https://${supabaseHost} https://${cozeDomain} https://api.coze.cn https://*.supabase.co wss://*.supabase.co`,
              `frame-ancestors 'none'`,
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // 静态资源长期缓存
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // API短缓存
      {
        source: '/api/dashboard',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=30, stale-while-revalidate=60' },
        ],
      },
      {
        source: '/api/auth/profile',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=10, stale-while-revalidate=30' },
        ],
      },
    ];
  },
};

export default nextConfig;
