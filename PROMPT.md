# N8N RAG Chat Dashboard Projesi - Detaylı Prompt

## Proje Genel Bakışı

N8N Chat UI benzeri bir RAG (Retrieval Augmented Generation) chat dashboard sistemi geliştiriyoruz. Sistem self-hosted Supabase + Coolify üzerinde çalışacak.

## Teknik Stack

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

## Mevcut Durum

- Coolify + Supabase self-hosted çalışıyor durumda
- Vector extension aktif
- OpenAI API kullanımı mevcut
- Embedding işlemleri yapılabiliyor

## Sistem Mimarisi

```
[Müşteri Dashboard] → [Supabase Auth] → [Document Upload] → [n8n Processing] → [Vector Storage] → [Chat Widget] → [RAG Workflow]
```

## Gereksinimler

### 1. Authentication System
- Email/password ile kayıt
- Email doğrulama (SMTP entegrasyonu)
- Dashboard access control
- Multi-tenant yapı (her müşteri kendi verilerini görür)

### 2. Document Management
- PDF, DOCX, TXT dosya desteği
- Dashboard üzerinden upload
- Automatic text extraction
- Chunking (1000 karakter, 200 overlap)
- OpenAI embedding generation
- Vector storage (Supabase)

### 3. Chat Widget System
- Her müşteri için unique chat widget
- Embed kod generation
- n8n webhook integration
- Customizable appearance

### 4. RAG Workflow (n8n)
```
Chat Trigger → Extract Customer Info → Generate Query Embedding → Vector Search → Build Context → AI Response → Respond to Chat
```

## Database Schema

```sql
-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Widgets  
CREATE TABLE chat_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  name TEXT NOT NULL,
  webhook_url TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  widget_id UUID REFERENCES chat_widgets(id),
  filename TEXT NOT NULL,
  file_size BIGINT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Chunks with Embeddings
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  customer_id UUID REFERENCES customers(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding size
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector search index
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Supabase Vector Search Function

```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  filter_customer_id uuid,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  content text,
  document_filename text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.content,
    d.filename as document_filename,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.customer_id = filter_customer_id
    AND 1 - (dc.embedding <=> query_embedding) > 0.7
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Backend Response Format

### Required Response Structure
```json
{
  "output": "Your response text to render"
}
```

### Optional Response Fields
```json
{
  "output": "Merhaba! Size nasıl yardımcı olabilirim?",
  "followUpPrompts": [
    "Ürün bilgisi istiyorum",
    "Fiyat öğrenmek istiyorum", 
    "Destek talebi oluştur"
  ],
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "alt": "Product image"
    }
  ]
}
```

### n8n Response Node Configuration
```json
{
  "name": "Respond to Chat",
  "type": "n8n-nodes-langchain.respondToChat",
  "parameters": {
    "respondWith": "json",
    "jsonOutput": {
      "output": "={{ JSON.stringify($json.ai_response) }}",
      "followUpPrompts": "={{ JSON.stringify(['Daha fazla bilgi', 'Başka soru sor', 'Destek talep et']) }}"
    }
  }
}
```

### Custom Backend Response Format
```javascript
// Express.js endpoint örneği
app.post('/chat/:widgetId', async (req, res) => {
  try {
    const { chatInput, metadata, sessionId } = req.body
    
    // RAG processing
    const context = await searchDocuments(metadata.customerId, chatInput)
    const aiResponse = await generateResponse(context, chatInput)
    
    // Required response format
    res.json({
      output: aiResponse,
      followUpPrompts: [
        "Daha detaylı bilgi alabilir miyim?",
        "Başka konularda yardım",
        "Bu konuyla ilgili dokümanlar"
      ]
    })
  } catch (error) {
    res.status(500).json({ output: "Üzgünüm, bir hata oluştu." })
  }
})
```

### Default Metadata
Widget otomatik olarak her mesajla birlikte şu metadata'ları gönderir:

```json
{
  "clientCurrentDateTime": "2024-03-21T14:30:45.123Z",
  "clientCurrentTimezone": "Europe/Istanbul", 
  "clientQueryParams": {"utm_source": "google", "ref": "homepage"},
  "clientUserAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
}
```

### Custom Metadata Configuration
```javascript
// Chat widget embed kodu
createChat({
  webhookUrl: 'https://your-n8n.com/webhook/abc123',
  metadata: {
    customerId: 'customer_12345',
    widgetId: 'widget_abc',
    companyName: 'Acme Corp',
    userRole: 'admin',
    subscription: 'premium',
    customFields: {
      department: 'sales',
      priority: 'high'
    }
  }
})
```

### File Upload & Voice Input
- File upload sırasında metadata string olarak gönderilir
- Voice input sırasında metadata string olarak gönderilir
- n8n workflow'unda `JSON.parse()` ile parse etmek gerekir

```javascript
// n8n workflow'unda metadata parsing
const metadata = typeof $json.metadata === 'string' ? 
  JSON.parse($json.metadata) : 
  $json.metadata;
```

### Chat Trigger Node
```json
{
  "name": "Chat Trigger",
  "type": "n8n-nodes-langchain.chatTrigger",
  "parameters": {
    "mode": "hostedChat",
    "options": {
      "loadPreviousSession": "fromMemory",
      "responseMode": "responseNode"
    }
  }
}
```

### Vector Search Integration
```json
{
  "name": "Search Documents",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.SUPABASE_URL }}/rest/v1/rpc/search_documents",
    "headers": {
      "apikey": "{{ $env.SUPABASE_ANON_KEY }}",
      "Content-Type": "application/json"
    },
    "body": {
      "query_embedding": "={{ $json.data[0].embedding }}",
      "filter_customer_id": "={{ $json.customer_id }}",
      "match_count": 3
    }
  }
}
```

## Chat Widget Generation

### Widget Embed Code Template
```javascript
// Dashboard'da müşterilere verilen embed kodu
function generateChatWidget(customerId, widgetId, settings) {
  return `
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'
  
  createChat({
    webhookUrl: '${process.env.N8N_WEBHOOK_BASE_URL}/${widgetId}',
    metadata: {
      customerId: '${customerId}',
      widgetId: '${widgetId}',
      companyName: '${settings.companyName || ''}',
      // Diğer custom metadata buraya eklenebilir
    },
    theme: ${JSON.stringify(settings.theme)},
    chatSessionKey: '${customerId}_${widgetId}',
    initialMessages: ['${settings.welcomeMessage}'],
    allowFileUploads: ${settings.allowFileUploads || false},
    allowedFileTypes: '${settings.allowedFileTypes || 'image/*,application/pdf'}',
    showWelcomeScreen: true
  })
</script>`
}
```

### Advanced Widget Configuration
```javascript
// Gelişmiş widget ayarları
const widgetConfig = {
  webhookUrl: webhookUrl,
  metadata: {
    customerId: customerId,
    widgetId: widgetId,
    companyName: companyName,
    userRole: 'visitor', // dinamik olarak belirlenebilir
    pageUrl: window.location.href,
    sessionStart: new Date().toISOString()
  },
  theme: {
    primaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#1f2937'
  },
  chatSessionKey: `${customerId}_${widgetId}`,
  initialMessages: [welcomeMessage],
  allowFileUploads: true,
  allowedFileTypes: 'image/*,application/pdf,text/*',
  maxFileSize: '10MB',
  showWelcomeScreen: true,
  mode: 'window', // 'window' veya 'fullscreen'
  // Streaming responses için
  enableStreaming: true
}
```

### 1. Landing Page (/)
- Sistem tanıtımı
- Pricing
- Sign up call-to-action

### 2. Authentication (/auth)
- Sign up form
- Sign in form  
- Email verification page
- Password reset

### 3. Dashboard (/dashboard)
- Document management
- Chat widget management
- Analytics
- Settings

### 4. Chat Widget (/widget/[id])
- Embeddable chat interface
- n8n webhook integration

## Enhanced Features

### Chat Streaming Support
```javascript
// Widget configuration for streaming
createChat({
  webhookUrl: webhookUrl,
  enableStreaming: true, // Real-time response streaming
  metadata: { customerId, widgetId }
})
```

### File Upload Integration
```json
// n8n workflow'unda file handling
{
  "name": "Handle File Upload",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "// File upload durumunda metadata string olarak gelir\nconst metadata = JSON.parse($json.metadata);\nconst files = $json.files || [];\n\n// Dosya bilgilerini işle\nconst fileInfo = files.map(file => ({\n  name: file.filename,\n  size: file.size,\n  type: file.mimeType,\n  url: file.url\n}));\n\nreturn [{\n  json: {\n    customer_id: metadata.customerId,\n    user_query: $json.chatInput,\n    files: fileInfo,\n    has_files: files.length > 0\n  }\n}];"
  }
}
```

### Voice Input Support
```javascript
// Voice input configuration
createChat({
  webhookUrl: webhookUrl,
  allowVoiceInput: true,
  voiceSettings: {
    language: 'tr-TR',
    autoSend: true
  },
  metadata: { customerId, widgetId }
})
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# n8n
N8N_WEBHOOK_BASE_URL=https://your-n8n-domain.com/webhook
```

## Geliştirme Adımları

### Fase 1: Temel Setup
1. Next.js projesi kurulumu
2. Supabase client konfigürasyonu
3. Database schema oluşturma
4. Basic authentication

### Fase 2: Document Management
1. File upload komponenti
2. Text extraction ve chunking
3. Embedding generation
4. Vector storage

### Fase 3: Chat System
1. Chat widget development
2. n8n workflow setup
3. RAG integration
4. Response handling

### Fase 4: Dashboard
1. Document management UI
2. Chat widget management
3. Analytics dashboard
4. Settings sayfası

## Önemli Kararlar

- **Document Upload Method**: Dashboard üzerinden direct upload
- **Authentication**: Supabase Auth ile email verification
- **File Storage**: Supabase Storage
- **Vector Database**: SELF HOST Supabase PostgreSQL + pgvector
- **Chat Processing**: n8n workflows
- **Deployment**: Coolify container management

## İleriye Dönük Planlar

- Multi-language support
- Advanced analytics
- API endpoints
- Webhook integrations
- Custom branding options
- Enterprise features

Bu prompt ile birlikte Claude Code kullanarak hem frontend hem backend geliştirmesini aynı anda yapabiliriz.

 **Secure Identity System** - Hash-based user verification
2. **Role-based Document Access** - Admin/Manager/Guest seviyeleri
3. **Advanced Rate Limiting** - Per-user ve per-domain kontroller
4. **Enterprise Security** - Domain whitelist, encryption
5. **Custom Metadata Injection** - User context'li AI responses
Örnek alınacak siteler 
https://www.chatbase.co
https://www.droxy.ai
https://n8nchatui.com

Bu özelliklerin hepsi N8N workflow'larında rahatlıkla implement edilebilir ve bize **büyük competitive advantage** sağlar.