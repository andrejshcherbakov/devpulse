import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const backendOrigin = process.env.DEVPULSE_BACKEND_ORIGIN?.replace(/\/$/, '');

if (backendOrigin !== undefined) {
  const parsedBackendOrigin = new URL(backendOrigin);
  const isLocalHttp =
    parsedBackendOrigin.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(parsedBackendOrigin.hostname);

  if (
    parsedBackendOrigin.href !== `${parsedBackendOrigin.origin}/` ||
    (parsedBackendOrigin.protocol !== 'https:' && !isLocalHttp)
  ) {
    throw new Error('DEVPULSE_BACKEND_ORIGIN must be an HTTPS origin without a path');
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
  },
  async rewrites() {
    if (backendOrigin === undefined) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
