// src/app/api/profile/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db'; // Changed from 'db' to 'prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 });
    }

    // ตรวจสอบขนาดไฟล์ (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // หา user ID
    const user = await prisma.user.findUnique({ // Changed from 'db' to 'prisma'
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // สร้างชื่อไฟล์ใหม่
    const fileExtension = path.extname(file.name);
    const fileName = `avatar-${user.id}-${Date.now()}${fileExtension}`;

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadDir, { recursive: true });

    // บันทึกไฟล์
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL สำหรับเข้าถึงรูปภาพ
    const imageUrl = `/uploads/avatars/${fileName}`;

    // อัพเดท URL รูปภาพในฐานข้อมูล
    await prisma.user.update({ // Changed from 'db' to 'prisma'
      where: { email: session.user.email },
      data: { image: imageUrl }
    });

    return NextResponse.json({ 
      message: 'Avatar uploaded successfully',
      imageUrl 
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload avatar' 
    }, { status: 500 });
  }
}

// DELETE - ลบ avatar
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // อัพเดท URL รูปภาพเป็น null
    await prisma.user.update({ // Changed from 'db' to 'prisma'
      where: { email: session.user.email },
      data: { image: null }
    });

    return NextResponse.json({ 
      message: 'Avatar removed successfully' 
    });

  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to remove avatar' 
    }, { status: 500 });
  }
}