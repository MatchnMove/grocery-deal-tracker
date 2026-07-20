import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "./lib/session-cookie";

const protectedPrefixes = ["/dashboard", "/shopping", "/meals", "/prices", "/stores", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/shopping/:path*", "/meals/:path*", "/prices/:path*", "/stores/:path*", "/settings/:path*"]
};
