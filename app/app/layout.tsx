import './globals.css'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/providers/WalletProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ZenithVeil - Privacy-Preserving DeFi Analytics',
  description: 'Peak Performance, Private by Design. Benchmark your DeFi portfolio performance with institutional-grade analytics while preserving complete privacy.',
  keywords: ['DeFi', 'Portfolio Analytics', 'Privacy', 'Solana', 'Arcium', 'MPC', 'Encrypted Computation'],
  authors: [{ name: 'ZenithVeil Team' }],
  creator: 'ZenithVeil',
  metadataBase: new URL('https://zenithveil.com'),
  openGraph: {
    title: 'ZenithVeil - Privacy-Preserving DeFi Analytics',
    description: 'Peak Performance, Private by Design. Benchmark your DeFi portfolio performance with institutional-grade analytics while preserving complete privacy.',
    url: 'https://zenithveil.com',
    siteName: 'ZenithVeil',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZenithVeil - Privacy-Preserving DeFi Analytics',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZenithVeil - Privacy-Preserving DeFi Analytics',
    description: 'Peak Performance, Private by Design. Benchmark your DeFi portfolio performance with institutional-grade analytics while preserving complete privacy.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0ea5e9" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WalletProvider>
            <QueryProvider>
              <div className="relative flex min-h-screen flex-col">
                <Navigation />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </QueryProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 