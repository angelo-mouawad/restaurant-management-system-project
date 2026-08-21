import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/home", "/schedule", "/stock"];

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("authToken")?.value);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/home/:path*", "/schedule/:path*", "/stock/:path*"],
};
