# N8N Workflow Templates - RAG Chat Dashboard

Bu klasör N8N RAG Chat Dashboard projesi için hazırlanmış workflow şablonlarını içerir.

## 🔄 Workflow Listesi

### 1. Chat RAG Workflow (`chat-rag-workflow.json`)
**Ana chat işlevselliği için temel workflow**

#### Özellikler:
- ✅ Webhook chat trigger
- ✅ Kullanıcı girdi analizi ve metadata işleme
- ✅ Dosya upload desteği (PDF, DOCX, TXT)
- ✅ OpenAI embedding generation
- ✅ Vector search (Supabase pgvector)
- ✅ RAG context building
- ✅ OpenAI GPT chat completion
- ✅ Türkçe yanıt formatlaması
- ✅ Follow-up prompts generation
- ✅ Analytics tracking
- ✅ Error handling

#### Workflow Akışı:
```
Chat Trigger → Parse Input → Check Files → Generate Embedding → Vector Search → Build Context → OpenAI Chat → Format Response → Track Analytics → Respond
```

#### Environment Variables:
```env
BACKEND_URL=https://your-backend.com
BACKEND_API_KEY=your-backend-api-key
OPENAI_API_KEY=your-openai-key
```

### 2. Document Processing Workflow (`document-processing-workflow.json`)
**Doküman yükleme ve işleme için workflow**

#### Özellikler:
- ✅ Webhook document trigger
- ✅ Text extraction (PDF, DOCX, TXT)
- ✅ Intelligent text chunking
- ✅ Batch embedding generation
- ✅ Vector storage
- ✅ Processing status tracking
- ✅ Completion notifications
- ✅ Error handling ve recovery

#### Workflow Akışı:
```
Document Trigger → Parse Request → Extract Text → Process Text → Chunk Document → Batch Process → Generate Embeddings → Store Chunks → Mark Complete → Notify
```

## 🚀 Kurulum Rehberi

### 1. N8N Import İşlemi

1. **N8N dashboard'a giriş yapın**
2. **Workflows sekmesine gidin**
3. **"Import from file" butonuna tıklayın**
4. **JSON dosyalarını tek tek import edin**

### 2. Environment Variables Ayarları

N8N Settings > Environment Variables bölümünden aşağıdaki değişkenleri tanımlayın:

```env
# Backend API
BACKEND_URL=https://your-backend-api.com
BACKEND_API_KEY=your-secret-api-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Supabase (Direct kullanım için)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Webhook URL'leri

Import edilen workflow'lar otomatik webhook URL'leri oluşturacaktır:

```
# Chat Workflow
https://your-n8n.com/webhook/chat/{widgetId}

# Document Processing
https://your-n8n.com/webhook/documents/process/{customerId}
```

## 🔧 Konfigürasyon Detayları

### Chat Workflow Konfigürasyonu

#### 1. Webhook Node Ayarları
```json
{
  "httpMethod": "POST",
  "path": "chat/{{ $nodeParameters['widgetId'] }}",
  "responseMode": "responseNode"
}
```

#### 2. OpenAI Chat Completion Ayarları
```json
{
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

#### 3. Vector Search Parametreleri
```json
{
  "limit": 5,
  "threshold": 0.7,
  "similarity_function": "cosine"
}
```

### Document Processing Konfigürasyonu

#### 1. Text Chunking Parametreleri
```javascript
const chunkSize = 1000; // characters
const chunkOverlap = 200; // characters
```

#### 2. Batch Processing
```javascript
const batchSize = 5; // chunks per batch
const timeout = 120000; // 2 minutes
```

## 📊 Response Formatları

### Chat Response Format
```json
{
  "output": "AI yanıtı burada",
  "followUpPrompts": [
    "Daha fazla bilgi alabilir miyim?",
    "Bu konuda başka neler var?",
    "Başka nasıl yardım edebilirsiniz?"
  ],
  "metadata": {
    "responseTime": "1234ms",
    "hasContext": true,
    "sourceCount": 3,
    "timestamp": "2024-03-21T10:00:00.000Z",
    "locale": "tr"
  },
  "attachments": [
    {
      "type": "document",
      "filename": "example.pdf",
      "similarity": "85%"
    }
  ]
}
```

### Error Response Format
```json
{
  "output": "Üzgünüm, teknik bir sorun yaşıyoruz.",
  "followUpPrompts": [
    "Tekrar deneyin",
    "Farklı bir soru sorun",
    "Destek ile iletişime geçin"
  ],
  "metadata": {
    "error": true,
    "timestamp": "2024-03-21T10:00:00.000Z",
    "locale": "tr"
  }
}
```

## 🛡️ Güvenlik Ayarları

### 1. API Authentication
Tüm backend API çağrıları Bearer token ile authentication kullanır:

```http
Authorization: Bearer your-backend-api-key
```

### 2. CORS Settings
```json
{
  "cors": {
    "allowedOrigins": "*",
    "allowedMethods": ["POST"],
    "allowedHeaders": ["Content-Type", "Authorization"]
  }
}
```

### 3. Rate Limiting
Backend API rate limiting ile korunmuştur:
- 60 request/minute per user
- 1000 request/hour per user

## 📈 Monitoring ve Analytics

### 1. Workflow Execution Tracking
N8N otomatik olarak her workflow execution'ı takip eder:
- Execution time
- Success/failure rates
- Error logs

### 2. Custom Analytics
Workflow'lar custom analytics tracking içerir:
- Chat interaction metrics
- Document processing stats
- User engagement data

### 3. Error Monitoring
```javascript
// Error handling pattern
try {
  // Workflow logic
} catch (error) {
  console.error('Workflow Error:', {
    error: error.message,
    timestamp: new Date().toISOString(),
    customerId: $json.customerId,
    context: $json
  });
}
```

## 🔄 Workflow Maintenance

### 1. Regular Updates
- Workflow'ları düzenli olarak güncelleyin
- API endpoint'leri değişikliklerini takip edin
- Error handling'i iyileştirin

### 2. Performance Optimization
- Timeout değerlerini optimize edin
- Batch size'ları ayarlayın
- Memory usage'ı kontrol edin

### 3. Testing
```bash
# Webhook test
curl -X POST "https://your-n8n.com/webhook/chat/test-widget" \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Test message",
    "metadata": {
      "customerId": "test-customer",
      "widgetId": "test-widget"
    }
  }'
```

## 🆘 Troubleshooting

### Yaygın Sorunlar:

1. **Webhook 404 Error**
   - Workflow'un aktif olduğunu kontrol edin
   - Webhook path'ini doğrulayın

2. **OpenAI API Errors**
   - API key'in geçerli olduğunu kontrol edin
   - Rate limiting kontrolü yapın

3. **Database Connection Issues**
   - Backend API health check yapın
   - Database credentials'ları kontrol edin

4. **Embedding Generation Timeouts**
   - Batch size'ı küçültün
   - Timeout değerlerini artırın

### Debug Modu:
N8N workflow'larında debug için console.log kullanın:

```javascript
console.log('Debug Info:', {
  step: 'current-step',
  data: $json,
  timestamp: new Date().toISOString()
});
```

---

## 📚 Ek Kaynaklar

- [N8N Documentation](https://docs.n8n.io/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-embeddings)

---

**Son Güncelleme**: 2024-03-21
**Workflow Version**: 1.0
**Uyumluluk**: N8N v1.0+