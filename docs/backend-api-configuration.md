# Backend API Konfigürasyonu - N8N İçin

## 🤔 Backend API Nedir?

N8N workflow'larında `BACKEND_URL` ve `BACKEND_API_KEY`, oluşturduğumuz Express.js backend API'sine erişim için kullanılır.

## 🔧 Konfigürasyon Seçenekleri

### Seçenek 1: Backend API Kullanmak (Önerilen)

#### 1.1 Backend API'yi Çalıştırın
```bash
cd backend
npm install
npm run dev  # Development için
# veya
npm run build && npm start  # Production için
```

#### 1.2 Environment Variables
```env
# N8N'de ayarlanacak
BACKEND_URL=http://localhost:3001  # Development
# veya
BACKEND_URL=https://your-deployed-backend.com  # Production

# Backend API anahtarı (backend/.env dosyasında oluşturun)
BACKEND_API_KEY=your-secret-api-key-12345
```

### Seçenek 2: Backend API Olmadan (Sadece Supabase)

N8N workflow'larını backend API olmadan çalıştırmak için:

#### 2.1 Sadece Supabase Kullanımı
```env
# N8N'de sadece bunlar yeterli
SUPABASE_URL=https://your-supabase-instance.com
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
```

#### 2.2 Güncellenmiş N8N Workflow (Backend'siz)