# 🔗 Claude Code N8N MCP Konfigürasyonu

## 🎯 Claude Code için N8N MCP Bağlantısı

Claude Code'da MCP server konfigürasyonu için farklı yöntemler vardır:

## 🔧 Method 1: Claude Code MCP Settings

### Claude Code'da MCP Server Ekleme:

1. **Claude Code'da Settings'e gidin**
2. **MCP Servers sekmesini bulun**
3. **Add Server butonuna tıklayın**
4. **Aşağıdaki bilgileri girin:**

```json
{
  "name": "n8n-mcp",
  "command": "npx",
  "args": ["n8n-mcp"],
  "env": {
    "MCP_MODE": "stdio",
    "LOG_LEVEL": "error",
    "DISABLE_CONSOLE_OUTPUT": "true",
    "N8N_API_URL": "https://n8n.botfusions.com",
    "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNjA4MTQxNy1hOTgxLTRkZjktOTIzNS1hNDg3ODk1NGExMWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4OTc3MDM5fQ.m2WX1U6OEpmc6V6roMya-9x8YODSV0eql8xBrEA-rkI"
  }
}
```

## 🔧 Method 2: Project-Level .claude.json

### Proje klasöründe .claude.json dosyası oluşturun:

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
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNjA4MTQxNy1hOTgxLTRkZjktOTIzNS1hNDg3ODk1NGExMWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4OTc3MDM5fQ.m2WX1U6OEpmc6V6roMya-9x8YODSV0eql8xBrEA-rkI"
      }
    }
  }
}
```

## 🔧 Method 3: Global Claude Code Config

### Windows Claude Code Global Config:

**Dosya konumu:**
```
%APPDATA%\Claude Code\claude_config.json
```

**İçerik:**
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
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNjA4MTQxNy1hOTgxLTRkZjktOTIzNS1hNDg3ODk1NGExMWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4OTc3MDM5fQ.m2WX1U6OEpmc6V6roMya-9x8YODSV0eql8xBrEA-rkI"
      }
    }
  }
}
```

## 🛠️ n8n-mcp Package Kurulumu

### NPM Package'ı kurun:

```bash
# Global kurulum
npm install -g n8n-mcp

# Veya yerel kurulum
npm install n8n-mcp

# Test kurulum
npx n8n-mcp --help
```

## 🧪 Claude Code MCP Test

### MCP Bağlantısını Test Edin:

1. **Claude Code'u yeniden başlatın**
2. **Chat'te şu komutları deneyin:**

```
@n8n-mcp N8N workflow'larını listele
```

```
@n8n-mcp "RAG Chat Main Workflow" var mı kontrol et
```

```
@n8n-mcp Yeni workflow oluştur
```

## 📁 Dosya Oluşturma Seçenekleri

### Option 1: Project Level Config
```bash
# Proje klasöründe
echo '{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "N8N_API_URL": "https://n8n.botfusions.com",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNjA4MTQxNy1hOTgxLTRkZjktOTIzNS1hNDg3ODk1NGExMWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4OTc3MDM5fQ.m2WX1U6OEpmc6V6roMya-9x8YODSV0eql8xBrEA-rkI"
      }
    }
  }
}' > .claude.json
```

### Option 2: Global Config
```bash
# Global config dizini oluştur
mkdir -p "%APPDATA%\Claude Code"

# Config dosyası oluştur
echo '{...}' > "%APPDATA%\Claude Code\claude_config.json"
```

## 🔍 Troubleshooting

### Problem 1: n8n-mcp Not Found
```bash
# Package'ı kontrol edin
npm list -g n8n-mcp
npm install -g n8n-mcp
```

### Problem 2: MCP Server Not Loading
```bash
# Claude Code loglarını kontrol edin
# Settings > Developer > Show Logs
```

### Problem 3: API Connection Failed
```bash
# API key ve URL'i kontrol edin
curl -H "X-N8N-API-KEY: YOUR_KEY" https://n8n.botfusions.com/api/v1/workflows
```

## ✅ Başarı Kriterleri

MCP bağlantısı başarılı olduğunda:

- ✅ Claude Code'da @n8n-mcp komutları çalışır
- ✅ N8N workflow'ları listelenebilir
- ✅ Yeni workflow'lar import edilebilir
- ✅ Webhook URL'leri alınabilir

---

**🎯 Öncelik**: Hangi method'u kullanmak istiyorsunuz?

1. **Project Level**: `.claude.json` dosyası oluşturalım
2. **Global Config**: Global Claude Code ayarları
3. **Claude Code Settings**: UI üzerinden ekleme

Hangi yöntemi tercih ediyorsunuz? 🚀