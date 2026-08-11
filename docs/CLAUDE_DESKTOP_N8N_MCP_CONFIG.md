# 🔗 Claude Desktop N8N MCP Konfigürasyonu

## 📋 Güncellenmiş MCP Konfigürasyonu

Aşağıdaki JSON konfigürasyonunu Claude Desktop ayarlarınıza ekleyin:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://n8n.botfusions.com",
        "N8N_API_KEY": "YOUR_N8N_API_TOKEN"
      }
    }
  }
}
```

## 🔧 Claude Desktop Konfigürasyon Adımları

### Windows'da Claude Desktop Ayarları:

1. **Claude Desktop'ı kapatın**

2. **Konfigürasyon dosyasını açın**:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

   **Veya manuel olarak**:
   ```
   C:\Users\[YourUsername]\AppData\Roaming\Claude\claude_desktop_config.json
   ```

3. **JSON içeriğini güncelleyin**:
   - Mevcut dosyaya `mcpServers` section'ını ekleyin
   - Veya tüm dosyayı yukarıdaki JSON ile değiştirin

4. **Dosyayı kaydedin**

5. **Claude Desktop'ı yeniden başlatın**

## 🎯 MCP Bağlantı Testi

Claude Desktop yeniden başlatıldıktan sonra şu komutları test edin:

### Test 1: N8N Workflow Listesi
```
N8N'deki workflow'ları listele
```

### Test 2: Workflow Detayları
```
"RAG Chat Main Workflow" adında bir workflow var mı kontrol et
```

### Test 3: Yeni Workflow Import
```
Bu JSON workflow'unu N8N'e import et: [JSON content]
```

## 🚀 RAG Workflow Import İşlemi

MCP bağlantısı çalışır çalışmaz bu workflow'ları import edebiliriz:

### 1️⃣ RAG Chat Main Workflow
**Dosya**: `docs/n8n-workflows/corrected-chat-rag-workflow.json`
**Hedef Ad**: `RAG Chat Main Workflow`

### 2️⃣ RAG Chat Supabase Simple
**Dosya**: `docs/n8n-workflows/supabase-only-chat-workflow.json`
**Hedef Ad**: `RAG Chat Supabase Simple`

### 3️⃣ RAG Document Processing
**Dosya**: `docs/n8n-workflows/improved-document-processing-workflow.json`
**Hedef Ad**: `RAG Document Processing`

## 📁 Dosya Konumları

Workflow JSON dosyaları şu konumlarda hazır:

```
📁 n8n_Rag_chatbot/
├── 📁 docs/
│   └── 📁 n8n-workflows/
│       ├── 📄 corrected-chat-rag-workflow.json
│       ├── 📄 supabase-only-chat-workflow.json
│       └── 📄 improved-document-processing-workflow.json
```

## 🔍 Troubleshooting

### Problem 1: MCP Server Not Found
```bash
# npx n8n-mcp kurulumunu kontrol edin
npm install -g n8n-mcp
```

### Problem 2: API Authentication Error
```
# API key'in doğru olduğunu kontrol edin
# N8N_API_KEY environment variable'ında X-N8N-API-KEY format kullanılmalı
```

### Problem 3: Connection Timeout
```
# N8N instance URL'inin erişilebilir olduğunu kontrol edin
# https://n8n.botfusions.com çalışıyor olmalı
```

## ✅ Başarı Kriterleri

MCP bağlantısı başarılı olduğunda:

- ✅ Claude Desktop'tan N8N workflow'ları listelenebilir
- ✅ Yeni workflow'lar import edilebilir
- ✅ Webhook URL'leri alınabilir
- ✅ Workflow'lar aktifleştirilebilir

---

**🎯 Sonraki Adım**: Claude Desktop'ı yukarıdaki JSON ile yapılandırın ve MCP bağlantısını test edin!

Bu konfigürasyonu Claude Desktop'a ekledikten sonra bana bildirin, workflow import işlemini başlatalım. 🚀