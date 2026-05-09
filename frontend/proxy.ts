import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Compatibility redirect:
  // Old company URLs: `/company/:slug/*`
  // New company URLs: `/:slug/*`
  const match = pathname.match(/^\/company\/([^/]+)(\/.*)?$/);
  if (match) {
    const slug = match[1];
    const rest = match[2] ?? "";
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${rest}`;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|[\\w-]+\\.\\w+).*)"],
};
