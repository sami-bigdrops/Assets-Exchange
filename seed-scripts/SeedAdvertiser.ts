/* eslint-disable no-console */
import "dotenv/config";

import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { env } from "../env";
import { user } from "../lib/schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema: { user } });

async function seedAdvertiser() {
  const advertiserEmail =
    env.ADVERTISER_EMAIL || "advertiser@assets-exchange.com";
  const advertiserPassword = env.ADVERTISER_PASSWORD || "Advertiser@123";
  const advertiserName = env.ADVERTISER_NAME || "Advertiser User";

  try {
    console.log("[APP] Starting advertiser seed script...");
    console.log(`[APP] Email: ${advertiserEmail}`);
    console.log(`[APP] Name: ${advertiserName}`);

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, advertiserEmail))
      .limit(1);
    console.log("[APP] ✓ User check completed");

    if (existingUser.length > 0) {
      console.warn("[APP] ⚠ Advertiser user already exists!");

      if (existingUser[0].role !== "advertiser") {
        console.log("[APP] Updating user role to advertiser...");
        await db
          .update(user)
          .set({ role: "advertiser", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
        console.log("[APP] ✓ User role updated to advertiser");
      } else {
        console.log("[APP] ✓ Advertiser user already has advertiser role");
      }

      console.log(
        `\nℹ️  Info\n\nAdvertiser user already exists!\n\nEmail: ${advertiserEmail}\nRole: advertiser\n`
      );
      return;
    }

    console.log("[APP] Creating advertiser user via Better Auth API...");

    const baseURL =
      env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000");

    console.log(`[APP] Using baseURL: ${baseURL}`);

    const signUpResponse = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: advertiserEmail,
        password: advertiserPassword,
        name: advertiserName,
      }),
    });

    if (!signUpResponse.ok) {
      const errorData = await signUpResponse.json().catch(() => ({}));
      throw new Error(
        `Signup failed: ${signUpResponse.status} ${signUpResponse.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const signUpResult = await signUpResponse.json();

    if (!signUpResult.user) {
      throw new Error("User creation failed: No user data returned");
    }

    console.log(
      "[APP] User created via Better Auth, updating role to advertiser..."
    );

    await db
      .update(user)
      .set({ role: "advertiser", updatedAt: new Date() })
      .where(eq(user.id, signUpResult.user.id));

    console.log("[APP] ✓ Advertiser user created successfully!");

    console.log(
      `\n✅ Advertiser User Created\n\nEmail: ${advertiserEmail}\nPassword: ${advertiserPassword}\n\n⚠️  Please change the password after first login!\n`
    );

    console.log(`[APP] User ID: ${signUpResult.user.id}`);
    console.log(`[APP] Role: advertiser`);
  } catch (error) {
    console.error(
      "[APP] ✗ Error seeding advertiser user:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedAdvertiser();
