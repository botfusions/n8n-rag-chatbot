# 🔧 N8N Environment Variables Kurulum Rehberi

## 📋 Gerekli Environment Variables

### 🔥 Kritik Variables (Mutlaka Gerekli)

```env
# OpenAI API - Embedding ve Chat için
OPENAI_API_KEY=sk-your-openai-api-key

# Supabase - Database ve Vector Search için
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 🔧 İsteğe Bağlı Variables (Backend API için)

```env
# Backend API - Gelişmiş özellikler için
BACKEND_URL=https://your-backend-api.com
BACKEND_API_KEY=your-secret-backend-api-key

# N8N Instance URL - Webhook'lar için
N8N_WEBHOOK_URL=https://your-n8n-instance.com
```

## 🚀 N8N'de Environment Variables Ayarlama

### Adım 1: N8N Settings'e Gidin
1. N8N Dashboard'a giriş yapın
2. Sol menüden **"Settings"** seçin
3. **"Environment"** sekmesine tıklayın

### Adım 2: Variables Ekleme
Her bir variable için:
1. **"Add Variable"** butonuna tıklayın
2. **Name** alanına variable adını girin
3. **Value** alanına değeri girin
4. **"Save"** butonuna tıklayın

### Adım 3: Restart N8N
Environment variables eklendikten sonra N8N'i restart edin:
```bash
# Docker kullanıyorsanız
docker restart n8n

# PM2 kullanıyorsanız
pm2 restart n8n
```

## 🔐 Güvenlik Önerileri

### Environment Variables Güvenliği:
- ✅ API key'leri asla code'a yazmayın
- ✅ Production ve development için farklı key'ler kullanın
- ✅ Regular olarak key rotation yapın
- ✅ Access log'ları kontrol edin

### API Key Yönetimi:
```env
# Production
OPENAI_API_KEY=sk-prod-...
SUPABASE_SERVICE_KEY=prod-service-key...

# Development
OPENAI_API_KEY=sk-dev-...
SUPABASE_SERVICE_KEY=dev-service-key...
```

## 🧪 Variables Test Etme

### Test Script 1: OpenAI Connection
```javascript
// N8N Code node'da test
const openaiKey = $env.OPENAI_API_KEY;
if (!openaiKey || !openaiKey.startsWith('sk-')) {
  throw new Error('Invalid OpenAI API key');
}

return [{
  json: {
    message: 'OpenAI API key valid',
    keyPrefix: openaiKey.substring(0, 10) + '...'
  }
}];
```

### Test Script 2: Supabase Connection
```javascript
// N8N Code node'da test
const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseUrl.includes('supabase.co')) {
  throw new Error('Invalid Supabase URL');
}

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
  throw new Error('Invalid Supabase service key');
}

return [{
  json: {
    message: 'Supabase credentials valid',
    url: supabaseUrl,
    keyPrefix: supabaseKey.substring(0, 20) + '...'
  }
}];
```

## 📊 Workflow Bazında Variable Kullanımı

### Chat Workflow Variables:
```env
# Zorunlu
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# İsteğe Bağlı
BACKEND_URL=https://...
BACKEND_API_KEY=...
```

### Document Processing Variables:
```env
# Zorunlu
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...

# Dosya işleme için
MAX_FILE_SIZE=10485760  # 10MB
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Supabase-Only Variables:
```env
# Sadece bunlar yeterli
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

## ⚠️ Troubleshooting

### Yaygın Sorunlar:

#### 1. Environment Variable Tanınmıyor
```
Hata: $env.OPENAI_API_KEY is undefined

Çözüm:
1. Variable name'i doğru yazdığınızdan emin olun
2. N8N'i restart edin
3. Spelling kontrolü yapın (büyük/küçük harf)
```

#### 2. OpenAI API Hatası
```
Hata: Invalid API key

Çözüm:
1. API key'in sk- ile başladığını kontrol edin
2. OpenAI dashboard'da credit kontrolü yapın
3. Key'in aktif olduğunu doğrulayın
```

#### 3. Supabase Connection Hatası
```
Hata: Invalid JWT token

Çözüm:
1. SERVICE_KEY kullandığınızdan emin olun (ANON_KEY değil)
2. URL'in doğru olduğunu kontrol edin
3. RLS policies'i kontrol edin
```

## 🎯 Production Checklist

### Variables Kontrolü:
- [ ] OPENAI_API_KEY tanımlı ve geçerli
- [ ] SUPABASE_URL tanımlı ve erişilebilir
- [ ] SUPABASE_SERVICE_KEY tanımlı ve geçerli
- [ ] BACKEND_URL tanımlı (eğer kullanılıyorsa)
- [ ] BACKEND_API_KEY tanımlı (eğer kullanılıyorsa)

### Güvenlik Kontrolü:
- [ ] API key'ler production için ayrı
- [ ] Rate limiting aktif
- [ ] Access log'lar monitör ediliyor
- [ ] Regular key rotation planı var

### Performance Kontrolü:
- [ ] Connection timeout'ları optimize
- [ ] Retry mechanism'ları aktif
- [ ] Error handling comprehensive

## 📈 İleri Seviye Konfigürasyon

### Dynamic Variables:
```javascript
// Workflow içinde dynamic değerler
const environmentType = $env.NODE_ENV || 'development';
const apiUrl = environmentType === 'production'
  ? $env.PROD_API_URL
  : $env.DEV_API_URL;
```

### Conditional Logic:
```javascript
// Environment'a göre farklı davranış
if ($env.NODE_ENV === 'production') {
  // Production logic
  timeout = 30000;
  retries = 3;
} else {
  // Development logic
  timeout = 60000;
  retries = 1;
}
```

---

## 🎊 Sonuç

Bu rehberi takip ederek N8N environment variables'larınızı doğru şekilde kurup test edebilirsiniz.

**Sonraki adım:** Workflow'ları import etmeye başlayın! 🚀

---
Generated with Claude Code (claude.ai/code)