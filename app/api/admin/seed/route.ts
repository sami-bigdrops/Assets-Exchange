import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST(_req: NextRequest) {
  try {
    const reqHeaders = await headers();

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    const authHeader = reqHeaders.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;
    const isAuthorizedScript =
      expectedSecret && authHeader === `Bearer ${expectedSecret}`;

    if (!isAuthorizedScript && (!session || session.user.role !== "admin")) {
      console.warn("Unauthorized database seed attempt blocked.");
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have permission to execute this action.",
        },
        { status: 403 }
      );
    }

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
    console.error("Seed Error:", error);
    return NextResponse.json(
      { error: "Failed to process seed request" },
      { status: 500 }
    );
  }
}
