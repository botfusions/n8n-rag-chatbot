# 🔍 N8N Execution Debug Rehberi

## Environment Variables Eklendikten Sonra Debug

### 1️⃣ **N8N Execution Logs Kontrol Et**

N8N Dashboard'da:
1. **Executions** sekmesine git
2. **En son çalıştırma**yı bul (şu an yaptığımız test)
3. **Execution details**'e tıkla
4. **Hangi node'da hata** alındığını gör

### 2️⃣ **Beklenen Hata Tipleri**

Environment variables eklendikten sonra muhtemel hatalar:

**A) OpenAI API Error:**
```
❌ "Incorrect API key provided"
❌ "You exceeded your current quota"
❌ "Rate limit exceeded"
```

**B) Supabase Connection Error:**
```
❌ "Failed to connect to database"
❌ "Invalid JWT"
❌ "Permission denied"
```

**C) Workflow Logic Error:**
```
❌ "Cannot read property 'embedding'"
❌ "Function not found"
❌ "Invalid vector dimension"
```

### 3️⃣ **Environment Variables Verification**

N8N workflow'unda kontrol et:
- HTTP Request node'ları environment variables kullanıyor mu?
- `{{ $env.OPENAI_API_KEY }}` formatında mı?
- Variables doğru yazılmış mı?

### 4️⃣ **Coolify'da Variables Kontrol**

Coolify'da:
- Variables doğru kaydedildi mi?
- Service restart oldu mu?
- Logs'da environment variables görülüyor mu?

### 5️⃣ **Hızlı Test Commands**

```bash
# RAG webhook test
node test-new-rag-webhook.js

# Supabase connection test
node test-supabase-connection.js

# Simple webhook test (karşılaştırma için)
curl -X POST "https://n8n.botfusions.com/webhook/simple-chat" \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "test", "metadata": {"customerId": "test"}}'
```

## 🎯 **Şu Anki Durum**

- ✅ Environment variables eklendi (Coolify)
- ✅ N8N restart edildi
- ❌ Webhook hala boş response veriyor

**Muhtemel Sebepler:**
1. Variables henüz aktif olmadı (restart gerekebilir)
2. Workflow'da environment variable kullanımı hatalı
3. OpenAI API key geçersiz/quota aşımı
4. Supabase connection hatası

## 💡 **Sonraki Adımlar**

1. **N8N Execution logs**'a bak
2. **Hangi node'da hata** aldığını belirle
3. **Specific hatayı** paylaş
4. **Targeted çözüm** uygula

---

**Debug için N8N execution logs'unu kontrol edin ve hangi node'da hangi hatayı aldığınızı paylaşın! 🔍**