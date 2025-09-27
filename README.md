# N8N RAG Chat Dashboard - OSİDİEN Projesi

## 🎯 Proje Genel Bakışı

N8N Chat UI tabanlı RAG (Retrieval Augmented Generation) chat dashboard sistemi. Self-hosted Supabase + Coolify üzerinde çalışan, çok kiracılı (multi-tenant) bir SaaS platformu.

## 🏗️ Teknik Stack

### Backend & Database
- **Supabase (Self-hosted)**: PostgreSQL + Auth + Storage + Vector DB
- **Coolify**: Container orchestration ve deployment
- **n8n**: Workflow automation ve chat processing
- **OpenAI API**: Embeddings ve chat completion

### Frontend
- **Next.js 14**: React framework (App Router)
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Supabase JS Client**: Database ve auth integration

## 📁 Proje Yapısı

```
n8n-rag-chatbot/
├── 📚 docs/                    # Teknik dokümantasyon
│   ├── database-schema.sql     # Veritabanı şeması
│   ├── n8n-workflows/          # N8N workflow dosyaları
│   └── deployment-guide.md     # Deployment rehberi
├── 🖥️ frontend/                # Next.js uygulaması
│   ├── src/
│   │   ├── app/                # App Router (Next.js 14)
│   │   │   ├── (auth)/         # Authentication sayfaları
│   │   │   ├── dashboard/      # Dashboard sayfaları
│   │   │   ├── admin/          # Admin paneli
│   │   │   └── widget/         # Chat widget
│   │   ├── components/         # Tekrar kullanılabilir componentler
│   │   │   ├── ui/             # UI componentleri
│   │   │   ├── auth/           # Auth componentleri
│   │   │   ├── dashboard/      # Dashboard componentleri
│   │   │   └── admin/          # Admin componentleri
│   │   ├── lib/                # Utility kütüphaneleri
│   │   │   ├── supabase.ts     # Supabase client
│   │   │   ├── auth.ts         # Auth helpers
│   │   │   └── utils.ts        # Genel utilities
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript type definitions
│   │   └── i18n/               # Çoklu dil desteği (TR/EN)
│   ├── public/                 # Static dosyalar
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── 🔧 backend/                 # Backend servisleri
│   ├── src/
│   │   ├── services/           # Business logic servisleri
│   │   │   ├── document.ts     # Doküman işleme
│   │   │   ├── embedding.ts    # OpenAI embedding
│   │   │   ├── vector.ts       # Vector arama
│   │   │   └── webhook.ts      # N8N webhook handlers
│   │   ├── utils/              # Backend utilities
│   │   ├── types/              # TypeScript types
│   │   └── middleware/         # Express middleware
│   ├── package.json
│   └── tsconfig.json
├── 🐳 docker/                  # Docker konfigürasyonları
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── 📊 monitoring/              # Monitoring ve logging
├── 🧪 tests/                   # Test dosyaları
├── 📋 scripts/                 # Deployment ve utility scriptleri
├── .env.example                # Environment variables template
├── .gitignore
├── package.json                # Root package.json (workspace)
└── README.md                   # Bu dosya
```

## 🎨 Sistem Mimarisi

```
[Müşteri Dashboard] → [Supabase Auth] → [Document Upload] → [n8n Processing] → [Vector Storage] → [Chat Widget] → [RAG Workflow]
```

## 🔐 Güvenlik ve Yetkilendirme

### Multi-Tenant Yapı
- Her müşteri sadece kendi verilerini görebilir
- RLS (Row Level Security) politikaları
- Admin/Manager/Guest seviyeleri

### Gelişmiş Güvenlik
- Hash-based user verification
- Rate limiting (per-user ve per-domain)
- Domain whitelist
- Data encryption

## 🌐 Çoklu Dil Desteği

- **Türkçe (TR)**: Ana dil
- **İngilizce (EN)**: İkincil dil
- React i18n ile dinamik dil değişimi
- Tüm UI componentleri çoklu dil destekli

## 📱 Admin Paneli Özellikleri

### Dashboard Analitiği
- Chat kullanım istatistikleri
- Doküman upload raporları
- Kullanıcı aktivite takibi
- Performans metrikleri

### Kullanıcı Yönetimi
- Kullanıcı listeleme/arama
- Rol bazlı yetki yönetimi
- Hesap durumu kontrolü
- Kullanım limitleri

### Widget Yönetimi
- Chat widget oluşturma/düzenleme
- Özelleştirilebilir görünüm
- Embed kod üretimi
- Widget performans takibi

### Doküman Yönetimi
- Toplu doküman yükleme
- Doküman kategorilendirme
- Chunk ve embedding durumu
- Vector arama optimizasyonu

## 🚀 Başlangıç Rehberi

### Geliştirme Ortamı Kurulumu

1. **Repository klonlama**
   ```bash
   git clone <repo-url>
   cd n8n-rag-chatbot
   ```

2. **Dependencies kurulumu**
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Environment variables**
   ```bash
   cp .env.example .env
   # .env dosyasını kendi değerlerinizle doldurun
   ```

4. **Database setup**
   ```bash
   # Supabase CLI ile schema kurulumu
   supabase db reset
   ```

5. **Development server**
   ```bash
   npm run dev
   ```

## 🔧 Teknoloji Detayları

### Frontend Teknolojileri
- **Next.js 14**: App Router, Server Components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form yönetimi
- **Zustand**: State management
- **React Query**: Server state yönetimi

### Backend Teknolojileri
- **Express.js**: Web framework
- **Supabase**: Database ve auth
- **OpenAI API**: Embeddings ve completion
- **Multer**: File upload handling
- **PDF-Parse**: PDF text extraction
- **Mammoth**: DOCX text extraction

## 📈 Özellikler

### Temel Özellikler
- ✅ Email/password authentication
- ✅ Document upload (PDF, DOCX, TXT)
- ✅ Automatic text chunking ve embedding
- ✅ RAG-powered chat
- ✅ Customizable chat widgets
- ✅ Multi-tenant architecture

### Gelişmiş Özellikler
- ✅ Real-time chat streaming
- ✅ File upload in chat
- ✅ Voice input support
- ✅ Follow-up prompts
- ✅ Custom metadata injection
- ✅ Analytics dashboard

### Enterprise Özellikler
- ✅ Advanced rate limiting
- ✅ Domain whitelisting
- ✅ Custom branding
- ✅ API endpoints
- ✅ Webhook integrations
- ✅ Multi-language support

## 🔄 N8N Workflow Entegrasyonu

### Workflow Şablonları
- **Document Processing**: Upload → Extract → Chunk → Embed → Store
- **Chat Handling**: Trigger → Context → RAG → Response
- **Analytics**: Usage tracking ve reporting

### Webhook Formatları
- Chat input/output standardization
- Metadata handling
- Error handling ve fallbacks

## 📊 Veritabanı Şeması

### Ana Tablolar
- `customers`: Müşteri bilgileri
- `chat_widgets`: Widget konfigürasyonları
- `documents`: Yüklenen dokümanlar
- `document_chunks`: Chunked content + embeddings
- `chat_sessions`: Chat oturum takibi
- `analytics`: Kullanım istatistikleri

### Vector Arama
- pgvector extension
- Cosine similarity search
- Performance optimized indexes

## 🚀 Deployment

### Production Ortamı
- **Coolify**: Container orchestration
- **Supabase**: Self-hosted database
- **N8N**: Self-hosted workflow engine
- **CDN**: Static asset delivery

### Monitoring
- Application metrics
- Database performance
- Chat response times
- Error tracking

## 🎯 Hedef Pazarlar

### Benzer Platformlar
- [Chatbase.co](https://www.chatbase.co)
- [Droxy.ai](https://www.droxy.ai)
- [N8N Chat UI](https://n8nchatui.com)

### Rekabet Avantajları
- Self-hosted çözüm
- N8N workflow esnekliği
- Gelişmiş güvenlik özellikleri
- Türkçe dil desteği
- Enterprise-ready features

## 📚 Dokümantasyon

### Teknik Dokümantasyon
- API referansı
- Database schema guide
- N8N workflow örnekleri
- Deployment rehberi

### Kullanıcı Rehberleri
- Admin paneli kullanımı
- Widget oluşturma rehberi
- Doküman yönetimi
- Analytics raporları

## 🤝 Katkıda Bulunma

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Create pull request

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakınız.

---

**Not**: Bu proje Türkiye merkezli müşteriler için özel olarak geliştirilmiştir ve Türkçe dil desteği önceliklidir.