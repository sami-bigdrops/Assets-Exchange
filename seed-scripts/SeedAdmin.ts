import { eq } from "drizzle-orm";

import { env } from "../env.js";
import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { user } from "../lib/schema";

async function seedAdmin() {
  const adminEmail = env.ADMIN_EMAIL || "admin@assets-exchange.com";
  const adminPassword = env.ADMIN_PASSWORD || "Admin@123";
  const adminName = env.ADMIN_NAME || "Admin User";

  try {
    logger.app.info("Starting admin seed script...");
    logger.app.info(`Email: ${adminEmail}`);
    logger.app.info(`Name: ${adminName}`);

    // Check if user already exists
    logger.app.info("Checking if admin user exists...");
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);
    logger.app.success("User check completed");

    if (existingUser.length > 0) {
      logger.app.warn("Admin user already exists!");

      // Update role to admin if not already
      if (existingUser[0].role !== "admin") {
        logger.app.info("Updating user role to admin...");
        await db
          .update(user)
          .set({ role: "admin", updatedAt: new Date() })
          .where(eq(user.id, existingUser[0].id));
        logger.app.success("User role updated to admin");
      } else {
        logger.app.success("Admin user already has admin role");
      }

      logger.app.info(
        `\nℹ️  Info\n\nAdmin user already exists!\n\nEmail: ${adminEmail}\nRole: admin\n`
      );
      return;
    }

    // Create user using BetterAuth API
    logger.app.info("Creating admin user...");
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
      headers: new Headers(),
    });

    if (!signUpResult.user) {
      throw new Error("User creation failed: No user data returned");
    }

    // Update user role to admin
    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, signUpResult.user.id));

    logger.app.success("Admin user created successfully!");

    // Display success message
    logger.app.info(
      `\n✅ Admin User Created\n\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n\n⚠️  Please change the password after first login!\n`
    );

    const result = signUpResult;
    logger.app.info(`User ID: ${result.user.id}`);
    logger.app.info(`Role: admin`);
  } catch (error) {
    logger.app.error("Error seeding admin user:", error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the seed script
seedAdmin();
