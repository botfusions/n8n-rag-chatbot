# 🔧 N8N Manual Import Adımları

## 🎯 Şu Anda İmport Edilecek Workflow'lar

### 1️⃣ Priority Workflow: Corrected Chat RAG Workflow

**Dosya Konumu:** `docs/n8n-workflows/corrected-chat-rag-workflow.json`

**N8N Manual Import Adımları:**

#### Adım 1: N8N Dashboard'a Giriş
1. N8N instance'ınıza browser'da giriş yapın
2. Ana dashboard'da **"Workflows"** sekmesine tıklayın

#### Adım 2: Import İşlemi
1. Sağ üst köşede **"+ New"** butonuna tıklayın
2. Dropdown menüden **"Import from file"** seçin
3. **"Choose file"** butonuna tıklayın
4. `corrected-chat-rag-workflow.json` dosyasını seçin
5. **"Import"** butonuna tıklayın

#### Adım 3: Environment Variables Kontrolü
Import sonrası bu variables'ların set edildiğini kontrol edin:

```env
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**N8N Settings > Environment'da kontrol edin!**

#### Adım 4: Node Dependencies
**Gerekli N8N Community Packages:**
```bash
# N8N instance'da bu package'ın yüklü olduğundan emin olun:
n8n-nodes-langchain
```

Eğer yoksa:
1. N8N Settings > Community Packages
2. `n8n-nodes-langchain` ekleyin
3. Install edin

#### Adım 5: Workflow Aktivasyonu
1. Workflow editor'da sağ üst köşede **"Active"** switch'ini açın
2. **"Save"** butonuna tıklayın

#### Adım 6: Webhook URL'ini Alın
1. `Chat Trigger` node'una tıklayın
2. **Webhook URL**'ini kopyalayın
3. Format: `https://your-n8n.com/webhook/chat/test-widget-001`

## 🧪 İmport Sonrası Test

### Hızlı Test Komutu

```bash
curl -X POST "https://your-n8n.com/webhook/chat/test-widget-001" \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "Merhaba test",
    "sessionId": "test-session-001",
    "metadata": {
      "customerId": "test-customer-001",
      "widgetId": "test-widget-001",
      "companyName": "Test Company",
      "locale": "tr"
    }
  }'
```

### Beklenen Başarılı Yanıt:
```json
{
  "output": "Merhaba! 👋 Test Company müşteri hizmetlerine hoş geldiniz...",
  "followUpPrompts": ["Nasıl yardımcı olabilirim?"],
  "metadata": {
    "hasContext": false,
    "confidence": 0.3,
    "locale": "tr"
  }
}
```

## ⚠️ Yaygın Import Sorunları

### Sorun 1: ChatTrigger Node Tanınmıyor
```
Error: Unknown node type 'n8n-nodes-langchain.chatTrigger'
```
**Çözüm:** Community packages'da `n8n-nodes-langchain` yükleyin

### Sorun 2: Environment Variables Bulunamıyor
```
Error: Cannot read property 'OPENAI_API_KEY' of undefined
```
**Çözüm:** N8N Settings > Environment'da variables'ları kontrol edin

### Sorun 3: Supabase Bağlantı Hatası
```
Error: Invalid JWT token
```
**Çözüm:** SUPABASE_SERVICE_KEY kullandığınızdan emin olun (ANON_KEY değil)

## 📋 Import Sonrası Checklist

- [ ] Workflow başarıyla import edildi
- [ ] Tüm node'lar yeşil ışık yanıyor
- [ ] Environment variables set edildi
- [ ] Workflow aktif durumda
- [ ] Webhook URL alındı
- [ ] Test mesajı gönderildi
- [ ] Başarılı yanıt alındı

## 🔄 Sonraki Workflow'lar

**Bu workflow başarılı olduktan sonra:**

### 2️⃣ Supabase-Only Chat Workflow
**Dosya:** `docs/n8n-workflows/supabase-only-chat-workflow.json`

### 3️⃣ Document Processing Workflow
**Dosya:** `docs/n8n-workflows/improved-document-processing-workflow.json`

## 📞 Import Desteği

**N8N Import işlemi tamamlandığında:**
1. Webhook URL'lerini bana bildirin
2. Test sonuçlarını paylaşın
3. Karşılaştığınız hataları rapor edin

**Sonraki adım:** Webhook URL'leriyle test dashboard'unu konfigüre edeceğiz! 🎯

---
Generated with Claude Code (claude.ai/code)