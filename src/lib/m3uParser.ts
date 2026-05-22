import prisma from './db'

interface ParsedChannel {
  name: string
  logoUrl: string | null
  groupName: string
  streamUrl: string
}

export function parseM3UString(m3uContent: string): ParsedChannel[] {
  const lines = m3uContent.split(/\r?\n/)
  const channels: ParsedChannel[] = []

  let currentInfo: { name: string; logoUrl: string | null; groupName: string } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('#EXTM3U')) {
      continue
    }

    if (line.startsWith('#EXTINF:')) {
      // 1. Extract name (everything after the last comma)
      const commaIndex = line.lastIndexOf(',')
      let name = 'Unknown Channel'
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim()
      }

      // 2. Extract logo using regex tvg-logo="url"
      let logoUrl: string | null = null
      const logoRegex = /tvg-logo=["']([^"']+)["']/i
      const logoMatch = line.match(logoRegex)
      if (logoMatch && logoMatch[1]) {
        logoUrl = logoMatch[1].trim()
      }

      // 3. Extract group-title using regex group-title="name"
      let groupName = 'Uncategorized'
      const groupRegex = /group-title=["']([^"']+)["']/i
      const groupMatch = line.match(groupRegex)
      if (groupMatch && groupMatch[1]) {
        groupName = groupMatch[1].trim()
      }

      currentInfo = { name, logoUrl, groupName }
    } else if (line.length > 0 && !line.startsWith('#')) {
      // It's a stream URL!
      if (currentInfo) {
        channels.push({
          name: currentInfo.name,
          logoUrl: currentInfo.logoUrl,
          groupName: currentInfo.groupName,
          streamUrl: line,
        })
        currentInfo = null
      }
    }
  }

  return channels
}

export async function parseAndSavePlaylist(playlistId: number, m3uContent: string) {
  const parsedChannels = parseM3UString(m3uContent)

  if (parsedChannels.length === 0) {
    return { success: false, totalChannels: 0, message: 'No valid channels found in playlist' }
  }

  // Execute in transaction to maintain consistency
  await prisma.$transaction(async (tx) => {
    // 1. Clear existing categories and channels for this playlist to prevent duplicates/stale data
    await tx.channel.deleteMany({ where: { playlistId } })
    await tx.category.deleteMany({ where: { playlistId } })

    // 2. Get all unique group names
    const uniqueGroups = Array.from(new Set(parsedChannels.map((c) => c.groupName)))

    // 3. Save categories and keep reference of their IDs
    const categoryMap: { [key: string]: number } = {}
    for (let index = 0; index < uniqueGroups.length; index++) {
      const groupName = uniqueGroups[index]
      const createdCategory = await tx.category.create({
        data: {
          playlistId,
          name: groupName,
          sortOrder: index + 1,
          isActive: true,
        },
      })
      categoryMap[groupName] = createdCategory.id
    }

    // 4. Save channels mapped to their categories
    const channelsData = parsedChannels.map((c, index) => ({
      playlistId,
      categoryId: categoryMap[c.groupName] || null,
      name: c.name,
      logoUrl: c.logoUrl,
      streamUrl: c.streamUrl,
      sortOrder: index + 1,
      isActive: true,
    }))

    // Use createMany if supported, or split/batch insert
    // SQLite supports createMany in Prisma
    await tx.channel.createMany({
      data: channelsData,
    })

    // 5. Update playlist details
    await tx.playlist.update({
      where: { id: playlistId },
      data: {
        totalChannels: parsedChannels.length,
      },
    })
  })

  return { success: true, totalChannels: parsedChannels.length }
}
