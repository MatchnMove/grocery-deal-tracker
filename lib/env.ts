import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DEFAULT_TIMEZONE: z.string().default("Pacific/Auckland"),
  DEFAULT_FUEL_PRICE_NZD: z.string().default("2.70"),
  DEFAULT_FUEL_ECONOMY_L_PER_100KM: z.string().default("7.5")
});

export function getEnv() {
  return serverEnvSchema.parse(process.env);
}

export function requireAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return secret;
}

export function requireCronSecret() {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("CRON_SECRET must be configured");
  }
  return secret;
}
