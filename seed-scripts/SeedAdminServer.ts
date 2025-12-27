import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { user } from "../lib/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema: { user } });

async function seedAdmin() {
  const adminEmail = "admin@assets-exchange.com";
  const adminPassword = "Admin@123";
  const adminName = "Admin User";

  try {
    // eslint-disable-next-line no-console
    console.log("[APP] Starting admin seed script...");
    // eslint-disable-next-line no-console
    console.log(`[APP] Email: ${adminEmail}`);
    // eslint-disable-next-line no-console
    console.log(`[APP] Name: ${adminName}`);

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);
    // eslint-disable-next-line no-console
    console.log("[APP] ✓ User check completed");

    if (existingUser.length > 0) {
      console.warn("[APP] ⚠ Admin user already exists!");

      if (existingUser[0].role !== "admin") {
        // eslint-disable-next-line no-console
        console.log("[APP] Updating user role to admin...");
        await db
          .update(user)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
        // eslint-disable-next-line no-console
        console.log("[APP] ✓ User role updated to admin");
      } else {
        // eslint-disable-next-line no-console
        console.log("[APP] ✓ Admin user already has admin role");
      }

      // eslint-disable-next-line no-console
      console.log(
        `\nℹ️  Info\n\nAdmin user already exists!\n\nEmail: ${adminEmail}\nRole: admin\n`
      );
      return;
    }

    // eslint-disable-next-line no-console
    console.log("[APP] Creating admin user via Better Auth API...");

    const baseURL =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    // eslint-disable-next-line no-console
    console.log(`[APP] Using baseURL: ${baseURL}`);

    const signUpResponse = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
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

    // eslint-disable-next-line no-console
    console.log("[APP] User created via Better Auth, updating role to admin...");

    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, signUpResult.user.id));

    // eslint-disable-next-line no-console
    console.log("[APP] ✓ Admin user created successfully!");

    // eslint-disable-next-line no-console
    console.log(
      `\n✅ Admin User Created\n\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n\n⚠️  Please change the password after first login!\n`
    );

    // eslint-disable-next-line no-console
    console.log(`[APP] User ID: ${signUpResult.user.id}`);
    // eslint-disable-next-line no-console
    console.log(`[APP] Role: admin`);
  } catch (error) {
    console.error("[APP] ✗ Error seeding admin user:", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedAdmin();

