import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TalksFusion - AI-Powered RAG Chatbot Platform | BotFusions',
  description: 'BotFusions TalksFusion ile akıllı chatbot\'lar oluşturun. RAG teknolojisi ile güçlendirilmiş conversational AI platform.',
  keywords: ['chatbot', 'ai', 'customer service', 'rag', 'artificial intelligence', 'botfusions', 'talksfusion'],
  authors: [{ name: 'BotFusions Team' }],
  creator: 'BotFusions',
  publisher: 'BotFusions',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://talksfusion.com',
    title: 'TalksFusion - AI Chatbot Platform | BotFusions',
    description: 'BotFusions TalksFusion ile akıllı chatbot\'lar oluşturun. RAG teknolojisi ile güçlendirilmiş conversational AI platform.',
    siteName: 'BotFusions',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TalksFusion - AI Chatbot Platform | BotFusions',
    description: 'BotFusions TalksFusion ile akıllı chatbot\'lar oluşturun. RAG teknolojisi ile güçlendirilmiş conversational AI platform.',
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
  verification: {
    google: 'google-site-verification-code',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}