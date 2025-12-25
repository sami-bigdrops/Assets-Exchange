import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const apiUrl = process.env.BETTER_AUTH_URL || appUrl;

const connectSrc = isDevelopment
  ? `'self' ${apiUrl} ${appUrl} https://vercel.live ws://localhost:* http://localhost:*`
  : `'self' ${apiUrl} ${appUrl} https://vercel.live`;

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' ${isDevelopment ? "'unsafe-eval' 'unsafe-inline'" : "'unsafe-inline'"} https://vercel.live https://*.vercel.live`,
  `script-src-elem 'self' ${isDevelopment ? "'unsafe-inline'" : "'unsafe-inline'"} https://vercel.live https://*.vercel.live`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  "img-src 'self' data: https: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/lib/logger": false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.{jpg,jpeg,png,gif,webp,svg,ico}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
