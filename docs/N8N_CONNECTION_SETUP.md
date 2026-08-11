# 🔗 N8N BotFusions Connection Setup

## 🎯 Mevcut Durum Analizi

**✅ Çalışan:**
- N8N Instance URL: https://n8n.botfusions.com
- API Authentication: X-N8N-API-KEY header formatı
- Workflow listesi alınabiliyor
- 6 adet mevcut workflow tespit edildi

**❌ Çalışmayan:**
- API import functionality (Internal Server Error)
- Workflow upload via API

## 🔧 Bağlantı Test Adımları

### 1. Web UI Erişim Testi
```bash
# Browser'da test edin:
https://n8n.botfusions.com

# Beklenen: N8N login sayfası veya dashboard
```

### 2. API Health Check
```bash
# API sağlık kontrolü
curl -k -H "X-N8N-API-KEY: YOUR_N8N_API_TOKEN" \
https://n8n.botfusions.com/api/v1/workflows

# ✅ Çalışıyor: Workflow listesi dönüyor
```

### 3. Web UI Login Test
**Manuel kontrol gerekli:**

1. **Browser'da açın**: https://n8n.botfusions.com
2. **Login durumunu kontrol edin**:
   - Login sayfası görünüyor mu?
   - Otomatik login oluyor mu?
   - Dashboard'a erişebiliyor musunuz?

### 4. Dashboard Erişim Test
Login sonrası kontrol edilecekler:

- [ ] **Workflows sekmesi** görünüyor mu?
- [ ] **Mevcut workflow'lar** listeleniyor mu?
- [ ] **"New" butonu** çalışıyor mu?
- [ ] **"Import from file"** seçeneği var mı?

## 🚨 Bağlantı Sorun Giderme

### Problem 1: Login Yapamıyorum
```bash
# Olası çözümler:
1. Basic Auth kontrolü
2. Username/password kontrolü
3. Session cookies temizleme
4. Incognito/private mode deneme
```

### Problem 2: Dashboard Yüklenmiyor
```bash
# Debug adımları:
1. Browser console loglarını kontrol edin (F12)
2. Network tab'da failed requests kontrol edin
3. Browser cache temizleyin
4. Farklı browser deneyin
```

### Problem 3: API Token Geçersiz
```bash
# Token kontrolü:
curl -k -H "X-N8N-API-KEY: TOKEN" \
https://n8n.botfusions.com/api/v1/me

# Beklenen: User bilgileri
# Aldığımız: Authentication error
```

## 🔑 Alternative Authentication Methods

### Method 1: Basic Auth (Eğer ayarlanmışsa)
```bash
curl -k -u "username:password" \
https://n8n.botfusions.com/api/v1/workflows
```

### Method 2: Session-based Auth
```bash
# Web UI'dan session cookie alıp kullanma
curl -k -H "Cookie: your-session-cookie" \
https://n8n.botfusions.com/api/v1/workflows
```

### Method 3: Direct Web UI Import
**En güvenilir yöntem:**
1. Web UI'ya login olun
2. Manual olarak workflow import edin
3. Webhook URL'lerini kopyalayın

## 📋 Bağlantı Kurma Checklist

**İlk Adım - Web UI Kontrolü:**
- [ ] https://n8n.botfusions.com açılıyor
- [ ] Login sayfası/dashboard görünüyor
- [ ] Authentication başarılı
- [ ] Workflows listesi görülebiliyor

**İkinci Adım - Import Test:**
- [ ] "New" > "Import from file" çalışıyor
- [ ] JSON dosyası seçilebiliyor
- [ ] Import butonu aktif
- [ ] Error mesajları yok

**Üçüncü Adım - Workflow Import:**
- [ ] RAG Chat Main Workflow import edildi
- [ ] RAG Chat Supabase Simple import edildi
- [ ] RAG Document Processing import edildi

## 🎯 Sonraki Adımlar

### Adım 1: Manual Web UI Test
Lütfen bu adımları takip edin:

1. **Browser'da açın**: https://n8n.botfusions.com
2. **Login durumunu bildirin**:
   - Login gerekiyor mu?
   - Otomatik giriş yapıyor mu?
   - Dashboard görünüyor mu?

3. **Import test edin**:
   - "Workflows" sekmesine gidin
   - "New" > "Import from file" deneyin
   - Herhangi bir error var mı?

### Adım 2: Bağlantı Durumunu Bildirin
Şu bilgileri paylaşın:

```
✅/❌ Web UI erişimi:
✅/❌ Login durumu:
✅/❌ Dashboard görünümü:
✅/❌ Import fonksiyonu:
⚠️ Error mesajları:
```

### Adım 3: Workflow Import
Bağlantı kurulunca import işlemine geçeceğiz:

- `corrected-chat-rag-workflow.json`
- `supabase-only-chat-workflow.json`
- `improved-document-processing-workflow.json`

## 🔧 Debug Yardımcıları

### Browser Console Log Alma
```javascript
// Browser console'da çalıştırın (F12)
console.log('N8N Debug Info:');
console.log('URL:', window.location.href);
console.log('Cookies:', document.cookie);
console.log('Local Storage:', localStorage);
```

### Network Request Monitoring
1. F12 > Network tab açın
2. N8N'de bir işlem yapın
3. Failed requests'leri kontrol edin
4. Error details'ları paylaşın

---

**🎯 Öncelik**: Web UI bağlantısını kurup import fonksiyonunu test etmek!

Lütfen https://n8n.botfusions.com adresine gidin ve bağlantı durumunu bildirin. 🚀