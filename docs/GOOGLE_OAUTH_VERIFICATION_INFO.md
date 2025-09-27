# Google OAuth Doğrulama Bekleme Süreci

## 🕐 Doğrulama Durumu

Google OAuth uygulamanız şu anda **doğrulama bekliyor**. Bu süreç genellikle 2-5 iş günü sürer.

## 📋 Mevcut Bilgiler

- **Client ID**: `your-google-client-id.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-your-google-client-secret`
- **Durum**: Doğrulama bekleniyor

## ⚠️ Doğrulama Beklerken

### Test Kullanıcıları ile Çalışma

Doğrulama beklerken **test kullanıcıları** ile sistemi kullanabilirsiniz:

1. **Google Cloud Console** → OAuth consent screen
2. **Test users** bölümüne gidin
3. **Add Users** ile test kullanıcıları ekleyin (max 100 kullanıcı)
4. Bu kullanıcılar doğrulama beklemeden giriş yapabilir

### Test Kullanıcıları Ekleme
```
cenk.tokgoz@gmail.com
test1@gmail.com
test2@gmail.com
```

## 🔄 Alternatif: Email/Password Authentication

Google OAuth doğrulanana kadar email/password ile giriş kullanabilirsiniz:

### Frontend Konfigürasyonu
```typescript
// lib/auth.ts
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}
```

### Supabase Email Konfigürasyonu

`.env.docker` dosyasında email ayarları zaten yapılandırılmış:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=cenk.tokgoz@gmail.com
SMTP_PASSWORD=bmwy pbfh tpir jwrt
SMTP_FROM=cenk.tokgoz@gmail.com
```

## 🚀 Geliştirme Ortamında Çalışma

### 1. Docker Compose Başlatma
```bash
# .env dosyasını oluştur
cp .env.docker .env

# Servisleri başlat
docker-compose -f docker-compose.supabase.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.supabase.yml logs -f auth
```

### 2. Frontend Başlatma
```bash
cd frontend
npm install
npm run dev
```

### 3. Test Etme
- Email/Password ile kayıt: http://localhost:3000/auth/register
- Email/Password ile giriş: http://localhost:3000/auth/login
- Google OAuth (test kullanıcıları): http://localhost:3000/auth/login

## 📌 Doğrulama Sonrası Yapılacaklar

Google OAuth doğrulandıktan sonra:

1. **Production URL'leri Ekle**:
   - Authorized JavaScript origins'e production domain ekle
   - Authorized redirect URIs'e production callback URL ekle

2. **Environment Variables Güncelle**:
   ```env
   GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://your-domain.com/auth/v1/callback
   GOTRUE_SITE_URL=https://your-domain.com
   GOTRUE_URI_ALLOW_LIST=https://your-domain.com
   ```

3. **Test Kullanıcı Kısıtlamasını Kaldır**:
   - OAuth consent screen'de production'a geç
   - Test users kısıtlamasını kaldır

## 🛠️ Troubleshooting

### "Sign in with Google temporarily disabled" Hatası
- Bu hata doğrulama beklenirken normaldir
- Test kullanıcıları ile giriş yapabilirsiniz
- Email/password authentication kullanın

### Test Kullanıcısı Ekleyememe
- OAuth consent screen → Test users
- Maximum 100 kullanıcı eklenebilir
- Email adresleri Gmail olmak zorunda değil

### Email Doğrulama Gönderilmiyor
```bash
# Auth servis loglarını kontrol et
docker logs supabase-auth -f

# SMTP ayarlarını doğrula
docker exec supabase-auth env | grep SMTP
```

## 📞 Destek Kaynakları

- [Google OAuth Verification FAQ](https://support.google.com/cloud/answer/10311615)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)