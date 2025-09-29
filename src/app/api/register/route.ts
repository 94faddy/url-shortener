import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Register API called')
    
    const body = await request.json()
    console.log('Received body:', body)
    
    const { name, email, password } = body

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !email || !password) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('Invalid email format')
      return NextResponse.json(
        { error: 'รูปแบบอีเมลไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      console.log('Password too short')
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      )
    }

    console.log('Checking for existing user...')
    
    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('User already exists')
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
        { status: 400 }
      )
    }

    console.log('Hashing password...')
    
    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 12)

    console.log('Creating user...')
    
    // สร้างผู้ใช้ใหม่
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    })

    console.log('User created successfully:', user)

    return NextResponse.json(
      { 
        message: 'สมัครสมาชิกสำเร็จ',
        user 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { 
        error: 'เกิดข้อผิดพลาดในระบบ: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    )
  }
}