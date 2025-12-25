import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : process.env.NEXT_PUBLIC_APP_URL
    ? [process.env.NEXT_PUBLIC_APP_URL]
    : process.env.VERCEL_URL
      ? [`https://${process.env.VERCEL_URL}`]
      : ["http://localhost:3000"];

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  if (process.env.NODE_ENV === "development" && origin.includes("localhost")) {
    return true;
  }

  // Allow Vercel preview URLs
  if (origin.includes(".vercel.app") || origin.includes(".vercel.dev")) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    } catch {
      return origin === allowed;
    }
  });
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
