// Load environment variables FIRST before any imports
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Now import modules that depend on environment variables
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { user } from "../lib/schema";
import { eq } from "drizzle-orm";

async function seedAdvertiser() {
  // Default advertiser credentials (can be overridden via environment variables)
  const advertiserEmail = process.env.ADVERTISER_EMAIL || "advertiser@assets-exchange.com";
  const advertiserPassword = process.env.ADVERTISER_PASSWORD || "Advertiser@123";
  const advertiserName = process.env.ADVERTISER_NAME || "Advertiser User";

  try {
    console.log("🌱 Starting advertiser seed script...");
    console.log(`📧 Email: ${advertiserEmail}`);
    console.log(`👤 Name: ${advertiserName}`);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, advertiserEmail))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("⚠️  Advertiser user already exists!");
      
      // Update role to admin if not already
      if (existingUser[0].role !== "advertiser") {
        await db
          .update(user)
          .set({ role: "advertiser", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
        console.log("✅ Updated existing user role to advertiser");
      } else {
        console.log("✅ Advertiser user already has advertiser role");
      }
      return;
    }

    // Create user using BetterAuth API
    const result = await auth.api.signUpEmail({
      body: {
        email: advertiserEmail,
        password: advertiserPassword,
        name: advertiserName,
      },
      headers: new Headers(),
    });

    if (!result.user) {
      throw new Error("User creation failed: No user data returned");
    }

    // Update user role to admin
    await db
      .update(user)
      .set({ role: "advertiser", updatedAt: new Date() })
      .where(eq(user.id, result.user.id));

    console.log("✅ Advertiser user created successfully!");
    console.log(`🆔 User ID: ${result.user.id}`);
    console.log(`📧 Email: ${advertiserEmail}`);
    console.log(`👤 Name: ${advertiserName}`);
    console.log(`🔑 Role: advertiser`);
    console.log("\n📝 Login credentials:");
    console.log(`   Email: ${advertiserEmail}`);
    console.log(`   Password: ${advertiserPassword}`);
    console.log("\n⚠️  Please change the password after first login!");

  } catch (error) {
    console.error("❌ Error seeding advertiser user:", error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the seed script
seedAdvertiser();

