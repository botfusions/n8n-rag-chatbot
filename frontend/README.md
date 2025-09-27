# N8N RAG Chatbot Frontend

Modern Next.js 14 App Router tabanlı SaaS chatbot platformu frontend'i.

## Özellikler

- ⚡ **Next.js 14** - App Router ile modern React framework
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🌐 **TypeScript** - Tam tip güvenliği
- 🔐 **Supabase Auth** - Kullanıcı kimlik doğrulama
- 🌍 **i18n** - Çoklu dil desteği (TR/EN)
- 📱 **Responsive Design** - Mobil uyumlu tasarım
- 🎭 **Modern UI** - Radix UI bileşenleri
- 🎯 **Form Validation** - React Hook Form + Zod

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Authentication**: Supabase
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **State Management**: Zustand
- **Internationalization**: next-intl
- **Icons**: Lucide React

## Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
# veya
yarn install
```

2. **Ortam değişkenlerini ayarlayın:**
```bash
cp .env.example .env.local
```

`.env.local` dosyasını düzenleyin:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
# veya
yarn dev
```

4. **Tarayıcıda açın:**
[http://localhost:3000](http://localhost:3000)

## Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route grubu
│   ├── dashboard/         # Dashboard sayfaları
│   ├── admin/             # Admin paneli
│   ├── widget/            # Chat widget
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Ana sayfa
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # UI bileşenleri
│   ├── auth/              # Auth bileşenleri
│   ├── dashboard/         # Dashboard bileşenleri
│   └── admin/             # Admin bileşenleri
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── auth.ts            # Auth utilities
│   └── utils.ts           # Utility functions
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── i18n/                  # Internationalization
└── messages/              # Translation files
    ├── tr.json           # Türkçe çeviriler
    └── en.json           # English translations
```

## Sayfalar

### Ana Sayfa (Landing)
- **Dosya**: `src/app/page.tsx`
- **Özellikler**: Hero section, features, CTA
- **Responsive**: Mobil ve desktop uyumlu

### Kimlik Doğrulama
- **Login**: `src/app/(auth)/login/page.tsx`
- **Register**: `src/app/(auth)/register/page.tsx`
- **Reset Password**: `src/app/(auth)/reset-password/page.tsx`

### Dashboard
- **Ana Panel**: `src/app/dashboard/page.tsx`
- **Chatbot'lar**: `src/app/dashboard/chatbots/`
- **Analitik**: `src/app/dashboard/analytics/`
- **Ayarlar**: `src/app/dashboard/settings/`

## Komutlar

```bash
# Geliştirme
npm run dev

# Build
npm run build

# Production start
npm run start

# Linting
npm run lint

# Type checking
npm run type-check
```

## Konfigürasyon

### Tailwind CSS
- **Dosya**: `tailwind.config.js`
- **Plugins**: @tailwindcss/forms, @tailwindcss/typography
- **Custom**: Design system color variables

### TypeScript
- **Dosya**: `tsconfig.json`
- **Path aliases**: `@/*` için src/ mapping
- **Strict mode**: Enabled

### Next.js
- **Dosya**: `next.config.js`
- **i18n**: next-intl plugin entegrasyonu
- **Supabase**: External packages konfigürasyonu

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=
```

## Dil Desteği

Proje Türkçe ve İngilizce dillerini destekler:

- **Türkçe**: `src/messages/tr.json`
- **İngilizce**: `src/messages/en.json`

Yeni dil eklemek için:
1. `src/messages/` altında yeni JSON dosyası oluşturun
2. `src/i18n/request.ts` dosyasını güncelleyin

## Bileşenler

### UI Bileşenleri
- Button
- Input
- Card
- Label
- Form components

### Layout Bileşenleri
- Sidebar Navigation
- Header
- Footer
- Auth Layout

## Supabase Entegrasyonu

### Auth Service
- Sign up / Sign in
- Password reset
- OAuth providers
- Session management

### Database Types
- Automatic type generation
- Type-safe queries
- Real-time subscriptions

## Deployment

### Vercel (Önerilen)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t n8n-rag-frontend .
docker run -p 3000:3000 n8n-rag-frontend
```

## Geliştirme Notları

- **App Router**: Next.js 14 App Router kullanılıyor
- **Server Components**: Varsayılan olarak server components
- **Client Components**: Sadece gerektiğinde 'use client'
- **Streaming**: Suspense boundaries ile
- **SEO**: Metadata API ile optimize edilmiş

## Katkıda Bulunma

1. Fork the repository
2. Create feature branch
3. Commit your changes
4. Push to the branch
5. Create Pull Request

## Lisans

MIT License