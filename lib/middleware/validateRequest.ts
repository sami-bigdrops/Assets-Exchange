import { type NextRequest, NextResponse } from "next/server";
import { type ZodSchema } from "zod";

export async function validateRequest<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }

  return { data: parsed.data };
}
