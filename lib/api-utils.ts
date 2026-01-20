import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(err: unknown) {
  console.error("[API_ERROR]", err);

  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: err.flatten() },
      { status: 400 }
    );
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "message" in err
  ) {
    const errorWithStatus = err as { status: unknown; message: unknown };
    const status = errorWithStatus.status;
    if (typeof status === "number" && status >= 400 && status < 600) {
      const message =
        typeof errorWithStatus.message === "string"
          ? errorWithStatus.message
          : "Internal server error";
      return NextResponse.json({ error: message }, { status });
    }
  }

  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
