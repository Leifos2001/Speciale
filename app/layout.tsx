import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Note app',
  description: 'make toodo and notes',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
