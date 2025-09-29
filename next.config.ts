/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // แก้ไข Cross origin request warning สำหรับ ngrok
  /*experimental: {
    allowedDevOrigins: [
      'c9a852ca3ff0.ngrok-free.app',
      '9iot.cc',
      'localhost:2957'
    ]
  }*/
}

export default nextConfig