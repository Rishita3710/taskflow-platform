import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details } },
    { status }
  );
}

/**
 * Wraps a route handler so every route gets consistent error
 * formatting without repeating try/catch boilerplate everywhere.
 */
export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return apiError(err.message, err.status);
  }
  if (err instanceof ZodError) {
    return apiError("Validation failed", 422, err.flatten());
  }
  if (err instanceof Error) {
    console.error("[API ERROR]", err.message);
    return apiError(
      process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
      500
    );
  }
  console.error("[API ERROR - unknown]", err);
  return apiError("Something went wrong", 500);
}
