# 📬 Postman RAG Chat Test Rehberi

## 📥 **Collection Import**

1. **Postman'ı aç**
2. **Import** butonuna tıkla
3. **`postman-rag-test.json`** dosyasını sürükle/seç
4. **Import** et

## 🧪 **Test Collection İçeriği**

### **RAG Chat Tests:**
1. **RAG Chat - Basic Test** - Genel merhaba testi
2. **RAG Chat - Company Question** - "Şirket ne zaman kuruldu?"
3. **RAG Chat - Support Hours** - "Destek saatleriniz nedir?"
4. **RAG Chat - General Question** - "Hangi hizmetleri sunuyorsunuz?"

### **Comparison Test:**
5. **Simple Chat Comparison** - Çalışan simple webhook ile karşılaştırma

## 🎯 **Test Webhook URL**
```
https://n8n.botfusions.com/webhook/4012a383-9085-4ecb-801a-c879848d6b40
```

## 📋 **Test Payload Format**

```json
{
  "chatInput": "Merhaba, şirket hakkında bilgi alabilir miyim?",
  "sessionId": "postman-test-{{$timestamp}}",
  "metadata": {
    "customerId": "test-customer-rag",
    "widgetId": "test-widget-rag",
    "companyName": "Test Company RAG"
  }
}
```

## ✅ **Beklenen Response (Çalışırsa)**

```json
{
  "output": "Merhaba! Test Company RAG olarak size yardımcı olmaktan mutluluk duyarım...",
  "followUpPrompts": [
    "Şirket hakkında daha fazla bilgi",
    "Hizmetlerimiz nelerdir?",
    "İletişim bilgilerini öğrenebilir miyim?"
  ],
  "metadata": {
    "sessionId": "postman-test-1759169766883",
    "customerId": "test-customer-rag",
    "hasRelevantContent": true,
    "sourceCount": 3,
    "tokensUsed": 450,
    "responseTime": 2100
  }
}
```

## ❌ **Hata Durumları**

### **Boş Response (content-length: 0)**
- **Sebep**: N8N workflow'unda hata var
- **Çözüm**: N8N Executions > Logs kontrol et

### **404 Not Found**
- **Sebep**: Webhook URL hatalı
- **Çözüm**: URL'yi kontrol et

### **500 Internal Server Error**
- **Sebep**: Environment variables veya workflow hatası
- **Çözüm**: N8N logs kontrol et

## 🔍 **Debug Adımları**

### 1. **Simple Chat Test Et**
Önce "Simple Chat Comparison" request'ini çalıştır:
- ✅ **Çalışırsa**: N8N servisi OK, RAG workflow'unda sorun
- ❌ **Çalışmazsa**: N8N genel sorun

### 2. **RAG Chat Test Et**
"RAG Chat - Basic Test" request'ini çalıştır:
- ✅ **JSON Response**: Sistem çalışıyor! 🎉
- ❌ **Boş Response**: N8N Executions logs kontrol et
- ❌ **Error Response**: Spesifik hatayı analiz et

### 3. **Response Headers Kontrol Et**
Postman'da Response Headers'a bak:
- `content-length: 0` → Workflow hatası
- `content-length: >0` → Response var ama JSON parse sorunu olabilir

## 📊 **Test Sonuçları**

Test sonuçlarını paylaş:
- **Status Code**: 200, 404, 500?
- **Content-Length**: 0 veya >0?
- **Response Body**: JSON, HTML, boş?
- **Response Time**: Ne kadar sürdü?

## 💡 **Tips**

- **{{$timestamp}}** otomatik timestamp ekler
- **Collection Variables** kullanılabilir
- **Environment** oluşturup farklı URL'ler test edebilir
- **Tests** tab'ında assertions ekleyebilir

---

**🚀 Postman'da test et ve sonuçları paylaş!**