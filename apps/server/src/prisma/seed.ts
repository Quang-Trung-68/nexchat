import { prisma } from '../config/prisma'

async function main() {
  console.log('[Seed] Starting database seed...')
  // TODO: Add seed data in subsequent steps
  console.log('[Seed] Done.')
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
