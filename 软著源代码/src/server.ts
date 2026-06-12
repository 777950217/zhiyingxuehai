import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// Security headers applied to all responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function getSupabaseHost(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return new URL(url).hostname;
  } catch {
    return '*.supabase.co';
  }
}

function getCspHeader(): string {
  const supabaseHost = getSupabaseHost();
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.cn",
    "font-src 'self' https://fonts.gstatic.cn",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      // Inject security headers before handling request
      const originalSetHeader = res.setHeader.bind(res);
      let headersInjected = false;
      const injectSecurityHeaders = () => {
        if (headersInjected) return;
        headersInjected = true;
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          try { originalSetHeader(key, value); } catch { /* already sent */ }
        }
        try { originalSetHeader('Content-Security-Policy', getCspHeader()); } catch { /* already sent */ }
      };

      // Override writeHead to inject headers before first write
      const originalWriteHead = res.writeHead.bind(res);
      res.writeHead = (...args: unknown[]) => {
        injectSecurityHeaders();
        return originalWriteHead(...args as Parameters<typeof originalWriteHead>);
      };

      // Also hook into setHeader to detect when headers are about to be sent
      res.setHeader = (name: string, value: string | string | number) => {
        return originalSetHeader(name, value);
      };

      await handle(req, res, parsedUrl);
      // Ensure headers are injected even if writeHead wasn't called explicitly
      injectSecurityHeaders();
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
