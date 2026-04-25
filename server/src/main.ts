import 'dotenv/config'
import { buildApp } from './app.js'
import { checkConnection } from './db/client.js'

const PORT = parseInt(process.env.PORT || '3001')
const HOST = process.env.HOST || '0.0.0.0'

async function start() {
  console.log('🚀 TireFlow Server starting...')

  // Check DB connection
  try {
    await checkConnection()
    console.log('✅ Database connected')
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    console.warn('⚠️  Running without database (mock mode)')
  }

  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`\n🎯 TireFlow API running at http://localhost:${PORT}`)
    console.log(`📋 Health check: http://localhost:${PORT}/health`)
    console.log(`\nEndpoints:`)
    console.log(`  POST  /api/v1/auth/login`)
    console.log(`  POST  /api/v1/auth/register`)
    console.log(`  GET   /api/v1/products`)
    console.log(`  POST  /api/v1/sales`)
    console.log(`  GET   /api/v1/clients`)
    console.log(`  POST  /api/v1/payments/subscription/pix`)
    console.log(`  POST  /api/v1/nfe/emit/:saleId`)
    console.log(`  POST  /api/v1/whatsapp/webhook`)
    console.log(`  POST  /api/v1/ai/chat`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  const app = await buildApp()
  await app.close()
  process.exit(0)
})

start()
