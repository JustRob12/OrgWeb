import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const { pathname } = request.nextUrl;

  // When Maintenance Mode is active (true):
  if (isMaintenanceMode) {
    // Allow static files, api routes, icons, manifest, and the maintenance page itself
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/icons") ||
      pathname.startsWith("/manifest") ||
      pathname === "/maintenance" ||
      pathname === "/favicon.ico"
    ) {
      return await createClient(request);
    }

    // Redirect all other pages to /maintenance
    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = "/maintenance";
    return NextResponse.redirect(maintenanceUrl);
  }

  // When Maintenance Mode is inactive (false) and someone tries to visit /maintenance directly:
  if (!isMaintenanceMode && pathname === "/maintenance") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return await createClient(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
