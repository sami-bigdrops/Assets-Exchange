import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const getAllowedOrigins = (): string[] => {
  const origins = new Set<string>();

  if (process.env.CORS_ALLOWED_ORIGINS) {
    process.env.CORS_ALLOWED_ORIGINS.split(",").forEach((origin) =>
      origins.add(origin.trim())
    );
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.add(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.BETTER_AUTH_URL) {
    origins.add(process.env.BETTER_AUTH_URL);
  }

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  // Always allow production domains
  origins.add("https://assetsexchange.net");
  origins.add("https://www.assetsexchange.net");

  return Array.from(origins);
};

const allowedOrigins = getAllowedOrigins();

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const hostname = originUrl.hostname;

    // 1. Specific Vercel preview URL pattern for this project
    // This allows preview deployments and branch URLs for the assets-exchange project
    // It's much more secure than allowing all of *.vercel.app
    if (
      (hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel.dev")) &&
      hostname.startsWith("assets-exchange")
    ) {
      return true;
    }

    // 2. Allow production subdomains (safely)
    if (
      hostname === "assetsexchange.net" ||
      hostname.endsWith(".assetsexchange.net")
    ) {
      return true;
    }

    // 3. Check against explicit allowed origins (includes localhost in dev)
    return allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      } catch {
        return origin === allowed;
      }
    });
  } catch {
    // If URL parsing fails, fall back to simple string comparison
    return allowedOrigins.includes(origin);
  }
};

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  if (isApiRoute) {
    const response = NextResponse.next();

    if (isAllowedOrigin(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: response.headers,
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
