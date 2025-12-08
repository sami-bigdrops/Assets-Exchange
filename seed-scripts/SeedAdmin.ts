// Load environment variables FIRST before any imports
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Now import modules that depend on environment variables
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { user } from "../lib/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  // Default admin credentials (can be overridden via environment variables)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@assets-exchange.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const adminName = process.env.ADMIN_NAME || "Admin User";

  try {
    console.log("🌱 Starting admin seed script...");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Name: ${adminName}`);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("⚠️  Admin user already exists!");
      
      // Update role to admin if not already
      if (existingUser[0].role !== "admin") {
        await db
          .update(user)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
        console.log("✅ Updated existing user role to admin");
      } else {
        console.log("✅ Admin user already has admin role");
      }
      return;
    }

    // Create user using BetterAuth API
    const result = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
      headers: new Headers(),
    });

    if (!result.user) {
      throw new Error("User creation failed: No user data returned");
    }

    // Update user role to admin
    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, result.user.id));

    console.log("✅ Admin user created successfully!");
    console.log(`🆔 User ID: ${result.user.id}`);
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Name: ${adminName}`);
    console.log(`🔑 Role: admin`);
    console.log("\n📝 Login credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("\n⚠️  Please change the password after first login!");

  } catch (error) {
    console.error("❌ Error seeding admin user:", error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the seed script
seedAdmin();

