import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'N8N RAG Chatbot - Smart Customer Service Solution',
  description: 'Create intelligent chatbots powered by RAG technology. Provide instant, accurate responses to your customers 24/7.',
  keywords: ['chatbot', 'ai', 'customer service', 'rag', 'artificial intelligence'],
  authors: [{ name: 'N8N RAG Team' }],
  creator: 'N8N RAG',
  publisher: 'N8N RAG',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://n8n-rag-chatbot.com',
    title: 'N8N RAG Chatbot - Smart Customer Service Solution',
    description: 'Create intelligent chatbots powered by RAG technology. Provide instant, accurate responses to your customers 24/7.',
    siteName: 'N8N RAG Chatbot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'N8N RAG Chatbot - Smart Customer Service Solution',
    description: 'Create intelligent chatbots powered by RAG technology. Provide instant, accurate responses to your customers 24/7.',
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