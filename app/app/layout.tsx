import './globals.css'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/providers/WalletProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { PWAInstallPrompt, NetworkStatus } from '@/components/mobile/PWAInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SwipePredict - Tinder for Prediction Markets',
  description: 'Swipe right on events you think will happen, left on those you don\'t. Built on Solana with Arcium privacy protection.',
  keywords: ['Prediction Markets', 'Swipe Interface', 'Privacy', 'Solana', 'Arcium', 'MPC', 'Blockchain'],
  authors: [{ name: 'SwipePredict Team' }],
  creator: 'SwipePredict',
  metadataBase: new URL('https://swipepredict.com'),
  openGraph: {
    title: 'SwipePredict - Tinder for Prediction Markets',
    description: 'Swipe right on events you think will happen, left on those you don\'t. Built on Solana with Arcium privacy protection.',
    url: 'https://swipepredict.com',
    siteName: 'SwipePredict',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SwipePredict - Tinder for Prediction Markets',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SwipePredict - Tinder for Prediction Markets',
    description: 'Swipe right on events you think will happen, left on those you don\'t. Built on Solana with Arcium privacy protection.',
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
        <link rel="manifest" href="/manifest.json" />
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
                {/* Desktop Navigation */}
                <div className="hidden md:block">
                  <Navigation />
                </div>

                {/* Mobile Header */}
                <MobileHeader />

                {/* Network Status Indicator */}
                <NetworkStatus />

                {/* Main Content */}
                <main className="flex-1 pb-16 md:pb-0">
                  {children}
                </main>

                {/* Desktop Footer */}
                <div className="hidden md:block">
                  <Footer />
                </div>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav />

                {/* PWA Install Prompt */}
                <PWAInstallPrompt />
              </div>
            </QueryProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 