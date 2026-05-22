import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })
    
    // Clear cookie by setting maxAge to 0 and empty value
    response.cookies.set({
      name: 'admin_session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0 // Expire instantly
    })

    return response
  } catch (err) {
    console.error('Logout API error:', err)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem saat logout.' },
      { status: 500 }
    )
  }
}
