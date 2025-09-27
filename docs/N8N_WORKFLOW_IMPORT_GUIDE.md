# 📥 N8N Workflow Import ve Test Rehberi

## 🎯 Workflow Import Süreci

### 📋 Ön Hazırlıklar

#### 1. Environment Variables Kontrolü
N8N import işleminden önce environment variables'ların hazır olduğundan emin olun:

```env
# Kritik Variables
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# İsteğe Bağlı (Backend API kullanıyorsanız)
BACKEND_URL=https://your-backend-api.com
BACKEND_API_KEY=your-secret-backend-api-key
```

#### 2. Supabase Database Schema Kontrolü
Aşağıdaki tabloların Supabase'de olduğundan emin olun:
- `customers` (müşteri bilgileri)
- `chat_widgets` (widget konfigürasyonları)
- `documents` (döküman metadata)
- `document_chunks` (döküman parçaları)
- `chat_sessions` (chat oturumları)
- `chat_messages` (chat mesajları)

### 🔄 Import Sırası ve Adımları

#### Adım 1: Corrected Chat RAG Workflow Import

1. **N8N Dashboard'a gidin**
2. **"Workflows"** sekmesine tıklayın
3. **"Import from file"** butonuna tıklayın
4. `docs/n8n-workflows/corrected-chat-rag-workflow.json` dosyasını seçin
5. **"Import"** butonuna tıklayın

**Kritik Kontroller:**
- [ ] `chatTrigger` node'u düzgün import edildi mi?
- [ ] Environment variables bağlantıları doğru mu?
- [ ] Supabase connection düzgün çalışıyor mu?

#### Adım 2: Supabase-Only Chat Workflow Import

1. **N8N Dashboard'da yeni workflow import et**
2. `docs/n8n-workflows/supabase-only-chat-workflow.json` dosyasını seçin
3. **Import ve aktifleştir**

**Özellikler:**
- Backend API'ya bağımlılık yok
- Direkt Supabase RPC kullanımı
- Daha basit kurulum

#### Adım 3: Document Processing Workflow Import

1. **Document processing workflow'u import et**
2. `docs/n8n-workflows/improved-document-processing-workflow.json` dosyasını seçin
3. **Webhook URL'ini kaydet**

## 🧪 Test Süreci

### Test Ortamı Hazırlığı

#### 1. Test Dashboard'u Açın
```bash
# Browser'da açın:
file:///path/to/project/tests/n8n-test-dashboard.html
```

#### 2. Test Configuration Güncellemesi
Test dashboard'da N8N instance URL'inizi güncelleyin:

```javascript
const TEST_CONFIG = {
  n8nBaseUrl: 'https://your-n8n-instance.com', // Buraya kendi URL'inizi yazın
  testCustomerId: 'test-customer-001',
  testWidgetId: 'test-widget-001',
  testCompanyName: 'Test Company Ltd.',
  testBotName: 'TestBot'
};
```

### 🎯 Test Senaryoları

#### Test 1: Basic Chat Greeting
```javascript
// Test verisi
{
  "chatInput": "Merhaba",
  "sessionId": "test-session-001",
  "metadata": {
    "customerId": "test-customer-001",
    "widgetId": "test-widget-001",
    "companyName": "Test Company Ltd.",
    "botName": "TestBot",
    "locale": "tr"
  }
}

// Beklenen sonuç
{
  "output": "Merhaba! 👋 Test Company Ltd. müşteri hizmetlerine hoş geldiniz...",
  "followUpPrompts": ["Nasıl yardımcı olabilirim?", "Hangi konuda bilgi almak istiyorsunuz?"],
  "metadata": {
    "hasContext": false,
    "confidence": 0.3,
    "locale": "tr"
  }
}
```

#### Test 2: Information Query
```javascript
// Test verisi
{
  "chatInput": "Çalışma saatleriniz nedir?",
  "sessionId": "test-session-002",
  "metadata": {
    "customerId": "test-customer-001",
    "widgetId": "test-widget-001",
    "locale": "tr"
  }
}

// RAG arama bekleniyor + bilgi tabanlı yanıt
```

#### Test 3: English Language Support
```javascript
// Test verisi
{
  "chatInput": "What are your business hours?",
  "sessionId": "test-session-003",
  "metadata": {
    "customerId": "test-customer-001",
    "widgetId": "test-widget-001",
    "locale": "en"
  }
}

// İngilizce yanıt bekleniyor
```

### 📊 Test Sonuçlarının Değerlendirilmesi

#### Başarı Kriterleri:
- **Response Time**: < 5 saniye
- **Response Format**: JSON formatında doğru struktur
- **Language Support**: TR/EN dil desteği
- **Context Search**: Supabase vector search çalışıyor
- **Error Handling**: Graceful error responses

#### Yaygın Sorunlar ve Çözümleri:

**1. Environment Variable Hatası**
```
Hata: Cannot read property 'OPENAI_API_KEY' of undefined
Çözüm: N8N Settings > Environment'da variables kontrolü
```

**2. Supabase Connection Hatası**
```
Hata: Invalid JWT token
Çözüm: SERVICE_KEY kullandığınızdan emin olun (ANON_KEY değil)
```

**3. ChatTrigger Node Hatası**
```
Hata: Unknown node type 'n8n-nodes-langchain.chatTrigger'
Çözüm: N8N'de LangChain community package yükleyin
```

## 🔗 Webhook URL'lerini Alma

### Chat Workflow Webhook
1. Chat workflow'unu açın
2. `chatTrigger` node'una tıklayın
3. **Webhook URL'i kopyalayın**
4. Format: `https://your-n8n.com/webhook/chat/{widgetId}`

### Document Processing Webhook
1. Document processing workflow'unu açın
2. `Webhook` node'una tıklayın
3. **URL'i kopyalayın**
4. Format: `https://your-n8n.com/webhook/document-processing`

## 🚀 Production Deployment Checklist

### N8N Configuration
- [ ] Environment variables tamamen set edildi
- [ ] Webhook URLs public'e erişilebilir
- [ ] Rate limiting yapılandırıldı
- [ ] Error notifications aktif
- [ ] Backup stratejisi hazır

### Supabase Configuration
- [ ] RLS policies aktif
- [ ] Vector extension (pgvector) yüklü
- [ ] API keys production için ayrı
- [ ] Connection pooling optimize edildi

### Security Checklist
- [ ] API keys güvenli şekilde saklanıyor
- [ ] HTTPS/SSL sertifikaları geçerli
- [ ] CORS ayarları yapılandırıldı
- [ ] Rate limiting aktif

## 📈 Monitoring ve Analytics

### N8N Monitoring
```javascript
// Workflow execution tracking
{
  "executionTime": "2.3s",
  "tokenUsage": {
    "openai": 1250,
    "total_cost": "$0.003"
  },
  "successRate": "98.5%",
  "errorRate": "1.5%"
}
```

### Performance Metrics
- **Average Response Time**: < 3 saniye
- **Success Rate**: > 95%
- **Token Efficiency**: Optimal AI model usage
- **Concurrent Requests**: Support > 10 concurrent

## 🛠️ Troubleshooting

### Debug Mode Aktifleştirme
1. N8N Settings > Log Level > Debug
2. Workflow executions'da detaylı loglar görün
3. Error messages'ı analiz edin

### Test Script Çalıştırma
```bash
# Node.js ortamında
node tests/n8n-workflow-tests.js

# Browser console'da
N8NWorkflowTests.runAllTests()
```

### Common Issues Fix

#### Issue 1: Langchain Nodes Missing
```bash
# N8N instance'da community packages install edin
npm install n8n-nodes-langchain
```

#### Issue 2: Vector Search Not Working
```sql
-- Supabase'de vector function kontrolü
SELECT * FROM match_document_chunks('test query', 0.7, 5);
```

#### Issue 3: Turkish Character Problems
```javascript
// Node.js encoding kontrolü
process.env.NODE_OPTIONS = '--unhandled-rejections=strict --max-old-space-size=4096'
```

## ✅ Final Validation

### Comprehensive Test Run
1. **All Basic Tests**: Greeting, Information, Error handling
2. **Language Tests**: Turkish ve English support
3. **Performance Tests**: Concurrent requests
4. **Integration Tests**: Frontend widget integration

### Production Ready Criteria
- [ ] All tests passing > 95%
- [ ] Response times < 3 seconds
- [ ] Error handling comprehensive
- [ ] Security validations complete
- [ ] Documentation up to date

---

## 🎊 Sonuç

Bu rehberi takip ederek N8N workflow'larınızı başarıyla import edip test edebilirsiniz.

**Sonraki adım:** Production environment'a deploy etmek ve monitoring kurmak! 🚀

---
Generated with Claude Code (claude.ai/code)