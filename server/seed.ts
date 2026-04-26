import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { pool } from './src/db/client.js'

const tenantId = randomUUID()
const userId = randomUUID()
const passwordHash = await bcrypt.hash('Admin123!', 10)

await pool.query(`
  INSERT INTO tenants (id, name, slug, plan, plan_status, primary_color)
  VALUES ($1, $2, $3, 'pro', 'active', '#8b5cf6')
`, [tenantId, 'TireFlow Demo', 'tireflow-demo'])

await pool.query(`
  INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active)
  VALUES ($1, $2, $3, $4, $5, 'admin', true)
`, [userId, tenantId, 'Administrador', 'admin@tireflow.com', passwordHash])

console.log('✅ Seed aplicado con éxito')
console.log('   Email:  admin@tireflow.com')
console.log('   Senha:  Admin123!')
console.log('   Tenant: TireFlow Demo')

await pool.end()
