# 📮 Embedding Workflow Postman Test Rehberi

## 🎯 Webhook URL

```
https://n8n.botfusions.com/webhook/embedding-upload
```

---

## 📤 Postman Test 1: Minimal Test (Google Drive File ID ile)

### Request Details
- **Method**: `POST`
- **URL**: `https://n8n.botfusions.com/webhook/embedding-upload`
- **Headers**:
  ```
  Content-Type: application/json
  ```

### Body (raw JSON):
```json
{
  "fileId": "GOOGLE_DRIVE_FILE_ID_BURAYA"
}
```

### Örnek:
```json
{
  "fileId": "1AbCdEfGhIjKlMnOpQrStUvWxYz123456"
}
```

---

## 📤 Postman Test 2: Tam Metadata ile

### Body (raw JSON):
```json
{
  "fileId": "1AbCdEfGhIjKlMnOpQrStUvWxYz123456",
  "filename": "sirket-katalog.pdf",
  "metadata": {
    "source": "postman-test",
    "uploaded_by": "test-user",
    "category": "company-docs"
  }
}
```

---

## 📤 Postman Test 3: URL'den Dosya İndir (Google Drive Yerine)

**Not**: Bu test için Google Drive node'unu HTTP Request ile değiştirmeniz gerekir.

### Body (raw JSON):
```json
{
  "fileUrl": "https://example.com/document.pdf",
  "filename": "document.pdf"
}
```

---

## 📤 Postman Test 4: Base64 Encoded File Upload

**Not**: Bu test için workflow'a base64 decode node eklemeniz gerekir.

### Body (raw JSON):
```json
{
  "fileContent": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL...",
  "filename": "test-document.pdf",
  "mimeType": "application/pdf"
}
```

---

## 🧪 Test Senaryoları

### ✅ Başarılı Response (200 OK)

**Expected Response**:
```json
{
  "success": true,
  "message": "Document processed successfully",
  "chunks_created": 15,
  "customer_id": "talksfusion-prod-001",
  "metadata": {
    "filename": "sirket-katalog.pdf",
    "total_chunks": 15,
    "embedding_model": "text-embedding-3-small",
    "processed_at": "2025-09-30T10:30:00Z"
  }
}
```

---

### ❌ Hata Senaryoları

#### Hata 1: Google Drive File ID Yanlış
```json
{
  "error": "File not found in Google Drive",
  "fileId": "invalid-file-id"
}
```

#### Hata 2: Customer ID Eksik
```json
{
  "error": "customer_id boş olamaz"
}
```

#### Hata 3: OpenAI API Key Hatası
```json
{
  "error": "OpenAI embeddings failed (401): Incorrect API key provided"
}
```

#### Hata 4: Supabase Insert Hatası
```json
{
  "error": "Failed to insert into customer_embeding",
  "details": "duplicate key value violates unique constraint"
}
```

---

## 📋 Postman Collection JSON

Aşağıdaki JSON'u Postman'e import edebilirsiniz:

```json
{
  "info": {
    "name": "N8N Embedding Workflow Tests",
    "description": "customer_embeding tablosu için embedding workflow testleri",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Test 1: Minimal Google Drive",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"fileId\": \"GOOGLE_DRIVE_FILE_ID_BURAYA\"\n}"
        },
        "url": {
          "raw": "https://n8n.botfusions.com/webhook/embedding-upload",
          "protocol": "https",
          "host": ["n8n", "botfusions", "com"],
          "path": ["webhook", "embedding-upload"]
        }
      }
    },
    {
      "name": "Test 2: Full Metadata",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"fileId\": \"1AbCdEfGhIjKlMnOpQrStUvWxYz123456\",\n  \"filename\": \"company-catalog.pdf\",\n  \"metadata\": {\n    \"source\": \"postman-test\",\n    \"uploaded_by\": \"admin\",\n    \"category\": \"documents\"\n  }\n}"
        },
        "url": {
          "raw": "https://n8n.botfusions.com/webhook/embedding-upload",
          "protocol": "https",
          "host": ["n8n", "botfusions", "com"],
          "path": ["webhook", "embedding-upload"]
        }
      }
    },
    {
      "name": "Test 3: URL Download",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"fileUrl\": \"https://example.com/sample.pdf\",\n  \"filename\": \"sample.pdf\"\n}"
        },
        "url": {
          "raw": "https://n8n.botfusions.com/webhook/embedding-upload",
          "protocol": "https",
          "host": ["n8n", "botfusions", "com"],
          "path": ["webhook", "embedding-upload"]
        }
      }
    }
  ]
}
```

---

## 🚀 Postman'de Import

### Adım 1: Postman'i Açın

### Adım 2: Import
1. Sol üstte **"Import"** butonuna tıklayın
2. **"Raw text"** sekmesini seçin
3. Yukarıdaki JSON'u yapıştırın
4. **"Import"** tıklayın

### Adım 3: Environment Variables (Opsiyonel)
```json
{
  "n8n_webhook_url": "https://n8n.botfusions.com/webhook/embedding-upload",
  "google_drive_file_id": "YOUR_TEST_FILE_ID"
}
```

---

## 🧪 Test Çalıştırma

### 1. Google Drive File ID Hazırlayın
- Test dosyanızı Google Drive'a yükleyin
- File ID'yi alın (URL'den):
  ```
  https://drive.google.com/file/d/1AbCdEf.../view
                                    ↑ Bu kısım File ID
  ```

### 2. Postman'de Request'i Düzenleyin
```json
{
  "fileId": "BURAYA_GERÇEK_FILE_ID"
}
```

### 3. Send Tıklayın
- Response'u bekleyin (30-60 saniye sürebilir)
- Status: 200 OK bekleniyor

### 4. Supabase'de Kontrol Edin
```sql
SELECT * FROM customer_embeding
WHERE customer_id = 'SIZIN_CUSTOMER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Performans Beklentileri

| Dosya Boyutu | İşlem Süresi | Chunk Sayısı |
|--------------|--------------|--------------|
| 1-5 sayfa PDF | 30-60 saniye | 5-10 chunks |
| 10 sayfa PDF | 1-2 dakika | 15-20 chunks |
| 50 sayfa PDF | 3-5 dakika | 75-100 chunks |

---

## ⚠️ Dikkat Edilecekler

### 1. Workflow Aktif Olmalı
- N8N'de workflow **ACTIVE** durumda olmalı
- Inactive ise webhook çalışmaz

### 2. Google Drive Permissions
- File public olmalı veya service account erişimi olmalı
- "Anyone with the link can view" ayarı yeterli

### 3. OpenAI Rate Limits
- Free tier: 3 request/min
- Büyük dosyalar için sıra bekleme olabilir

### 4. Timeout
- Postman timeout süresini artırın: Settings → General → Request timeout = 120000 ms (2 dakika)

---

## 🎯 Hızlı Test (Copy-Paste Ready)

### Curl Komutu:
```bash
curl -X POST "https://n8n.botfusions.com/webhook/embedding-upload" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "GOOGLE_DRIVE_FILE_ID_BURAYA"
  }'
```

### PowerShell (Windows):
```powershell
$body = @{
    fileId = "GOOGLE_DRIVE_FILE_ID_BURAYA"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://n8n.botfusions.com/webhook/embedding-upload" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### JavaScript (Node.js):
```javascript
const response = await fetch('https://n8n.botfusions.com/webhook/embedding-upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileId: 'GOOGLE_DRIVE_FILE_ID_BURAYA'
  })
});

const result = await response.json();
console.log(result);
```

---

## 📞 Troubleshooting

### Sorun: "Webhook not found" (404)
**Çözüm**: Workflow'u aktif edin (Inactive → Active)

### Sorun: "Timeout" (504)
**Çözüm**: Dosya çok büyük, küçük dosya ile test edin

### Sorun: "Invalid fileId"
**Çözüm**: Google Drive file ID'yi kontrol edin, public erişim açın

### Sorun: Response body boş
**Çözüm**: "Respond to Webhook" node'unun son node olduğundan emin olun

---

**Hazırlayan**: Claude Code
**Tarih**: 30 Eylül 2025
**Workflow**: Document Embedding → customer_embeding
**Test Ready**: ✅ Postman'den test edebilirsiniz!