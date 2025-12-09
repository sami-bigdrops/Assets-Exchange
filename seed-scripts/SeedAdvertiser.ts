import { eq } from "drizzle-orm";

import { env } from "../env.js";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { user } from "../lib/schema";

async function seedAdvertiser() {
  const advertiserEmail =
    env.ADVERTISER_EMAIL || "advertiser@assets-exchange.com";
  const advertiserPassword = env.ADVERTISER_PASSWORD || "Advertiser@123";
  const advertiserName = env.ADVERTISER_NAME || "Advertiser User";

  try {
    logger.app.info("Starting advertiser seed script...");
    logger.app.info(`Email: ${advertiserEmail}`);
    logger.app.info(`Name: ${advertiserName}`);

    // Check if user already exists
    logger.app.info("Checking if advertiser user exists...");
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, advertiserEmail))
      .limit(1);
    logger.app.success("User check completed");

    if (existingUser.length > 0) {
      logger.app.warn("Advertiser user already exists!");

      // Update role to advertiser if not already
      if (existingUser[0].role !== "advertiser") {
        logger.app.info("Updating user role to advertiser...");
        await db
          .update(user)
          .set({ role: "advertiser", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
        logger.app.success("User role updated to advertiser");
      } else {
        logger.app.success("Advertiser user already has advertiser role");
      }

      logger.app.info(
        `\nℹ️  Info\n\nAdvertiser user already exists!\n\nEmail: ${advertiserEmail}\nRole: advertiser\n`
      );
      return;
    }

    // Create user using BetterAuth API
    logger.app.info("Creating advertiser user...");
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: advertiserEmail,
        password: advertiserPassword,
        name: advertiserName,
      },
      headers: new Headers(),
    });

    if (!signUpResult.user) {
      throw new Error("User creation failed: No user data returned");
    }

    // Update user role to advertiser
    await db
      .update(user)
      .set({ role: "advertiser", updatedAt: new Date() })
      .where(eq(user.id, signUpResult.user.id));

    logger.app.success("Advertiser user created successfully!");

    // Display success message
    logger.app.info(
      `\n✅ Advertiser User Created\n\nEmail: ${advertiserEmail}\nPassword: ${advertiserPassword}\n\n⚠️  Please change the password after first login!\n`
    );

    const result = signUpResult;
    logger.app.info(`User ID: ${result.user.id}`);
    logger.app.info(`Role: advertiser`);
  } catch (error) {
    logger.app.error("Error seeding advertiser user:", error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the seed script
seedAdvertiser();
