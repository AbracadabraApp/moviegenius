import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MovieGenius',
  description: 'AI-powered movie recommendations and analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}