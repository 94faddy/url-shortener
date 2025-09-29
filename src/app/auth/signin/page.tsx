'use client'

import { signIn, getSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  // Register form data
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const checkSession = async () => {
      try {
        setCheckingSession(true)
        
        // Clear any existing session first
        console.log('Checking current session...')
        
        // Force refresh session from server
        const session = await getSession()
        console.log('Current session:', session)
        
        if (session?.user) {
          console.log('Valid session found, redirecting to:', callbackUrl)
          router.push(callbackUrl)
          return
        }
        
        console.log('No valid session found')
      } catch (error) {
        console.error('Error checking session:', error)
        // หากเกิดข้อผิดพลาด ให้ clear session
        try {
          await signOut({ redirect: false })
        } catch (signOutError) {
          console.error('Error signing out after session error:', signOutError)
        }
      } finally {
        setCheckingSession(false)
      }
    }
    
    checkSession()
  }, [router, callbackUrl])

  // แสดง loading หาก กำลังตรวจสอบ session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
          <div className="absolute inset-0 rounded-full h-32 w-32 border-t-2 border-blue-500 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
      </div>
    )
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      console.log('Attempting Google sign in with callback:', callbackUrl)
      
      const result = await signIn('google', { 
        callbackUrl,
        redirect: false 
      })
      
      console.log('Google sign in result:', result)
      
      if (result?.error) {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google')
        console.error('Google sign in error:', result.error)
      } else if (result?.url) {
        // สำหรับ OAuth providers ให้ redirect ไปยัง authorization URL
        window.location.href = result.url
      } else if (result?.ok) {
        // หาก sign in สำเร็จแล้ว redirect ทันที
        console.log('Google login successful, redirecting to:', callbackUrl)
        router.push(callbackUrl)
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!loginData.email || !loginData.password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      setIsLoading(false)
      return
    }

    try {
      console.log('Attempting credentials sign in for:', loginData.email)
      
      const result = await signIn('credentials', {
        email: loginData.email,
        password: loginData.password,
        redirect: false,
      })

      console.log('Credentials sign in result:', result)

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        } else {
          setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + result.error)
        }
      } else if (result?.ok) {
        console.log('Credentials login successful, redirecting to:', callbackUrl)
        // สำหรับ JWT sessions ไม่ต้องรอ - redirect ได้เลย
        router.push(callbackUrl)
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!registerData.name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล')
      setIsLoading(false)
      return
    }

    if (!registerData.email || !registerData.password) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      setIsLoading(false)
      return
    }

    if (registerData.password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      setIsLoading(false)
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setIsLoading(false)
      return
    }

    try {
      console.log('Attempting registration for:', registerData.email)
      
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name.trim(),
          email: registerData.email.toLowerCase().trim(),
          password: registerData.password,
        }),
      })

      const data = await response.json()
      console.log('Registration response:', data)

      if (response.ok) {
        setSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
        setActiveTab('login')
        setRegisterData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        })
        // เซ็ตอีเมลใน login form
        setLoginData({
          email: registerData.email,
          password: ''
        })
      } else {
        if (response.status === 400 && data.error?.includes('already exists')) {
          setError('อีเมลนี้ถูกใช้งานแล้ว')
        } else {
          setError(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('เกิดข้อผิดพลาดในการสมัครสมาชิก')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center animate-fade-in-up">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center space-x-3 mb-8 group">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-purple-500/25">
                <svg className="w-8 h-8 text-white transform group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-2xl blur-md opacity-70 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 -z-10 animate-pulse"></div>
            </div>
            <span className="font-bold text-3xl text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
              URL Shortener
            </span>
          </Link>

          <h2 className="text-4xl font-bold text-white mb-3">
            {activeTab === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </h2>
          <p className="text-gray-300 text-lg">
            {activeTab === 'login' ? 'เข้าสู่ระบบเพื่อจัดการลิงก์สั้นของคุณ' : 'สร้างบัญชีใหม่เพื่อเริ่มใช้งาน'}
          </p>
        </div>

        <div className="glass-dark rounded-3xl p-8 card-hover animate-slide-in-left">
          {/* Tabs */}
          <div className="flex mb-8 bg-white/5 rounded-2xl p-1">
            <button
              onClick={() => {
                setActiveTab('login')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-3 px-6 text-center font-semibold rounded-xl transition-all duration-300 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => {
                setActiveTab('register')
                setError('')
                setSuccess('')
              }}
              className={`flex-1 py-3 px-6 text-center font-semibold rounded-xl transition-all duration-300 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-4 animate-fade-in-up">
              <div className="flex items-start">
                <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4 animate-fade-in-up">
              <div className="flex items-start">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-emerald-400">{success}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Login Form */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    อีเมล
                  </label>
                  <input
                    type="email"
                    required
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base backdrop-blur-sm"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    รหัสผ่าน
                  </label>
                  <input
                    type="password"
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base backdrop-blur-sm"
                    placeholder="รหัสผ่านของคุณ"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      กำลังเข้าสู่ระบบ...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      เข้าสู่ระบบ
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base backdrop-blur-sm"
                    placeholder="ชื่อและนามสกุลของคุณ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    อีเมล
                  </label>
                  <input
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base backdrop-blur-sm"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    รหัสผ่าน
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base backdrop-blur-sm"
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ยืนยันรหัสผ่าน
                  </label>
                  <input
                    type="password"
                    required
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base backdrop-blur-sm"
                    placeholder="ยืนยันรหัสผ่าน"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      กำลังสมัครสมาชิก...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      สมัครสมาชิก
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-6 bg-gray-800/50 text-gray-300 font-medium rounded-full backdrop-blur-sm">หรือ</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-4 border-2 border-gray-700/50 rounded-xl bg-gray-800/50 text-white font-semibold hover:bg-gray-700/50 hover:border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base group backdrop-blur-sm"
            >
              <svg className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              ดำเนินการด้วย Google
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center animate-fade-in-up">
          <Link 
            href="/" 
            className="inline-flex items-center text-purple-300 hover:text-white text-sm font-medium transition-all duration-300 group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับไปหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  )
}