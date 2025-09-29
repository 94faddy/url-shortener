'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { formatDate } from '@/lib/utils'

// Custom toast function
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const notification = document.createElement('div')
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
    type === 'success' 
      ? 'bg-emerald-500 text-white' 
      : 'bg-red-500 text-white'
  }`
  notification.textContent = message
  document.body.appendChild(notification)
  setTimeout(() => {
    notification.remove()
  }, 3000)
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  accountType: 'credentials' | 'oauth'; // เพิ่มบรรทัดนี้
  _count: {
    urls: number;
  };
}

interface UserStats {
  totalUrls: number;
  totalClicks: number;
  joinedDate: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  
  // States
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats>({
    totalUrls: 0,
    totalClicks: 0,
    joinedDate: ''
  })
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [activeTab, setActiveTab] = useState('general')

  // แก้ไขการตรวจสอบประเภทบัญชี
  const isGoogleUser = profile?.accountType === 'oauth'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchProfile()
      fetchUserStats()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          name: data.name || '',
          email: data.email || ''
        })
      } else {
        showToast('ไม่สามารถดึงข้อมูลโปรไฟล์ได้', 'error')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์', 'error')
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/analytics')
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalUrls: data.totalUrls || 0,
          totalClicks: data.totalClicks || 0,
          joinedDate: formatDate(new Date(profile?.createdAt || session?.user?.createdAt || new Date()))
        })
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        showToast('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPEG, PNG, WebP เท่านั้น)', 'error')
        return
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        showToast('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error')
        return
      }

      setProfileImage(file)
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      setErrors({ ...errors, image: '' })
    }
  }

  const handleUploadImage = async () => {
    if (!profileImage) return null

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('avatar', profileImage)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.imageUrl
      } else {
        const error = await response.json()
        showToast(error.error || 'ไม่สามารถอัพโหลดรูปโปรไฟล์ได้', 'error')
        return null
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('ไม่สามารถอัพโหลดรูปโปรไฟล์ได้', 'error')
      return null
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      })

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, image: null } : null)
        setPreviewImage(null)
        setProfileImage(null)
        
        // Update session
        await update({
          ...session,
          user: {
            ...session?.user,
            image: null,
          },
        })
        
        showToast('ลบรูปโปรไฟล์สำเร็จ!')
      } else {
        showToast('ไม่สามารถลบรูปโปรไฟล์ได้', 'error')
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      showToast('ไม่สามารถลบรูปโปรไฟล์ได้', 'error')
    }
  }

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    setErrors({})

    try {
      // Upload image first if there's a new image
      let newImageUrl = profile?.image
      if (profileImage) {
        const uploadedImageUrl = await handleUploadImage()
        if (uploadedImageUrl) {
          newImageUrl = uploadedImageUrl
        } else {
          setIsUpdating(false)
          return // Error already set in handleUploadImage
        }
      }

      const updateData: any = {
        name: formData.name,
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile({ ...updatedProfile, image: newImageUrl })
        
        // Update session
        await update({
          ...session,
          user: {
            ...session?.user,
            name: updatedProfile.name,
            image: newImageUrl,
          },
        })

        setEditMode(false)
        setProfileImage(null)
        setPreviewImage(null)
        
        showToast('อัปเดตโปรไฟล์สำเร็จ!')
      } else {
        const error = await response.json()
        showToast(error.error || 'ไม่สามารถอัปเดตโปรไฟล์ได้', 'error')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast('ไม่สามารถอัปเดตโปรไฟล์ได้', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'error')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error')
      return
    }

    setChangingPassword(true)

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        showToast('เปลี่ยนรหัสผ่านสำเร็จ!')
      } else {
        const errorData = await response.json()
        showToast(errorData.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <div className="absolute inset-0 rounded-full h-32 w-32 border-t-2 border-purple-500 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile.name) {
      return profile.name.charAt(0).toUpperCase()
    }
    return profile.email.charAt(0).toUpperCase()
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              โปรไฟล์ของฉัน
            </h1>
            <p className="text-gray-400 text-lg">
              จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'general', label: 'ข้อมูลทั่วไป', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { id: 'security', label: 'ความปลอดภัย', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
              { id: 'account', label: 'บัญชี', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Info */}
              <div className="lg:col-span-2">
                <div className="glass-dark rounded-2xl shadow-2xl p-8 hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-semibold text-white flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      ข้อมูลส่วนตัว
                    </h2>
                    
                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        แก้ไขโปรไฟล์
                      </button>
                    ) : (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setEditMode(false)
                            setErrors({})
                            setPreviewImage(null)
                            setProfileImage(null)
                            setFormData({
                              name: profile.name || '',
                              email: profile.email || ''
                            })
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={handleUpdateProfile}
                          disabled={isUpdating || isUploadingImage}
                          className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                        >
                          {isUpdating || isUploadingImage ? (
                            <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {isUploadingImage ? 'กำลังอัพโหลด...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-8">
                    {/* Account Type Badge */}
                    <div className="flex items-center justify-between p-4 bg-gray-900/30 border border-gray-700/50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-300">ประเภทบัญชี:</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isGoogleUser ? (
                          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-lg text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            บัญชี Google
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-lg text-sm font-medium flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            บัญชีปกติ
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Profile Picture */}
                    <div className="flex items-center space-x-6">
                      <div className="flex-shrink-0 relative group">
                        <div className="relative">
                          {previewImage || (profile.image && !isGoogleUser) ? (
                            <img
                              src={previewImage || profile.image || ''}
                              alt="Profile"
                              className="w-24 h-24 rounded-full border-4 border-blue-500/30 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300 object-cover"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center border-4 border-blue-500/30 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                              <span className="text-white text-2xl font-bold">
                                {getUserInitials()}
                              </span>
                            </div>
                          )}
                          {editMode && !isGoogleUser && (
                            <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-medium text-white mb-1">
                          รูปโปรไฟล์
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">
                          {isGoogleUser ? 'ใช้รูปโปรไฟล์จาก Google' : editMode ? 'คลิกเพื่อเปลี่ยนรูปโปรไฟล์' : 'คลิกแก้ไขโปรไฟล์เพื่อเปลี่ยนรูป'}
                        </p>
                        
                        {/* Avatar action buttons - only in edit mode */}
                        {editMode && !isGoogleUser && (
                          <div className="flex space-x-2">
                            <label className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer transition-colors">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              เลือกรูป
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                            </label>
                            
                            {(profile.image || previewImage) && (
                              <button
                                onClick={handleRemoveAvatar}
                                className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                ลบ
                              </button>
                            )}
                          </div>
                        )}
                        
                        {isGoogleUser && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            ไม่สามารถแก้ไขได้
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        ชื่อ-นามสกุล
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          readOnly={!editMode}
                          className={`w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white rounded-xl backdrop-blur-sm transition-all duration-200 ${
                            !editMode 
                              ? 'cursor-not-allowed text-gray-400' 
                              : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }`}
                          placeholder="กรอกชื่อ-นามสกุลของคุณ"
                        />
                        {!editMode && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        อีเมล
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={formData.email}
                          readOnly
                          className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-gray-400 rounded-xl backdrop-blur-sm cursor-not-allowed"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        ไม่สามารถเปลี่ยนอีเมลได้
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="glass-dark rounded-2xl shadow-2xl p-6 hover:shadow-purple-500/10 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    สถิติการใช้งาน
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">จำนวน URL ทั้งหมด</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {profile._count.urls.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">จำนวนคลิกทั้งหมด</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                        {stats.totalClicks.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">เฉลี่ยต่อ URL</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {profile._count.urls > 0 ? Math.round(stats.totalClicks / profile._count.urls) : 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-dark rounded-2xl shadow-2xl p-6 hover:shadow-green-500/10 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    การดำเนินการด่วน
                  </h3>
                  
                  <div className="space-y-4">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-500/25"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      สร้าง URL ใหม่
                    </button>
                    
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full flex items-center justify-center px-6 py-4 bg-gray-700/50 border border-gray-600/50 text-gray-300 rounded-xl hover:bg-gray-600/50 hover:text-white hover:border-gray-500/50 transition-all duration-200 hover:scale-105"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      แดชบอร์ด
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && !isGoogleUser && (
            <div className="glass-dark rounded-2xl shadow-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
                เปลี่ยนรหัสผ่าน
              </h2>
              <p className="text-gray-400 mb-8">อัปเดตรหัสผ่านของคุณเพื่อความปลอดภัยของบัญชี</p>
              
              <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">รหัสผ่านปัจจุบัน</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-12"
                      placeholder="กรอกรหัสผ่านปัจจุบัน"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPasswords.current ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">รหัสผ่านใหม่</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-12"
                      placeholder="กรอกรหัสผ่านใหม่"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPasswords.new ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">ยืนยันรหัสผ่านใหม่</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-12"
                      placeholder="ยืนยันรหัสผ่านใหม่"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPasswords.confirm ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">ข้อกำหนดรหัสผ่าน:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• มีความยาวอย่างน้อย 6 ตัวอักษร</li>
                    <li>• ใช้การผสมผสานที่แข็งแกร่งของตัวอักษร ตัวเลข และสัญลักษณ์</li>
                    <li>• หลีกเลี่ยงการใช้ข้อมูลส่วนตัว</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  {changingPassword ? (
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  {changingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </form>
            </div>
          )}

          {/* Security Tab for Google Users */}
          {activeTab === 'security' && isGoogleUser && (
            <div className="glass-dark rounded-2xl shadow-2xl p-8 text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="text-2xl font-semibold text-white mb-2">ความปลอดภัยบัญชี Google</h2>
                <p className="text-gray-400">
                  เนื่องจากคุณใช้ Google OAuth การจัดการรหัสผ่านจะดำเนินการโดย Google 
                  หากต้องการเปลี่ยนรหัสผ่านหรืออัปเดตการตั้งค่าความปลอดภัย กรุณาไปที่การตั้งค่าบัญชี Google ของคุณ
                </p>
              </div>
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                จัดการความปลอดภัยบัญชี Google
              </a>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="glass-dark rounded-2xl shadow-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <div className="w-3 h-3 bg-amber-500 rounded-full mr-3"></div>
                ข้อมูลบัญชี
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-900/30 border border-gray-700/50 rounded-xl">
                    <span className="text-gray-400">วิธีการเข้าสู่ระบบ:</span>
                    <span className="font-medium text-white flex items-center">
                      {isGoogleUser ? (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google OAuth
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          อีเมลและรหัสผ่าน
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-900/30 border border-gray-700/50 rounded-xl">
                    <span className="text-gray-400">สถานะบัญชี:</span>
                    <span className="text-emerald-400 font-medium flex items-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                      ใช้งานอยู่
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-900/30 border border-gray-700/50 rounded-xl">
                    <span className="text-gray-400">แผนการใช้งาน:</span>
                    <span className="font-medium text-white flex items-center">
                      <svg className="w-4 h-4 mr-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      ฟรี
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-900/30 border border-gray-700/50 rounded-xl">
                    <span className="text-gray-400">สมาชิกตั้งแต่:</span>
                    <span className="font-medium text-white">
                      {formatDate(new Date(profile.createdAt))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              {/*<div className="border-t border-red-500/20 pt-8">
                <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  
                </h3>
                <p className="text-gray-400 mb-6">การดำเนินการที่ไม่สามารถย้อนกลับได้และเป็นอันตราย</p>
                
                <button
                  onClick={() => {
                    if (confirm('คุณแน่ใจหรือไม่ที่ต้องการออกจากระบบ?')) {
                      router.push('/auth/signin')
                    }
                  }}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  ออกจากระบบ
                </button>
              </div>*/}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}