# 🔗 Chatbot Prompt N8N Workflow Entegrasyonu

## 🎯 System Prompt'un Workflow'a Entegrasyonu

### 1. N8N "Build AI Context" Node Güncellemesi

**Dosya:** `corrected-chat-rag-workflow.json` ve `supabase-only-chat-workflow.json`

#### Güncellenecek Node: "Build AI Context"

```javascript
// Build context from search results with enhanced system prompt
const searchResults = $('Vector Search (Direct Supabase)').item(0).json || [];
const userQuery = $('Parse Chat Input').item(0).json.userQuery;
const metadata = $('Parse Chat Input').item(0).json.metadata;

// Company and bot configuration from metadata
const companyName = metadata.companyName || 'Şirketimiz';
const botName = metadata.botName || 'Asistan';
const customerName = metadata.customerName || '';
const userRole = metadata.userRole || 'visitor';
const locale = metadata.locale || 'tr';

// Prepare context for AI
let context = '';
let sourceDocuments = [];

if (searchResults.length > 0) {
  context = searchResults.map((result, index) => {
    sourceDocuments.push({
      filename: result.document_filename,
      similarity: result.similarity,
      chunkId: result.chunk_id
    });

    return `[Kaynak ${index + 1} - ${result.document_filename}]\\n${result.content}`;
  }).join('\\n\\n---\\n\\n');
} else {
  context = 'Üzgünüm, sorgunuzla ilgili spesifik bilgi bulunamadı.';
}

// Enhanced system prompt with personality
const systemPrompt = `Sen ${companyName} şirketinin akıllı müşteri hizmetleri asistanısın. Adın ${botName} ve şirketin resmi temsilcisi olarak müşterilere yardım ediyorsun.

# KİŞİLİK VE DAVRANIŞ KURALLARI

## Temel Kişilik:
- 🎯 Yardımsever ve çözüm odaklı
- 💬 Samimi ama profesyonel
- 🧠 Bilgili ve güvenilir
- ⚡ Hızlı ve etkili
- 🌟 Pozitif ve motive edici
- 🔍 Detay odaklı ve titiz

## İletişim Tarzı:
- Sıcak ve dostane bir dil kullan
${customerName ? `- Müşteriyi '${customerName}' olarak hitap et` : '- Müşteriye saygılı şekilde hitap et'}
- Emoji'leri uygun şekilde kullan (abartma)
- Açık ve anlaşılır ifadeler kullan
- Teknik terimleri gerektiğinde basit dille açıkla

## Yanıt Formatı:
1. Müşteriyi samimi şekilde karşıla
2. Soruyu tam olarak anladığını göster
3. Bilgi varsa kaynaklarla destekle
4. Net ve uygulanabilir çözümler öner
5. Takip soruları ile yardımı sürdür

# BİLGİ KULLANIMI

## Mevcut Bilgilerin Kullanımı:
- Sadece şirket dokümanlarındaki bilgileri kullan
- Bilgi kaynağını belirt: "Şirket dokümanlarımıza göre..."
- Belirsizlik durumunda uzman yönlendirmesi yap

## Bilgi Bulunamadığında:
- Dürüstçe bilginin olmadığını söyle
- İlgili kişi veya departmanı yönlendir
- Alternatif yardım seçenekleri sun

# SINIRLARI
- Olmayan bilgileri uydurma
- Şirket politikası dışında tavsiyelerde bulunma
- Kişisel bilgi talep etme
- Mali tavsiye verme
- Yasal danışmanlık yapma

${context ? `# MEVCUT ŞIRKET BİLGİLERİ\n\n${context}` : '# BİLGİ DURUMU\n\nŞu anda sorgunuzla ilgili spesifik bilgi bulunamadı. Size yardımcı olmak için genel bilgilerimizi kullanabilirim.'}

Şimdi müşterinin sorusuna en iyi şekilde yanıt vereceğim.`;

// Prepare messages for OpenAI
const messages = [
  {
    role: 'system',
    content: systemPrompt
  },
  {
    role: 'user',
    content: userQuery
  }
];

// Calculate confidence based on search results
const confidence = searchResults.length > 0
  ? Math.max(...searchResults.map(r => r.similarity))
  : 0.3;

return [{
  json: {
    messages,
    context,
    sourceDocuments,
    hasContext: searchResults.length > 0,
    userQuery,
    metadata: {
      ...metadata,
      confidence,
      sourceCount: sourceDocuments.length,
      botPersonality: {
        companyName,
        botName,
        locale,
        hasCustomerName: !!customerName
      }
    }
  }
}];
```

## 🎛️ Environment Variables için Prompt Konfigürasyonu

### N8N Environment Variables'a Eklenecekler:

```env
# Chatbot Personality Configuration
CHATBOT_COMPANY_NAME=Şirket Adı
CHATBOT_BOT_NAME=Asistan
CHATBOT_DEFAULT_LOCALE=tr
CHATBOT_PERSONALITY_LEVEL=0.8
CHATBOT_CONFIDENCE_THRESHOLD=0.7

# Response Configuration
CHATBOT_MAX_RESPONSE_LENGTH=500
CHATBOT_INCLUDE_EMOJIS=true
CHATBOT_INCLUDE_SOURCES=true
CHATBOT_FOLLOWUP_COUNT=3

# Safety Configuration
CHATBOT_REQUIRE_SOURCE_FOR_FACTS=true
CHATBOT_DENY_PERSONAL_INFO=true
CHATBOT_ESCALATE_COMPLEX_ISSUES=true
```

## 🔄 Dynamic Prompt Loading

### Option 1: Database'den Prompt Yükleme

```javascript
// Supabase'den company-specific prompt çekme
const { data: promptConfig } = await supabase
  .from('chatbot_configurations')
  .select('system_prompt, personality_config, response_config')
  .eq('customer_id', customerId)
  .eq('widget_id', widgetId)
  .single();

const systemPrompt = promptConfig?.system_prompt || defaultSystemPrompt;
const personalityConfig = promptConfig?.personality_config || defaultPersonality;
```

### Option 2: Widget Metadata'dan Prompt

```javascript
// Widget metadata'sından prompt konfigürasyonu
const promptConfig = metadata.promptConfig || {};
const companyName = promptConfig.companyName || metadata.companyName || 'Şirketimiz';
const botPersonality = promptConfig.personality || 'professional_friendly';
const specialInstructions = promptConfig.specialInstructions || '';
```

## 🎭 Personality Presets

### Preset 1: Professional (Profesyonel)
```javascript
const professionalPrompt = `
Kişilik: Formal, güvenilir, bilgili
Dil: Saygılı, net, açık
Yaklaşım: Çözüm odaklı, sistematik
Emoji Kullanımı: Minimal
Hitap: "Sayın Müşterimiz", "Efendim"
`;
```

### Preset 2: Friendly (Dostane)
```javascript
const friendlyPrompt = `
Kişilik: Sıcak, yardımsever, pozitif
Dil: Samimi, anlayışlı, cesaret verici
Yaklaşım: Empati odaklı, kişisel
Emoji Kullanımı: Orta seviye 😊
Hitap: İsimle hitap, "sen" dili
`;
```

### Preset 3: Expert (Uzman)
```javascript
const expertPrompt = `
Kişilik: Bilgili, güvenilir, detay odaklı
Dil: Teknik terimler, kapsamlı açıklamalar
Yaklaşım: Analitik, kanıt bazlı
Emoji Kullanımı: Hiç
Hitap: Profesyonel, saygılı
`;
```

## 📊 A/B Testing Implementation

### Test Variant Loader:

```javascript
// A/B test için farklı prompt varyantları
const testVariant = metadata.testVariant || 'A';
const prompts = {
  A: professionalPrompt,
  B: friendlyPrompt,
  C: expertPrompt
};

const selectedPrompt = prompts[testVariant] || prompts.A;

// Analytics için variant tracking
const analyticsData = {
  testVariant,
  promptVersion: selectedPrompt.version,
  timestamp: new Date().toISOString()
};
```

## 🌐 Multi-Language Prompt Support

### Language Detection ve Prompt Selection:

```javascript
// Dil tespiti ve uygun prompt seçimi
const detectedLanguage = metadata.locale || detectLanguage(userQuery) || 'tr';

const prompts = {
  tr: turkishSystemPrompt,
  en: englishSystemPrompt,
  ar: arabicSystemPrompt
};

const systemPrompt = prompts[detectedLanguage] || prompts.tr;

// Dil-specific konfigürasyon
const languageConfig = {
  tr: { formal: false, emoji: true, culturalContext: 'turkish' },
  en: { formal: true, emoji: false, culturalContext: 'international' },
  ar: { formal: true, emoji: false, culturalContext: 'arabic' }
};
```

## 🔧 Workflow'a Entegrasyon Adımları

### 1. Mevcut "Build AI Context" Node'unu Güncelle
- Node'u edit modunda açın
- Yukarıdaki enhanced JavaScript kodunu yapıştırın
- Environment variables bağlantılarını kontrol edin

### 2. Yeni Environment Variables Ekle
- N8N Settings > Environment'a gidin
- Chatbot konfigürasyon değişkenlerini ekleyin
- N8N'i restart edin

### 3. Test ve Doğrulama
- Farklı soru tipleri ile test edin
- Personality tutarlılığını kontrol edin
- Response quality'yi değerlendirin

### 4. Analytics Tracking Ekle
- Prompt version tracking
- A/B test result tracking
- Customer satisfaction monitoring

## 🎯 Sonuç

Bu entegrasyon ile chatbot'unuz:
- ✅ Tutarlı kişiliğe sahip olacak
- ✅ Company-specific davranış sergileyecek
- ✅ Dinamik prompt loading yapabilecek
- ✅ A/B testing destekleyecek
- ✅ Multi-language support sunacak

**Sonraki adım:** Workflow'ları N8N'e import edip test etmek! 🚀

---
Generated with Claude Code (claude.ai/code)