import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { sessionCookieName } from "@/lib/session-cookie";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const limit = checkRateLimit(`login:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` }, { status: 429 });
  }
  const form = Object.fromEntries(await request.formData());
  const parsed = loginSchema.safeParse(form);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  const session = await createSession(user.id);
  await prisma.auditLog.create({ data: { userId: user.id, action: "login", entity: "User", entityId: user.id } });
  resetRateLimit(`login:${ip}`);

  // A relative Location avoids redirecting to Railway's internal proxy origin.
  // Set the cookie on this response so it is guaranteed to reach the browser
  // before the redirected dashboard request.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/dashboard" }
  });
  response.cookies.set(sessionCookieName, session.rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt
  });
  return response;
}
