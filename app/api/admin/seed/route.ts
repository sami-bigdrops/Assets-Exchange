import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRateLimitKey } from "@/lib/getRateLimitKey";
import { ratelimit } from "@/lib/ratelimit";
import { user } from "@/lib/schema";

async function enforceRateLimit() {
  const key = await getRateLimitKey();
  const { success } = await ratelimit.limit(key);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
}

export async function POST() {
  try {
    const rl = await enforceRateLimit();
    if (rl) return rl;

    const adminEmail = "admin@assets-exchange.com";
    const adminPassword = "Admin@123";
    const adminName = "Admin User";

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      if (existingUser[0].role !== "admin") {
        await db
          .update(user)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
      }
      return Response.json({
        success: true,
        message: "Admin user already exists",
        user: existingUser[0],
      });
    }

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
      headers: new Headers(),
    });

    if (!signUpResult.user) {
      return Response.json(
        { success: false, error: "User creation failed" },
        { status: 500 }
      );
    }

    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, signUpResult.user.id));

    return Response.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        id: signUpResult.user.id,
        email: adminEmail,
        name: adminName,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Error seeding admin:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
