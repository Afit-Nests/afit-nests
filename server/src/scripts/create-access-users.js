import 'dotenv/config'
import dotenv from 'dotenv'
import path from 'path'
import bcrypt from 'bcryptjs'
import { query, pool } from '../db.js'
import { PASSWORD_REQUIREMENTS, isComplexPassword } from '../passwordPolicy.js'
import { assertPasswordNotBreached } from '../breachedPasswords.js'

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') })

const PASSWORD_COST = 12

// These seed accounts use published default emails/phones, so they must never be
// created in production where they become known-username targets.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_ACCESS_USERS !== 'true') {
  throw new Error('Refusing to seed default access accounts in production. Set ALLOW_SEED_ACCESS_USERS=true only if you truly intend to.')
}

const requiredPassword = (name) => {
  const password = process.env[name]
  if (!password) throw new Error(`${name} is required.`)
  if (!isComplexPassword(password)) throw new Error(`${name} is not complex enough. ${PASSWORD_REQUIREMENTS}`)
  return password
}

const accessUsers = [
  {
    role: 'admin',
    email: process.env.ACCESS_ADMIN_EMAIL || 'admin@afitnests.com',
    phone: process.env.ACCESS_ADMIN_PHONE || null,
    password: requiredPassword('ACCESS_ADMIN_PASSWORD'),
    fullName: process.env.ACCESS_ADMIN_NAME || 'AFIT Nests Admin',
    verified: true,
  },
  {
    role: 'landlord',
    email: process.env.ACCESS_LANDLORD_EMAIL || 'landlord_access@afitnests.com',
    phone: process.env.ACCESS_LANDLORD_PHONE || '08010000001',
    password: requiredPassword('ACCESS_LANDLORD_PASSWORD'),
    fullName: process.env.ACCESS_LANDLORD_NAME || 'AFIT Nests Landlord',
    nin: process.env.ACCESS_LANDLORD_NIN || '12345678901',
    address: process.env.ACCESS_LANDLORD_ADDRESS || 'Barkallahu, Kaduna',
    verified: true,
  },
  {
    role: 'student',
    email: process.env.ACCESS_STUDENT_EMAIL || 'student_access@afitnests.com',
    phone: process.env.ACCESS_STUDENT_PHONE || '08010000002',
    password: requiredPassword('ACCESS_STUDENT_PASSWORD'),
    fullName: process.env.ACCESS_STUDENT_NAME || 'AFIT Nests Student',
    matricNumber: process.env.ACCESS_STUDENT_MATRIC || 'AFIT/26/0001',
    department: process.env.ACCESS_STUDENT_DEPARTMENT || 'Computer Science',
    verified: true,
  },
]

try {
  for (const user of accessUsers) {
    await assertPasswordNotBreached(user.password)
    const passwordHash = await bcrypt.hash(user.password, PASSWORD_COST)
    await query(
      `INSERT INTO profiles (email, phone, password_hash, role, full_name, matric_number, department, nin, address, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE
         SET phone = EXCLUDED.phone,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             full_name = EXCLUDED.full_name,
             matric_number = EXCLUDED.matric_number,
             department = EXCLUDED.department,
             nin = EXCLUDED.nin,
             address = EXCLUDED.address,
             verified = EXCLUDED.verified,
             updated_at = now()`,
      [
        user.email.toLowerCase(),
        user.phone,
        passwordHash,
        user.role,
        user.fullName,
        user.matricNumber || null,
        user.department || null,
        user.nin || null,
        user.address || null,
        user.verified,
      ],
    )
    console.log(`${user.role} access account ready: ${user.email.toLowerCase()}${user.phone ? ` / ${user.phone}` : ''}`)
  }
} finally {
  await pool.end()
}
