import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * A first, cheap check: without the auth cookie there is no point rendering an app page. The real
 * permission checks happen in the API on every request.
 */
export const middleware = (request: NextRequest) => {
  if (!request.cookies.get("authToken")?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/home/:path*",
    "/schedule/:path*",
    "/stock/:path*",
    "/team/:path*",
    "/notifications/:path*",
    "/profile/:path*",
  ],
};
