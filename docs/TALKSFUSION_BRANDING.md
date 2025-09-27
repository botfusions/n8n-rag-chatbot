# TalksFusion - BotFusions Ürün Rehberi

## 🏢 Marka Hiyerarşisi

### Ana Marka: BotFusions
- **Şirket Adı**: BotFusions
- **Ana Domain**: botfusions.com
- **Şirket Türü**: AI Automation & Conversational AI Solutions
- **Misyon**: İş süreçlerini AI ile otomatikleştiren kapsamlı platform

### Ürün: TalksFusion
- **Ürün Adı**: TalksFusion (BotFusions ürünü)
- **Ürün Domain**: talksfusion.com
- **Ürün Türü**: RAG-powered Chatbot Platform
- **Odak**: Document-based Conversational AI

### Contact Bilgileri
- **Ana Şirket Support**: support@botfusions.com
- **Ana Şirket Admin**: admin@botfusions.com
- **Ürün Support**: talksfusion@botfusions.com
- **Primary Domain**: https://talksfusion.com

## 🌐 Domain Konfigürasyonu

### Production URLs
```env
# Ana domain
NEXT_PUBLIC_APP_URL=https://talksfusion.com
NEXTAUTH_URL=https://talksfusion.com

# Auth URLs
GOTRUE_SITE_URL=https://talksfusion.com
GOTRUE_EMAIL_CONFIRM_URL=https://talksfusion.com/auth/confirm
GOTRUE_PASSWORD_RESET_URL=https://talksfusion.com/auth/reset

# CORS Origins
GOTRUE_URI_ALLOW_LIST=https://talksfusion.com,http://localhost:3000
```

### Google OAuth Konfigürasyonu
```yaml
Application Name: TalksFusion RAG Chatbot
Authorized JavaScript origins:
  - https://talksfusion.com
  - http://localhost:3000 (development)
  - http://localhost:8000 (docker)

Authorized redirect URIs:
  - https://talksfusion.com/auth/v1/callback
  - https://supabase.turklawai.com/auth/v1/callback
  - http://localhost:8000/auth/v1/callback (docker)
  - http://localhost:54321/auth/v1/callback (local supabase)
```

## 🎨 Marka Kimliği

### Renk Paleti
- **Primary**: Modern mavi tonları
- **Secondary**: Güven veren yeşil
- **Accent**: Dinamik turuncu
- **Background**: Temiz beyaz/açık gri

### Tipografi
- **Başlıklar**: Modern, sans-serif
- **Body Text**: Okunabilir, professional
- **Code**: Monospace, developer-friendly

### Logo/Marka Kullanımı
- **Format**: SVG (scalable)
- **Minimum Boyut**: 24px height
- **Clear Space**: Logo yüksekliğinin %50'si
- **Background**: Şeffaf veya beyaz

## 📱 Platform Özellikleri

### Widget Themes
1. **Corporate Theme**: Professional, mavi-gri tonlar
2. **Modern Theme**: Minimalist, taze renkler
3. **Minimal Theme**: Sade, odaklanmış
4. **Vibrant Theme**: Enerjik, dikkat çekici

### Chat Sistemi
- **Karşılama Mesajı**: "TalksFusion'a hoş geldiniz! Size nasıl yardımcı olabilirim?"
- **Placeholder Text**: "Mesajınızı yazın..."
- **Brand Footer**: "Powered by TalksFusion | A BotFusions Product"
- **Company Branding**: BotFusions logosu footer'da yer alır

## 🔧 Teknik Konfigürasyon

### Environment Variables
```env
# Business Configuration - BotFusions Brand
COMPANY_NAME=BotFusions
PRODUCT_NAME=TalksFusion
SUPPORT_EMAIL=support@botfusions.com
ADMIN_EMAIL=admin@botfusions.com
PRODUCT_EMAIL=talksfusion@botfusions.com

# Domain Settings
NEXT_PUBLIC_APP_URL=https://talksfusion.com
GOTRUE_SITE_URL=https://talksfusion.com

# Multi-language
DEFAULT_LANGUAGE=tr
SUPPORTED_LANGUAGES=tr,en
```

### CORS Settings
```yaml
Kong CORS Configuration:
origins:
  - https://talksfusion.com
  - http://localhost:3000 (development)
  - http://localhost:8000 (docker)
  - https://supabase.turklawai.com (backend)
```

## 📈 SEO ve Marketing

### Meta Tags
```html
<title>TalksFusion - AI-Powered RAG Chatbot Platform | BotFusions</title>
<meta name="description" content="BotFusions TalksFusion ile akıllı chatbot'lar oluşturun. RAG teknolojisi ile güçlendirilmiş conversational AI platform." />
<meta property="og:title" content="TalksFusion - AI Chatbot Platform | BotFusions" />
<meta property="og:url" content="https://talksfusion.com" />
<meta property="og:site_name" content="BotFusions" />
```

### Keywords
- AI Chatbot
- RAG (Retrieval Augmented Generation)
- Conversational AI
- Turkish Chatbot
- Document-based AI
- Customer Support AI

## 🚀 Deployment Checklist

### DNS Settings
- [x] A Record: talksfusion.com → Server IP
- [x] CNAME: www.talksfusion.com → talksfusion.com
- [x] SSL Certificate: Let's Encrypt/Cloudflare

### Google Services
- [x] Google OAuth Client ID configured
- [x] Search Console verification
- [x] Analytics setup (optional)

### Social Media
- [x] Favicon configured
- [x] Open Graph meta tags
- [x] Twitter Card meta tags

## 📞 Support ve Documentation

### Help Resources
- **Documentation**: https://talksfusion.com/docs
- **API Reference**: https://talksfusion.com/api
- **Support Center**: https://talksfusion.com/support
- **BotFusions Main**: https://botfusions.com

### Contact Channels
- **Product Support**: talksfusion@botfusions.com
- **General Support**: support@botfusions.com
- **Documentation**: In-app help center
- **Community**: Discord/Slack (gelecek plan)

## 🔐 Security ve Privacy

### Privacy Policy Points
- Data processing transparency
- GDPR compliance
- Cookie usage disclosure
- User data rights

### Security Measures
- HTTPS enforcement
- JWT token security
- API rate limiting
- Input validation