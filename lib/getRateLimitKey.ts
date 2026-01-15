import { headers } from "next/headers"

import { auth } from "@/lib/auth"

export async function getRateLimitKey() {
    const session = await auth.api.getSession({ headers: await headers() })

    if (session?.user?.id) return `user:${session.user.id}`

    const h = await headers()
    const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        "anonymous"

    return `ip:${ip}`
}
