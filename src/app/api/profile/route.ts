// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db'; // Changed from 'db' to 'prisma'
import bcrypt from 'bcryptjs';

// GET - ดึงข้อมูล profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ // Changed from 'db' to 'prisma'
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true, // เพิ่มเพื่อตรวจสอบประเภทบัญชี
        createdAt: true,
        _count: {
          select: { urls: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // กำหนดประเภทบัญชี: ถ้ามี password = credentials, ไม่มี = oauth
    const accountType = user.password ? 'credentials' : 'oauth';

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      accountType, // เพิ่มข้อมูลประเภทบัญชี
      _count: user._count
    });
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - อัพเดท profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, image, currentPassword, newPassword } = body;

    // ตรวจสอบ user ก่อน
    const user = await prisma.user.findUnique({ // Changed from 'db' to 'prisma'
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};

    // อัพเดทชื่อ
    if (name !== undefined) {
      updateData.name = name;
    }

    // อัพเดทรูปภาพ
    if (image !== undefined) {
      updateData.image = image;
    }

    // เปลี่ยนรหัสผ่าน
    if (currentPassword && newPassword) {
      if (!user.password) {
        return NextResponse.json({ 
          error: 'Cannot change password for social login accounts' 
        }, { status: 400 });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return NextResponse.json({ 
          error: 'Current password is incorrect' 
        }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      updateData.password = hashedPassword;
    }

    // อัพเดทข้อมูล
    const updatedUser = await prisma.user.update({ // Changed from 'db' to 'prisma'
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true, // เพื่อตรวจสอบประเภทบัญชี
        createdAt: true,
        _count: {
          select: { urls: true }
        }
      }
    });

    // กำหนดประเภทบัญชี
    const accountType = updatedUser.password ? 'credentials' : 'oauth';

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      createdAt: updatedUser.createdAt,
      accountType,
      _count: updatedUser._count
    });
  } catch (error) {
    console.error('PUT /api/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}