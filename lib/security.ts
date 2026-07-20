import { headers } from "next/headers";

export async function assertSameOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  if (origin && host && !origin.endsWith(host)) {
    throw new Error("Request origin rejected");
  }
}

export function publicError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && process.env.NODE_ENV !== "production") return error.message;
  return fallback;
}
