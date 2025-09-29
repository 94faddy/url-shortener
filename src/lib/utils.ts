import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok'
  }).format(date)
}

export function getCountryName(countryCode: string): string {
  const countryNames: { [key: string]: string } = {
    'TH': 'ไทย',
    'US': 'สหรัฐอเมริกา',
    'CN': 'จีน',
    'JP': 'ญี่ปุ่น',
    'KR': 'เกาหลีใต้',
    'SG': 'สิงคโปร์',
    'MY': 'มาเลเซีย',
    'VN': 'เวียดนาม',
    'ID': 'อินโดนีเซีย',
    'PH': 'ฟิลิปปินส์',
    'IN': 'อินเดีย',
    'GB': 'สหราชอาณาจักร',
    'DE': 'เยอรมนี',
    'FR': 'ฝรั่งเศส',
    'AU': 'ออสเตรเลีย',
    'CA': 'แคนาดา',
    'BR': 'บราซิล',
    'RU': 'รัสเซีย',
    'IT': 'อิตาลี',
    'ES': 'สเปน',
    'NL': 'เนเธอร์แลนด์',
    'SE': 'สวีเดน',
    'NO': 'นอร์เวย์',
    'FI': 'ฟินแลนด์',
    'DK': 'เดนมาร์ก',
    'CH': 'สวิตเซอร์แลนด์',
    'AT': 'ออสเตรีย',
    'BE': 'เบลเยียม',
    'PT': 'โปรตุเกส',
    'IE': 'ไอร์แลนด์',
    'NZ': 'นิวซีแลนด์',
    'ZA': 'แอฟริกาใต้',
    'MX': 'เม็กซิโก',
    'AR': 'อาร์เจนตินา',
    'CL': 'ชิลี',
    'PE': 'เปรู',
    'CO': 'โคลอมเบีย',
    'VE': 'เวเนซุเอลา',
    'TR': 'ตุรกี',
    'EG': 'อียิปต์',
    'SA': 'ซาอุดีอาระเบีย',
    'AE': 'สหรัฐอาหรับเอมิเรตส์',
    'IL': 'อิสราเอล',
    'IR': 'อิหร่าน',
    'IQ': 'อิรัก',
    'JO': 'จอร์แดน',
    'LB': 'เลบานอน',
    'SY': 'ซีเรีย',
    'PK': 'ปากีสถาน',
    'BD': 'บังกลาเทศ',
    'LK': 'ศรีลังกา',
    'MM': 'เมียนมา',
    'KH': 'กัมพูชา',
    'LA': 'ลาว',
    'BN': 'บรูไน'
  }
  return countryNames[countryCode] || countryCode
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function formatUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}