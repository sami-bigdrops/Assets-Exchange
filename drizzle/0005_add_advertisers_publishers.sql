
CREATE TABLE IF NOT EXISTS "advertisers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "publishers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
