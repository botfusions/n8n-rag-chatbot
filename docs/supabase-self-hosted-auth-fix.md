# Supabase Self-Hosted Authentication Düzeltmeleri

## 🚨 Self-Hosted Supabase Auth Sorunları ve Çözümleri

### 1. JWT Secret ve URL Konfigürasyonu

```env
# .env dosyasına eklenecek self-hosted özel ayarlar
SUPABASE_URL=https://your-self-hosted-supabase.com
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Self-hosted için özel ayarlar
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_AUTH_URL=https://your-self-hosted-supabase.com/auth/v1
SUPABASE_REST_URL=https://your-self-hosted-supabase.com/rest/v1
SUPABASE_REALTIME_URL=wss://your-self-hosted-supabase.com/realtime/v1
SUPABASE_STORAGE_URL=https://your-self-hosted-supabase.com/storage/v1

# Email Configuration (Self-hosted için SMTP gerekli)
SMTP_ADMIN_EMAIL=admin@your-domain.com
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### 2. Frontend Supabase Client Düzeltmesi

```typescript
// frontend/src/lib/supabase.ts - Self-hosted için güncellenmiş versiyon
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Self-hosted için özel konfigürasyon
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Self-hosted için özel auth URL
    url: process.env.NEXT_PUBLIC_SUPABASE_AUTH_URL || `${supabaseUrl}/auth/v1`,
    // Custom redirect URLs
    redirectTo: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  },
  // Self-hosted için realtime konfigürasyonu
  realtime: {
    url: process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL || `${supabaseUrl}/realtime/v1`.replace('https', 'wss')
  }
}

// Client component için
export const createClientSupabase = () =>
  createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    options: supabaseConfig
  })

// Server component için
export const createServerSupabase = () =>
  createServerComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    cookies,
    options: supabaseConfig
  })

// Service role client (backend için)
export const createServiceSupabase = () =>
  createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

// Email template URLs için helper
export const getEmailRedirectUrl = (type: 'signup' | 'reset' | 'invite') => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/auth/callback?type=${type}`
}
```

### 3. Auth Context Düzeltmesi

```typescript
// frontend/src/components/auth/auth-context.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClientSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: any) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientSupabase()

  useEffect(() => {
    // Mevcut session'ı kontrol et
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Session error:', error)
      }

      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Self-hosted için özel redirections
        if (event === 'SIGNED_IN') {
          router.push('/dashboard')
        } else if (event === 'SIGNED_OUT') {
          router.push('/auth/login')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const signUp = async (email: string, password: string, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Self-hosted için email redirect URL
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=signup`,
          data: {
            company_name: '',
            language: 'tr',
            ...metadata
          }
        }
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=reset`
      })

      return { error }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error: error as AuthError }
    }
  }

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase.auth.updateUser(updates)
      return { error }
    } catch (error) {
      console.error('Update profile error:', error)
      return { error: error as AuthError }
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 4. Auth Callback Handler

```typescript
// frontend/src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?message=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
      // Self-hosted için özel konfigürasyon
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    })

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Code exchange error:', error)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/error?message=${encodeURIComponent(error.message)}`
        )
      }

      // Başarılı authentication sonrası customer kaydı oluştur
      if (data.user && type === 'signup') {
        const { error: customerError } = await supabase
          .from('customers')
          .insert({
            id: data.user.id,
            email: data.user.email,
            company_name: data.user.user_metadata?.company_name || '',
            full_name: data.user.user_metadata?.full_name || '',
            language: data.user.user_metadata?.language || 'tr'
          })

        if (customerError && customerError.code !== '23505') { // Ignore duplicate key error
          console.error('Customer creation error:', customerError)
        }
      }

      // Redirect based on type
      const redirectUrl = type === 'reset'
        ? `${requestUrl.origin}/auth/reset-password`
        : `${requestUrl.origin}/dashboard`

      return NextResponse.redirect(redirectUrl)

    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?message=${encodeURIComponent('Authentication failed')}`
      )
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
```

### 5. Backend Auth Middleware Düzeltmesi

```typescript
// backend/src/middleware/auth.ts - Self-hosted için düzeltilmiş
import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export interface AuthenticatedRequest extends Request {
  user?: any
  customerId?: string
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.substring(7)

    // Self-hosted Supabase için JWT verification
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!)
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError)
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // User bilgilerini Supabase'den al
    const { data: user, error } = await supabase.auth.getUser(token)

    if (error || !user.user) {
      console.error('User verification error:', error)
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    // Customer bilgilerini al
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.user.id)
      .single()

    if (customerError) {
      console.error('Customer lookup error:', customerError)
      return res.status(401).json({ error: 'Customer not found' })
    }

    req.user = user.user
    req.customerId = customer.id

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication service error' })
  }
}

// Admin authentication
export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // First authenticate as regular user
    await authenticateUser(req, res, () => {})

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Check admin privileges
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('user_id', req.user.id)
      .single()

    if (error || !adminUser) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    req.user.adminRole = adminUser.role
    req.user.permissions = adminUser.permissions

    next()
  } catch (error) {
    console.error('Admin authentication error:', error)
    res.status(500).json({ error: 'Admin authentication service error' })
  }
}
```

### 6. Database RLS Politikaları Düzeltmesi

```sql
-- Self-hosted için güncellenmiş RLS politikaları
-- docs/database-schema-fixes.sql

-- JWT token'dan user_id çıkarma fonksiyonu (self-hosted için)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      current_setting('request.jwt.claim.sub', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    )::uuid
$$;

-- JWT token'dan role çıkarma fonksiyonu (self-hosted için)
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      current_setting('request.jwt.claim.role', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    )
$$;

-- Customers tablosu için güncellenmiş RLS
DROP POLICY IF EXISTS "Customers can view own data" ON customers;
CREATE POLICY "Customers can view own data" ON customers
    FOR ALL USING (
        auth.uid() = id
        OR
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Chat widgets için güncellenmiş RLS
DROP POLICY IF EXISTS "Customers can manage own widgets" ON chat_widgets;
CREATE POLICY "Customers can manage own widgets" ON chat_widgets
    FOR ALL USING (
        customer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Documents için güncellenmiş RLS
DROP POLICY IF EXISTS "Customers can manage own documents" ON documents;
CREATE POLICY "Customers can manage own documents" ON documents
    FOR ALL USING (
        customer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Document chunks için güncellenmiş RLS
DROP POLICY IF EXISTS "Customers can access own document chunks" ON document_chunks;
CREATE POLICY "Customers can access own document chunks" ON document_chunks
    FOR ALL USING (
        customer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
    );

-- Self-hosted için service role bypass
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_widgets FORCE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;

-- Service role için bypass policy
CREATE POLICY "Service role bypass" ON customers FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON chat_widgets FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON documents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON document_chunks FOR ALL TO service_role USING (true);
```

### 7. Email Template Konfigürasyonu

```html
<!-- Self-hosted Supabase için email templates -->
<!-- Email confirmation template -->
<h2>Email Adresinizi Doğrulayın</h2>
<p>Hesabınızı aktifleştirmek için aşağıdaki linke tıklayın:</p>
<a href="{{ .ConfirmationURL }}">Email Adresimi Doğrula</a>

<!-- Password reset template -->
<h2>Şifre Sıfırlama</h2>
<p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
<a href="{{ .ResetURL }}">Şifremi Sıfırla</a>
```

### 8. Environment Variables Kontrolü

```typescript
// frontend/src/lib/env-check.ts
export const checkEnvironmentVariables = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }

  // Self-hosted URL kontrolü
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!supabaseUrl.startsWith('https://')) {
    console.warn('Supabase URL should use HTTPS in production')
  }

  console.log('Environment variables validated successfully')
}
```

Bu düzeltmeler self-hosted Supabase'in authentication sorunlarını çözecek ve sistem tam olarak çalışır hale gelecektir.