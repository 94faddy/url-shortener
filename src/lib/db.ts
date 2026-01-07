import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// สร้าง Prisma Client พร้อม connection pooling และ retry settings
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // เพิ่ม datasources configuration
    datasourceUrl: process.env.DATABASE_URL,
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Utility function สำหรับ retry database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // ตรวจสอบว่าเป็น connection error หรือไม่
      const isConnectionError = 
        error.code === 'P1017' || // Server has closed the connection
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P1002' || // Database server timed out
        error.code === 'P2024' || // Timed out fetching a new connection
        error.message?.includes('Connection') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT')
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`⚠️ Database connection error (attempt ${attempt}/${maxRetries}):`, error.code || error.message)
        
        // Disconnect และ reconnect
        try {
          await prisma.$disconnect()
        } catch (disconnectError) {
          console.warn('Warning during disconnect:', disconnectError)
        }
        
        // รอก่อน retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
        continue
      }
      
      throw error
    }
  }
  
  throw lastError
}

// Utility function สำหรับ execute query พร้อม retry
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  options?: {
    maxRetries?: number
    delay?: number
    operationName?: string
  }
): Promise<T> {
  const { maxRetries = 3, delay = 1000, operationName = 'Database operation' } = options || {}
  
  return withRetry(async () => {
    try {
      return await queryFn()
    } catch (error: any) {
      console.error(`❌ ${operationName} failed:`, error.code || error.message)
      throw error
    }
  }, maxRetries, delay)
}

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected gracefully')
  } catch (error) {
    console.error('❌ Error disconnecting database:', error)
  }
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectDatabase()
  })
}