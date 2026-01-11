import { PrismaClient } from "../../generated/client"
import "dotenv/config"


import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

interface GlobalPrisma {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

const globalForPrisma = global as unknown as GlobalPrisma

const pool = globalForPrisma.pool || new Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["query"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}