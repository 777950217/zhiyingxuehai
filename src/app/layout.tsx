import './globals.css'

export const metadata = { title: '职盈学海' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-[#0F2A4A]">{children}</body>
    </html>
  )
}
