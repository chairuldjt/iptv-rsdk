import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'

export const revalidate = 0

export async function GET() {
  try {
    const items = await prisma.entertainmentItem.findMany({
      where: {
        isActive: true,
        url: { not: null },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    })

    return NextResponse.json({
      status: true,
      message: 'Entertainment items loaded',
      data: items
        .filter((item) => item.url?.trim())
        .map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          url: item.url,
          content_type: item.contentType,
          thumbnail_url: item.thumbnailUrl,
          sort_order: item.sortOrder,
        })),
    })
  } catch (error: unknown) {
    console.error('Get entertainment items error:', error)
    return NextResponse.json(
      { status: false, message: 'Server error: ' + getErrorMessage(error) },
      { status: 500 }
    )
  }
}
