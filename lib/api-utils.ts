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

    if (typeof err === "object" && err !== null && "status" in err && "message" in err) {
        const status = (err as any).status;
        if (typeof status === "number" && status >= 400 && status < 600) {
            return NextResponse.json({ error: (err as any).message }, { status });
        }
    }

    return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
    );
}
