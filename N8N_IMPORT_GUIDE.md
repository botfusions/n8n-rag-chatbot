# 🔄 N8N Workflow Import ve Test Rehberi

## 📋 İmport Edilecek Workflow'lar

### ⭐ Öncelikli Workflow'lar:
1. **corrected-chat-rag-workflow.json** - Ana chat işlevselliği (ChatTrigger ile)
2. **supabase-only-chat-workflow.json** - Backend API olmadan çalışan versiyon
3. **improved-document-processing-workflow.json** - Geliştirilmiş döküman işleme

## 🚀 Adım Adım Import Rehberi

### 1. N8N'e Giriş ve Hazırlık

1. **N8N Dashboard'a giriş yapın**
2. **"Workflows" sekmesine tıklayın**
3. **"Add Workflow" > "Import" seçeneğini seçin**

### 2. Environment Variables Kurulumu

**Önce gerekli environment variables'ları ayarlayın:**

#### N8N Settings > Environment Variables:

```env
# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Supabase (Direct kullanım için)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Backend API (isteğe bağlı)
BACKEND_URL=https://your-backend-api.com
BACKEND_API_KEY=your-secret-api-key

# N8N Webhook Base URL
N8N_WEBHOOK_URL=https://your-n8n-instance.com
```

### 3. Workflow Import Sırası

#### 🔥 1. Chat Workflow Import (Öncelik 1)

**Dosya:** `corrected-chat-rag-workflow.json`

1. **Import edin**
2. **"Chat Trigger" node'unu kontrol edin**
3. **Webhook ID'yi not alın**
4. **Environment variables bağlantılarını kontrol edin**
5. **Workflow'u aktif hale getirin**

**Test URL:** `https://your-n8n.com/webhook/chat/{widgetId}`

#### 🔥 2. Supabase-Only Chat Workflow (Öncelik 2)

**Dosya:** `supabase-only-chat-workflow.json`

1. **Import edin**
2. **Supabase connection'ları kontrol edin**
3. **OpenAI API bağlantısını doğrulayın**
4. **Workflow'u aktif hale getirin**

#### 🔥 3. Document Processing Workflow (Öncelik 3)

**Dosya:** `improved-document-processing-workflow.json`

1. **Import edin**
2. **File processing node'larını kontrol edin**
3. **Chunking parametrelerini ayarlayın**
4. **Batch processing ayarlarını kontrol edin**

## 🧪 Test Senaryoları

### Test 1: Chat Workflow Basit Test

```bash
curl -X POST "https://your-n8n.com/webhook/chat/test-widget" \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Merhaba, nasıl yardım edebilirsiniz?",
    "sessionId": "test-session-001",
    "metadata": {
      "customerId": "test-customer",
      "widgetId": "test-widget",
      "companyName": "Test Company",
      "locale": "tr"
    }
  }'
```

**Beklenen Yanıt:**
```json
{
  "output": "Merhaba! Size nasıl yardım edebilirim?",
  "followUpPrompts": [
    "Hangi konularda yardım edebilirsiniz?",
    "Ürünleriniz hakkında bilgi alabilir miyim?",
    "Destek nasıl alabilirim?"
  ],
  "metadata": {
    "responseTime": "1234ms",
    "hasContext": false,
    "locale": "tr"
  }
}
```

### Test 2: Vector Search Test

```bash
curl -X POST "https://your-n8n.com/webhook/chat/test-widget" \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Ürün fiyatları nedir?",
    "sessionId": "test-session-002",
    "metadata": {
      "customerId": "test-customer",
      "widgetId": "test-widget",
      "companyName": "Test Company",
      "locale": "tr"
    }
  }'
```

### Test 3: Document Processing Test

```bash
curl -X POST "https://your-n8n.com/webhook/document-processing" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "test-doc-001",
    "filePath": "documents/test-customer/test.pdf",
    "customerId": "test-customer",
    "widgetId": "test-widget",
    "filename": "test-document.pdf",
    "fileType": "application/pdf",
    "fileSize": 1024000
  }'
```

## ✅ Test Kontrol Listesi

### Chat Workflow Kontrolü:
- [ ] Webhook URL'i çalışıyor
- [ ] ChatTrigger node aktif
- [ ] OpenAI API bağlantısı çalışıyor
- [ ] Supabase vector search çalışıyor
- [ ] Türkçe yanıtlar alınıyor
- [ ] Follow-up prompts oluşturuluyor
- [ ] Error handling çalışıyor

### Document Processing Kontrolü:
- [ ] Dosya upload webhook'u çalışıyor
- [ ] Text extraction çalışıyor
- [ ] Chunking doğru yapılıyor
- [ ] Embedding generation çalışıyor
- [ ] Vector storage çalışıyor
- [ ] Status update'ler yapılıyor

### Supabase-Only Workflow Kontrolü:
- [ ] Backend API olmadan çalışıyor
- [ ] Direct Supabase RPC çağrıları çalışıyor
- [ ] Authentication doğru yapılıyor
- [ ] Vector search performansı iyi

## 🐛 Troubleshooting

### Yaygın Sorunlar:

#### 1. Webhook 404 Error
```
Çözüm:
- Workflow'un aktif olduğunu kontrol edin
- Webhook path'ini doğrulayın
- N8N restart yapın
```

#### 2. OpenAI API Error
```
Çözüm:
- API key'in doğru olduğunu kontrol edin
- Credit limitini kontrol edin
- Request format'ını kontrol edin
```

#### 3. Supabase Connection Error
```
Çözüm:
- URL ve key'lerin doğru olduğunu kontrol edin
- RLS policies'i kontrol edin
- Network connectivity kontrol edin
```

#### 4. Vector Search No Results
```
Çözüm:
- Döküman var mı kontrol edin
- Similarity threshold'u düşürün
- Embedding model'i kontrol edin
```

## 📊 Monitoring

### N8N Dashboard'da İzlenecekler:
- Execution success rate
- Average execution time
- Error frequency
- Memory usage

### Log Monitoring:
```javascript
// Workflow'larda debug için
console.log('Debug Info:', {
  step: 'current-step',
  data: $json,
  timestamp: new Date().toISOString(),
  customerId: $json.customerId
});
```

## 🔧 Performance Optimization

### Chat Workflow:
- Response time < 3 saniye
- Memory usage < 512MB
- Concurrent requests: 10+

### Document Processing:
- Processing time < 30 saniye per document
- Chunk size: 1000 characters
- Batch size: 5 chunks

## 📈 Success Metrics

### Test Başarı Kriterleri:
- ✅ Chat response time < 3s
- ✅ Document processing < 30s
- ✅ Error rate < 5%
- ✅ Vector search relevancy > 70%
- ✅ Turkish language accuracy > 90%

---

## 🎯 Sonraki Adımlar

1. **Production Environment Setup**
2. **Performance Monitoring Setup**
3. **Error Alerting Configuration**
4. **Scale Testing**

**Bu rehberi takip ederek N8N workflow'larınızı başarıyla aktarabilir ve test edebilirsiniz!**

---
Generated with Claude Code (claude.ai/code)