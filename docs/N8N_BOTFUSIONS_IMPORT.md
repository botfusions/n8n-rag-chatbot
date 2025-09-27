# 🚀 N8N BotFusions Instance Import Rehberi

## 🔗 N8N Instance Bilgileri
- **URL**: https://www.n8n.botfusions.com
- **API Token**: Mevcut ve geçerli
- **Status**: Instance şu anda "no available server" durumunda

## ⚠️ Instance Durumu Kontrolü

### Adım 1: N8N Instance'ını Başlatın
N8N instance'ınızın çalıştığından emin olun:

```bash
# Instance durumu kontrol
curl -k -H "Authorization: Bearer YOUR_TOKEN" \
     https://www.n8n.botfusions.com/api/v1/workflows

# Beklenen yanıt: JSON workflow listesi
# Mevcut yanıt: "no available server"
```

### Adım 2: Web Interface Kontrolü
Browser'da kontrol edin:
- **URL**: https://www.n8n.botfusions.com
- Login yapabildiğinizi kontrol edin
- Dashboard'ın yüklendiğini doğrulayın

## 📥 Manual Import İşlemi

Instance aktif olduktan sonra bu adımları takip edin:

### 1️⃣ RAG Chat Main Workflow Import

1. **N8N Dashboard'a giriş yapın**: https://www.n8n.botfusions.com
2. **Workflows > + New > Import from file**
3. **Dosya seçin**: `docs/n8n-workflows/corrected-chat-rag-workflow.json`
4. **Import butonuna tıklayın**

**Workflow Adı**: `RAG Chat Main Workflow`

### 2️⃣ RAG Chat Supabase Simple Import

1. **Yeni workflow import edin**
2. **Dosya**: `docs/n8n-workflows/supabase-only-chat-workflow.json`
3. **Import edin**

**Workflow Adı**: `RAG Chat Supabase Simple`

### 3️⃣ RAG Document Processing Import

1. **Üçüncü workflow'u import edin**
2. **Dosya**: `docs/n8n-workflows/improved-document-processing-workflow.json`
3. **Import edin**

**Workflow Adı**: `RAG Document Processing`

## 🔧 Environment Variables Kontrolü

Import sonrası bu variables'ların set edildiğini kontrol edin:

```env
# N8N Settings > Environment
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧪 Import Sonrası Test

### Test 1: API Health Check
```bash
# Instance aktif olduktan sonra
curl -k -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNjA4MTQxNy1hOTgxLTRkZjktOTIzNS1hNDg3ODk1NGExMWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUyNTMzNjkzfQ.ZarmgKhplB6QpgFQI5pFc02-d5EGDjVdNIX5sPNvj3Y" \
https://www.n8n.botfusions.com/api/v1/workflows
```

### Test 2: Chat Workflow Test
```bash
# RAG Chat webhook test
curl -k -X POST "https://www.n8n.botfusions.com/webhook/chat/test-widget-001" \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Merhaba test",
    "sessionId": "test-session-001",
    "metadata": {
      "customerId": "test-customer-001",
      "widgetId": "test-widget-001",
      "companyName": "BotFusions",
      "locale": "tr"
    }
  }'
```

## 📊 Import Kontrol Listesi

Import işlemi tamamlandıktan sonra kontrol edin:

- [ ] **Instance Status**: N8N çalışıyor ve erişilebilir
- [ ] **Workflow Import**: 3 RAG workflow'u başarıyla import edildi
- [ ] **Environment Variables**: Tüm gerekli env vars set edildi
- [ ] **Node Dependencies**: `n8n-nodes-langchain` community package yüklü
- [ ] **Workflow Activation**: Tüm workflow'lar aktif durumda
- [ ] **Webhook URLs**: Chat ve document processing URL'leri alındı
- [ ] **Test Response**: Başarılı test yanıtları alındı

## 🔄 Sonraki Adımlar

Import tamamlandıktan sonra:

1. **Webhook URL'lerini paylaşın**
2. **Test sonuçlarını bildirin**
3. **Karşılaştığınız hataları rapor edin**

### Expected Webhook URLs:
- **Chat**: `https://www.n8n.botfusions.com/webhook/chat/{widgetId}`
- **Documents**: `https://www.n8n.botfusions.com/webhook/document-processing`

## 🛠️ Troubleshooting

### Issue 1: "no available server"
**Çözüm**: N8N instance'ını restart edin veya server statusunu kontrol edin

### Issue 2: SSL Certificate Error
**Çözüm**: Self-signed certificate kullanıyorsanız `-k` flag'i ekleyin

### Issue 3: Authentication Error
**Çözüm**: API token'ın doğru olduğunu ve expires olmadığını kontrol edin

---

**🎯 Sonraki Adım**: N8N instance'ınızı aktif hale getirip workflow import işlemini gerçekleştirin!

---
Generated with Claude Code (claude.ai/code)