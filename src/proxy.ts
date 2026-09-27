import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

/** Sends any device without the passcode cookie to /unlock. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const unlocked = isValidSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/unlock") {
    return unlocked ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!unlocked) {
    const url = new URL("/unlock", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, the web manifest, app icons and scheduled jobs
    // (which check their own secret).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|api/cron).*)",
  ],
};
