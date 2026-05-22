import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyPassword } from '@/lib/crypto'
import { createSessionToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan Password wajib diisi!' },
        { status: 400 }
      )
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau Password salah!' },
        { status: 401 }
      )
    }

    // Verify hashed password
    const isPasswordValid = verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Username atau Password salah!' },
        { status: 401 }
      )
    }

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role
    })

    // Set secure HTTP-only cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 1 Day
    })

    return response
  } catch (err) {
    console.error('Login API error:', err)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem internal.' },
      { status: 500 }
    )
  }
}
