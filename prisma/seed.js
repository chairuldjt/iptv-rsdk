/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Secure scryptSync password hashing compatible with src/lib/auth.ts
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('🌱 Seeding default administrative accounts...')

  const existingAdmin = await prisma.user.findFirst({
    where: { username: 'admin' }
  })

  if (!existingAdmin) {
    const defaultPassword = 'Nuger.27102022'
    const hashedPassword = hashPassword(defaultPassword)

    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      }
    })
    console.log(`✅ Default admin successfully created!`)
    console.log(`👤 Username: admin`)
    console.log(`🔑 Password: ${defaultPassword}`)
  } else {
    console.log('ℹ️ Admin user already exists. Seeding skipped.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
