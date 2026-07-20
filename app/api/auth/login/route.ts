import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

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
  await createSession(user.id);
  await prisma.auditLog.create({ data: { userId: user.id, action: "login", entity: "User", entityId: user.id } });
  return NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 });
}
