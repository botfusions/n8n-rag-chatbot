'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Giriş yapılıyor...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from URL params
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage('Giriş sırasında bir hata oluştu: ' + error.message)
          setTimeout(() => {
            router.push('/auth/login?error=' + encodeURIComponent(error.message))
          }, 3000)
          return
        }

        if (data.session) {
          // User successfully authenticated
          setStatus('success')
          setMessage('Giriş başarılı! Yönlendiriliyorsunuz...')

          // Create or update customer record
          const { data: customer, error: customerError } = await supabase
            .from('profiles')
            .upsert({
              id: data.session.user.id,
              email: data.session.user.email || '',
              full_name: data.session.user.user_metadata?.full_name || '',
              avatar_url: data.session.user.user_metadata?.avatar_url || '',
              role: 'user' as const,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            })

          if (customerError) {
            console.error('Customer creation error:', customerError)
            // Don't fail the auth flow for this
          }

          // Redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          // No session found
          setStatus('error')
          setMessage('Giriş sırasında oturum oluşturulamadı')
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
        }
      } catch (error) {
        console.error('Callback error:', error)
        setStatus('error')
        setMessage('Beklenmeyen bir hata oluştu')
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {status === 'loading' && (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
          {status === 'success' && (
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
        <p className={`text-lg ${
          status === 'success' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {message}
        </p>
        {status === 'loading' && (
          <p className="text-sm text-muted-foreground mt-2">
            Lütfen bekleyin...
          </p>
        )}
      </div>
    </div>
  )
}