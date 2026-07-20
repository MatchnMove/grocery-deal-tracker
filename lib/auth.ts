import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { requireAuthSecret } from "./env";
import { sessionCookieName } from "./session-cookie";

function hashWithSecret(value: string) {
  return createHash("sha256").update(value).update(requireAuthSecret()).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashWithSecret(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  return { rawToken, expiresAt };
}

export async function clearSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(sessionCookieName)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { tokenHash: hashWithSecret(rawToken) } });
  }
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(sessionCookieName)?.value;
  if (!rawToken) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashWithSecret(rawToken) },
    include: { user: true }
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
