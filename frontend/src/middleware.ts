import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow homepage to be accessed without authentication
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  // Check for game-related routes
  if (request.nextUrl.pathname.startsWith('/games/')) {
    // const gameId = request.nextUrl.pathname.split('/')[2]
    const storedGame = request.cookies.get(`game_id`)

    // Allow access to join page without authentication
    if (request.nextUrl.pathname.endsWith('/join')) {
      return NextResponse.next()
    }

    // Redirect to homepage if no valid session exists
    if (!storedGame) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/games/:path*'
}
