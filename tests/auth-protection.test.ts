import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

describe("authentication protection", () => {
  it("redirects protected routes without a session cookie", () => {
    const response = proxy(new NextRequest("https://groceries.example.test/shopping"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain("/login");
  });
});
