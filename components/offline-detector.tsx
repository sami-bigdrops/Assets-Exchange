"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * OfflineDetector Component
 *
 * Monitors online/offline status and redirects to /disconnected page when offline.
 * Automatically redirects back when connection is restored.
 *
 * This component should be placed in the root layout to work across all pages.
 */
export function OfflineDetector() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Pages that shouldn't redirect to disconnected page
    const publicPages = ["/disconnected", "/auth", "/unauthorized", "/"];
    const isPublicPage = publicPages.some(
      (page) => pathname === page || pathname.startsWith(page + "/")
    );

    // Don't redirect if already on disconnected page or other public pages
    if (isPublicPage) {
      return;
    }

    // Check initial online status
    if (!navigator.onLine) {
      router.push("/disconnected");
      return;
    }

    // Handle offline event
    const handleOffline = () => {
      if (!isPublicPage) {
        router.push("/disconnected");
      }
    };

    // Handle online event
    const handleOnline = () => {
      // Verify connection with a small fetch
      fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-cache",
      })
        .then((response) => {
          if (response.ok && pathname === "/disconnected") {
            // Connection restored, redirect to dashboard
            router.push("/dashboard");
            router.refresh();
          }
        })
        .catch(() => {
          // Still offline, stay on disconnected page
        });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [router, pathname]);

  return null;
}
