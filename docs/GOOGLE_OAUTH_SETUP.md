# Google OAuth Setup - Self-Hosted Supabase

## 1. Google Cloud Console Setup

### Google OAuth Credentials Oluşturma

1. **Google Cloud Console**'a gidin: https://console.cloud.google.com/
2. Proje seçin veya yeni proje oluşturun
3. **APIs & Services** → **Credentials** gidin
4. **"Create Credentials"** → **"OAuth 2.0 Client IDs"**

### OAuth Client Konfigürasyonu

```yaml
Application Type: Web application
Name: N8N RAG Chatbot
Authorized JavaScript origins:
  - https://your-domain.com
  - http://localhost:3000
Authorized redirect URIs:
  - https://your-supabase-domain.com/auth/v1/callback
  - http://localhost:54321/auth/v1/callback
```

### Client ID ve Secret Alma

Oluşturulduktan sonra şu bilgileri kaydedin:
- **Client ID**: `your-google-client-id.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-your-google-client-secret`

## 2. Self-Hosted Supabase Konfigürasyonu

### Docker Compose Environment Variables

`.env` dosyanıza ekleyin:

```env
# Google OAuth
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=your_google_client_id
GOTRUE_EXTERNAL_GOOGLE_SECRET=your_google_client_secret
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://your-supabase-domain.com/auth/v1/callback

# Site URL (frontend domain)
GOTRUE_SITE_URL=https://your-frontend-domain.com
GOTRUE_URI_ALLOW_LIST=https://your-frontend-domain.com,http://localhost:3000

# Additional Auth Settings
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_EMAIL_CONFIRM_URL=https://your-frontend-domain.com/auth/confirm
GOTRUE_PASSWORD_RESET_URL=https://your-frontend-domain.com/auth/reset
```

### Docker Compose Service Update

`docker-compose.yml`'de auth servisi:

```yaml
auth:
  image: supabase/gotrue:v2.99.0
  depends_on:
    db:
      condition: service_healthy
  restart: unless-stopped
  environment:
    GOTRUE_API_HOST: 0.0.0.0
    GOTRUE_API_PORT: 9999
    GOTRUE_DB_DRIVER: postgres
    GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

    GOTRUE_SITE_URL: ${GOTRUE_SITE_URL}
    GOTRUE_URI_ALLOW_LIST: ${GOTRUE_URI_ALLOW_LIST}

    # Google OAuth
    GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${GOTRUE_EXTERNAL_GOOGLE_ENABLED}
    GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID}
    GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOTRUE_EXTERNAL_GOOGLE_SECRET}
    GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: ${GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI}

    GOTRUE_JWT_ADMIN_ROLES: service_role
    GOTRUE_JWT_AUD: authenticated
    GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
    GOTRUE_JWT_EXP: ${JWT_EXPIRY}
    GOTRUE_JWT_SECRET: ${JWT_SECRET}
```

## 3. Frontend Integration

### Next.js Supabase Client Setup

`lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
```

### Google Sign-In Component

`components/GoogleSignIn.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function GoogleSignIn() {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        console.error('Google sign in error:', error.message)
        alert('Google ile giriş yapılamadı: ' + error.message)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={loading}
      variant="outline"
      className="w-full flex items-center gap-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {loading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
    </Button>
  )
}
```

### Auth Callback Page

`app/auth/callback/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/error?message=' + encodeURIComponent(error.message))
          return
        }

        if (data.session) {
          // Kullanıcı başarıyla giriş yaptı
          // Customer tablosuna kayıt ekle
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert({
              id: data.session.user.id,
              email: data.session.user.email,
              full_name: data.session.user.user_metadata?.full_name,
              avatar_url: data.session.user.user_metadata?.avatar_url,
              provider: 'google'
            })

          if (customerError) {
            console.error('Customer creation error:', customerError)
          }

          router.push('/dashboard')
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/auth/error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Giriş yapılıyor...</p>
      </div>
    </div>
  )
}
```

## 4. Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase (.env)

```env
# Google OAuth
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOTRUE_EXTERNAL_GOOGLE_SECRET=GOCSPX-abcdef123456
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://your-supabase-domain.com/auth/v1/callback

# Site Configuration
GOTRUE_SITE_URL=https://your-frontend-domain.com
GOTRUE_URI_ALLOW_LIST=https://your-frontend-domain.com,http://localhost:3000

# Auth URLs
GOTRUE_EMAIL_CONFIRM_URL=https://your-frontend-domain.com/auth/confirm
GOTRUE_PASSWORD_RESET_URL=https://your-frontend-domain.com/auth/reset
```

## 5. Testing

### Test Adımları

1. **Docker servisleri restart edin**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

2. **Frontend'i başlatın**:
   ```bash
   npm run dev
   ```

3. **Google Sign-In test edin**:
   - `/auth/login` sayfasına gidin
   - "Google ile Giriş Yap" butonuna tıklayın
   - Google hesabı seçin
   - Dashboard'a yönlendirildiğinizi kontrol edin

### Troubleshooting

**Common Issues:**

1. **Redirect URI Mismatch**:
   - Google Console'da redirect URI'ları kontrol edin
   - Tam domain adresini kullanın (trailing slash yok)

2. **CORS Errors**:
   - `GOTRUE_URI_ALLOW_LIST` ayarını kontrol edin
   - Frontend domain'ini ekleyin

3. **JWT Errors**:
   - `JWT_SECRET` aynı olmalı
   - Session storage'ı temizleyin

## 6. Production Checklist

- [ ] Google Console'da production domain'i ekle
- [ ] SSL sertifikası aktif
- [ ] Environment variables production'da set
- [ ] CORS ayarları production'a uygun
- [ ] Error handling comprehensive
- [ ] User experience smooth

## 7. Additional Features

### Email + Google Hybrid Auth

```typescript
// Email ile de kayıt olabilme
const handleEmailSignUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })
}
```

### User Profile Management

```typescript
// Google'dan gelen user bilgilerini handle etme
const updateUserProfile = async (user: any) => {
  const { data, error } = await supabase
    .from('customers')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      provider: 'google',
      updated_at: new Date().toISOString()
    })
}
```