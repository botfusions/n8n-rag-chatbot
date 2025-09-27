# Self-Hosted Supabase Setup Rehberi

Bu rehber, N8N RAG Chatbot projesi için Google OAuth destekli self-hosted Supabase kurulumunu adım adım açıklar.

## 📋 Gereksinimler

- Docker ve Docker Compose
- Google Cloud Console erişimi
- En az 4GB RAM
- 10GB disk alanı

## 🚀 Kurulum Adımları

### 1. Google OAuth Kurulumu

#### Google Cloud Console
1. [Google Cloud Console](https://console.cloud.google.com/) gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**

#### OAuth Client Konfigürasyonu
```yaml
Application Type: Web application
Name: N8N RAG Chatbot
Authorized JavaScript origins:
  - http://localhost:3000
  - http://localhost:8000
Authorized redirect URIs:
  - http://localhost:8000/auth/v1/callback
```

### 2. Environment Dosyalarını Hazırlama

#### .env.docker dosyasını düzenleyin:
```bash
cp .env.docker .env
```

Aşağıdaki değerleri güncelleyin:
```env
# Google OAuth - Google Console'dan alınan değerler
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOTRUE_EXTERNAL_GOOGLE_SECRET=GOCSPX-abcdef123456

# Güvenlik için güçlü şifreler
POSTGRES_PASSWORD=your-strong-postgres-password-32-chars
JWT_SECRET=your-jwt-secret-key-32-characters-long
```

### 3. Docker Compose ile Supabase Başlatma

```bash
# Supabase servislerini başlat
docker-compose -f docker-compose.supabase.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.supabase.yml logs -f

# Servislerin durumunu kontrol et
docker-compose -f docker-compose.supabase.yml ps
```

### 4. Veritabanı Kurulumu

Veritabanı otomatik olarak şu dosyalarla kurulur:
- `docs/database-schema.sql` - Ana şema
- `docs/customer_embeding_functions.sql` - Vector search fonksiyonları

#### Manuel kurulum gerekirse:
```bash
# PostgreSQL container'a bağlan
docker exec -it supabase-db psql -U postgres -d postgres

# SQL dosyalarını çalıştır
\i /docker-entrypoint-initdb.d/01-schema.sql
\i /docker-entrypoint-initdb.d/02-functions.sql
```

### 5. Servis Durumu Kontrolü

#### Sağlık Kontrolü
```bash
# PostgreSQL
curl http://localhost:5432
# veya
docker exec supabase-db pg_isready -U postgres

# Auth Service
curl http://localhost:9999/health

# REST API
curl http://localhost:3000/

# Realtime
curl http://localhost:4000/

# Storage
curl http://localhost:5000/status

# Kong Gateway
curl http://localhost:8000/
```

#### Beklenen Portlar
```
5432  - PostgreSQL
8000  - Kong Gateway (Ana API)
8001  - Kong Admin API
9999  - GoTrue Auth
3000  - PostgREST API
4000  - Realtime
5000  - Storage
```

### 6. Frontend Konfigürasyonu

#### .env.local dosyası (Next.js)
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NjY1MTM4MCwiZXhwIjo0OTEyMzI0OTgwLCJyb2xlIjoiYW5vbiJ9.tDEh7l2zecY6zLl19zVT3U_e7seWAiuBMcdnCcq2Jxo
```

### 7. Test Etme

#### Google OAuth Test
1. Frontend uygulamasını başlatın: `npm run dev`
2. http://localhost:3000/auth/login sayfasına gidin
3. "Google ile Giriş Yap" butonuna tıklayın
4. Google hesabınızla giriş yapın
5. Dashboard'a yönlendirildiğinizi kontrol edin

#### API Test
```bash
# Anon key ile test
curl -H "apikey: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NjY1MTM4MCwiZXhwIjo0OTEyMzI0OTgwLCJyb2xlIjoiYW5vbiJ9.tDEh7l2zecY6zLl19zVT3U_e7seWAiuBMcdnCcq2Jxo" \
     http://localhost:8000/rest/v1/customers

# Service role ile test
curl -H "apikey: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NjY1MTM4MCwiZXhwIjo0OTEyMzI0OTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cZoxspdisEpO8BQh-EGiMtOGTqhjnLGzP92Y7IPuCrw" \
     http://localhost:8000/rest/v1/customer_embeding
```

## 🔧 Yaygın Sorunlar ve Çözümler

### Port Çakışması
```bash
# Kullanılan portları kontrol et
netstat -tulpn | grep :8000

# Docker containers'ı durdur
docker-compose -f docker-compose.supabase.yml down
```

### Database Bağlantı Hatası
```bash
# PostgreSQL loglarını kontrol et
docker logs supabase-db

# Container'ı yeniden başlat
docker-compose -f docker-compose.supabase.yml restart db
```

### Google OAuth Hatası
1. **Redirect URI Mismatch**:
   - Google Console'da redirect URI'ları kontrol edin
   - `http://localhost:8000/auth/v1/callback` olmalı

2. **Client ID/Secret Hatası**:
   - `.env` dosyasındaki Google OAuth değerlerini kontrol edin
   - Boşluk ve özel karakterlere dikkat edin

### CORS Hatası
```bash
# Kong konfigürasyonunu kontrol et
docker exec supabase-kong cat /var/lib/kong/kong.yml

# Kong'u yeniden başlat
docker-compose -f docker-compose.supabase.yml restart kong
```

## 📚 Gelişmiş Konfigürasyon

### SSL/HTTPS Kurulumu
Production ortamında SSL sertifikası eklemek için:

1. `kong.yml` dosyasında SSL konfigürasyonu
2. Let's Encrypt ile otomatik sertifika yenileme
3. Nginx proxy ile SSL termination

### Monitoring ve Logging
```bash
# Tüm servis logları
docker-compose -f docker-compose.supabase.yml logs -f

# Belirli servis logları
docker logs supabase-auth -f
docker logs supabase-db -f
```

### Backup Stratejisi
```bash
# PostgreSQL backup
docker exec supabase-db pg_dump -U postgres postgres > backup.sql

# Otomatik backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec supabase-db pg_dump -U postgres postgres > backups/backup_$DATE.sql
```

## 🚀 Production Deployment

### Docker Production Konfigürasyonu
1. Environment variables'ları production değerleriyle güncelleyin
2. SSL sertifikalarını ekleyin
3. Monitoring ve alerting kurun
4. Backup stratejisi uygulayın
5. Load balancer ekleyin

### Güvenlik Hardening
```env
# Production environment variables
GOTRUE_SITE_URL=https://your-domain.com
GOTRUE_URI_ALLOW_LIST=https://your-domain.com
POSTGRES_PASSWORD=very-strong-production-password
JWT_SECRET=production-jwt-secret-32-characters
```

## 📞 Destek

### Useful Commands
```bash
# Tüm servisleri yeniden başlat
docker-compose -f docker-compose.supabase.yml restart

# Sadece auth servisini yeniden başlat
docker-compose -f docker-compose.supabase.yml restart auth

# Database'i sıfırla (DİKKAT: Tüm data silinir)
docker-compose -f docker-compose.supabase.yml down -v
docker-compose -f docker-compose.supabase.yml up -d
```

### Debug Bilgileri
```bash
# Container durumları
docker ps -a

# Network bilgileri
docker network ls
docker network inspect supabase_network

# Volume bilgileri
docker volume ls
docker volume inspect n8n_rag_chatbot_postgres_data
```