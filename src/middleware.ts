import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Bảo vệ route /stage (yêu cầu đăng nhập đội thi)
  if (request.nextUrl.pathname.startsWith("/stage")) {
    const sessionCookie = request.cookies.get("team-session");

    if (!sessionCookie) {
      // Chưa đăng nhập, chuyển đến trang đăng nhập đội thi
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Bảo vệ route /control (yêu cầu đăng nhập MC)
  // Nhưng không chặn /control/login
  if (request.nextUrl.pathname.startsWith("/control") && !request.nextUrl.pathname.startsWith("/control/login")) {
    const sessionCookie = request.cookies.get("mc-session");

    if (!sessionCookie) {
      // Chưa đăng nhập MC, chuyển đến trang đăng nhập MC
      return NextResponse.redirect(new URL("/control/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/stage/:path*", "/control/:path*"],
};

