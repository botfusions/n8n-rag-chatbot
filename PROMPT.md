# N8N RAG Chat Dashboard Projesi - Detaylı Prompt

## Proje Genel Bakışı

N8N Chat UI benzeri bir RAG (Retrieval Augmented Generation) chat dashboard sistemi geliştiriyoruz. Sistem self-hosted Supabase + Coolify üzerinde çalışacak.

## Teknik Stack

### Backend & Database
- **Supabase (Self-hosted)**: PostgreSQL + Auth + Storage + Vector DB
- **Coolify**: Container orchestration ve deployment
- **n8n**: Workflow automation ve chat processing
- **OpenAI API**: Embeddings ve chat completion

### Frontend
- **Next.js 14**: React framework (App Router)
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Supabase JS Client**: Database ve auth integration

## Mevcut Durum

- Coolify + Supabase self-hosted çalışıyor durumda
- Vector extension aktif
- OpenAI API kullanımı mevcut
- Embedding işlemleri yapılabiliyor

## Sistem Mimarisi

```
[Müşteri Dashboard] → [Supabase Auth] → [Document Upload] → [n8n Processing] → [Vector Storage] → [Chat Widget] → [RAG Workflow]
```

## Gereksinimler

### 1. Authentication System
- Email/password ile kayıt
- Email doğrulama (SMTP entegrasyonu)
- Dashboard access control
- Multi-tenant yapı (her müşteri kendi verilerini görür)

### 2. Document Management
- PDF, DOCX, TXT dosya desteği
- Dashboard üzerinden upload
- Automatic text extraction
- Chunking (1000 karakter, 200 overlap)
- OpenAI embedding generation
- Vector storage (Supabase)

### 3. Chat Widget System
- Her müşteri için unique chat widget
- Embed kod generation
- n8n webhook integration
- Customizable appearance

### 4. RAG Workflow (n8n)
```
Chat Trigger → Extract Customer Info → Generate Query Embedding → Vector Search → Build Context → AI Response → Respond to Chat
```

## Database Schema

```sql
-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Widgets  
CREATE TABLE chat_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  name TEXT NOT NULL,
  webhook_url TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  widget_id UUID REFERENCES chat_widgets(id),
  filename TEXT NOT NULL,
  file_size BIGINT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Chunks with Embeddings
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  customer_id UUID REFERENCES customers(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding size
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector search index
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Supabase Vector Search Function

```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  filter_customer_id uuid,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  content text,
  document_filename text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.content,
    d.filename as document_filename,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE 
    dc.customer_id = filter_customer_id
    AND 1 - (dc.embedding <=> query_embedding) > 0.7
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Backend Response Format

### Required Response Structure
```json
{
  "output": "Your response text to render"
}
```

### Optional Response Fields
```json
{
  "output": "Merhaba! Size nasıl yardımcı olabilirim?",
  "followUpPrompts": [
    "Ürün bilgisi istiyorum",
    "Fiyat öğrenmek istiyorum", 
    "Destek talebi oluştur"
  ],
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "alt": "Product image"
    }
  ]
}
```

### n8n Response Node Configuration
```json
{
  "name": "Respond to Chat",
  "type": "n8n-nodes-langchain.respondToChat",
  "parameters": {
    "respondWith": "json",
    "jsonOutput": {
      "output": "={{ JSON.stringify($json.ai_response) }}",
      "followUpPrompts": "={{ JSON.stringify(['Daha fazla bilgi', 'Başka soru sor', 'Destek talep et']) }}"
    }
  }
}
```

### Custom Backend Response Format
```javascript
// Express.js endpoint örneği
app.post('/chat/:widgetId', async (req, res) => {
  try {
    const { chatInput, metadata, sessionId } = req.body
    
    // RAG processing
    const context = await searchDocuments(metadata.customerId, chatInput)
    const aiResponse = await generateResponse(context, chatInput)
    
    // Required response format
    res.json({
      output: aiResponse,
      followUpPrompts: [
        "Daha detaylı bilgi alabilir miyim?",
        "Başka konularda yardım",
        "Bu konuyla ilgili dokümanlar"
      ]
    })
  } catch (error) {
    res.status(500).json({ output: "Üzgünüm, bir hata oluştu." })
  }
})
```

### Default Metadata
Widget otomatik olarak her mesajla birlikte şu metadata'ları gönderir:

```json
{
  "clientCurrentDateTime": "2024-03-21T14:30:45.123Z",
  "clientCurrentTimezone": "Europe/Istanbul", 
  "clientQueryParams": {"utm_source": "google", "ref": "homepage"},
  "clientUserAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
}
```

### Custom Metadata Configuration
```javascript
// Chat widget embed kodu
createChat({
  webhookUrl: 'https://your-n8n.com/webhook/abc123',
  metadata: {
    customerId: 'customer_12345',
    widgetId: 'widget_abc',
    companyName: 'Acme Corp',
    userRole: 'admin',
    subscription: 'premium',
    customFields: {
      department: 'sales',
      priority: 'high'
    }
  }
})
```

### File Upload & Voice Input
- File upload sırasında metadata string olarak gönderilir
- Voice input sırasında metadata string olarak gönderilir
- n8n workflow'unda `JSON.parse()` ile parse etmek gerekir

```javascript
// n8n workflow'unda metadata parsing
const metadata = typeof $json.metadata === 'string' ? 
  JSON.parse($json.metadata) : 
  $json.metadata;
```

### Chat Trigger Node
```json
{
  "name": "Chat Trigger",
  "type": "n8n-nodes-langchain.chatTrigger",
  "parameters": {
    "mode": "hostedChat",
    "options": {
      "loadPreviousSession": "fromMemory",
      "responseMode": "responseNode"
    }
  }
}
```

### Vector Search Integration
```json
{
  "name": "Search Documents",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.SUPABASE_URL }}/rest/v1/rpc/search_documents",
    "headers": {
      "apikey": "{{ $env.SUPABASE_ANON_KEY }}",
      "Content-Type": "application/json"
    },
    "body": {
      "query_embedding": "={{ $json.data[0].embedding }}",
      "filter_customer_id": "={{ $json.customer_id }}",
      "match_count": 3
    }
  }
}
```

## Chat Widget Generation

### Widget Embed Code Template
```javascript
// Dashboard'da müşterilere verilen embed kodu
function generateChatWidget(customerId, widgetId, settings) {
  return `
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'
  
  createChat({
    webhookUrl: '${process.env.N8N_WEBHOOK_BASE_URL}/${widgetId}',
    metadata: {
      customerId: '${customerId}',
      widgetId: '${widgetId}',
      companyName: '${settings.companyName || ''}',
      // Diğer custom metadata buraya eklenebilir
    },
    theme: ${JSON.stringify(settings.theme)},
    chatSessionKey: '${customerId}_${widgetId}',
    initialMessages: ['${settings.welcomeMessage}'],
    allowFileUploads: ${settings.allowFileUploads || false},
    allowedFileTypes: '${settings.allowedFileTypes || 'image/*,application/pdf'}',
    showWelcomeScreen: true
  })
</script>`
}
```

### Gelişmiş Widget Özelleştirme Seçenekleri

#### Theme & Renk Paleti
```javascript
const themeOptions = {
  // Hazır Temalar
  presetThemes: {
    corporate: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: '8px',
      fontFamily: 'Inter, sans-serif'
    },
    modern: {
      primaryColor: '#7c3aed',
      secondaryColor: '#a855f7',
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      borderRadius: '12px',
      fontFamily: 'Poppins, sans-serif'
    },
    minimal: {
      primaryColor: '#374151',
      secondaryColor: '#6b7280',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      borderRadius: '4px',
      fontFamily: 'system-ui, sans-serif'
    },
    vibrant: {
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444',
      backgroundColor: '#fef2f2',
      textColor: '#7f1d1d',
      borderRadius: '16px',
      fontFamily: 'Nunito, sans-serif'
    }
  },

  // Özel Renk Seçenekleri
  customColors: {
    primaryColor: '#6366f1',        // Ana renk - butonlar, başlıklar
    secondaryColor: '#8b5cf6',      // İkincil renk - vurgular
    accentColor: '#06b6d4',         // Accent renk - linkler, özel öğeler
    backgroundColor: '#ffffff',      // Ana arkaplan
    chatBackgroundColor: '#f9fafb', // Chat alanı arkaplanı
    messageBackgroundUser: '#3b82f6', // Kullanıcı mesaj arkaplanı
    messageBackgroundBot: '#f3f4f6',  // Bot mesaj arkaplanı
    textColor: '#1f2937',           // Ana text rengi
    textColorSecondary: '#6b7280',  // İkincil text rengi
    borderColor: '#e5e7eb',         // Border renkleri
    shadowColor: 'rgba(0,0,0,0.1)', // Gölge rengi
    errorColor: '#ef4444',          // Hata mesajları
    successColor: '#10b981',        // Başarı mesajları
    warningColor: '#f59e0b'         // Uyarı mesajları
  }
}

// Gelişmiş widget konfigürasyonu
const advancedWidgetConfig = {
  webhookUrl: webhookUrl,
  metadata: {
    customerId: customerId,
    widgetId: widgetId,
    companyName: companyName,
    userRole: 'visitor',
    pageUrl: window.location.href,
    sessionStart: new Date().toISOString()
  },

  // Detaylı Theme Ayarları
  theme: {
    ...themeOptions.customColors,

    // Typography
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      small: '12px',
      medium: '14px',
      large: '16px',
      xlarge: '18px'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },

    // Layout & Spacing
    borderRadius: '8px',
    borderWidth: '1px',
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    },

    // Animation & Effects
    animations: {
      enabled: true,
      duration: '200ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    shadows: {
      small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }
  },

  // Widget Boyut & Pozisyon
  layout: {
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    width: '380px',
    height: '600px',
    minWidth: '320px',
    maxWidth: '500px',
    margin: '20px',
    zIndex: 9999,
    mode: 'popup' // popup, embedded, fullscreen
  },

  // Davranış Ayarları
  behavior: {
    welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
    placeholderText: 'Mesajınızı yazın...',
    autoOpen: false,
    autoOpenDelay: 3000, // ms
    minimizeEnabled: true,
    closeEnabled: true,
    soundEnabled: true,
    notificationEnabled: true,
    typingIndicator: true,
    readReceipts: true,
    timestamps: true,
    messageLimit: 100 // Maksimum görünen mesaj sayısı
  },

  // Özellikler
  features: {
    allowFileUploads: true,
    allowedFileTypes: 'image/*,application/pdf,text/*',
    maxFileSize: '10MB',
    allowVoiceInput: false,
    allowEmojis: true,
    enableStreaming: true,
    showWelcomeScreen: true,
    showFollowUpPrompts: true,
    enableMarkdown: true,
    enableCodeHighlighting: true
  },

  // Branding
  branding: {
    companyLogo: null, // URL to logo
    companyName: companyName,
    showPoweredBy: true,
    poweredByText: 'Powered by OSİDİEN',
    poweredByUrl: 'https://osidien.com',
    customCSS: null, // Custom CSS overrides
    favicon: null // Widget favicon URL
  }
}
```

## Dashboard Widget Editor Arayüzü

### Widget Customization Panel Tasarımı

```jsx
// Widget Editor Component
const WidgetEditor = ({ widgetId, initialSettings }) => {
  const [settings, setSettings] = useState(initialSettings);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [activeTab, setActiveTab] = useState('theme');

  return (
    <div className="widget-editor-container">
      {/* Header */}
      <div className="editor-header">
        <h2>Widget Özelleştirme</h2>
        <div className="preview-controls">
          <button
            className={previewMode === 'desktop' ? 'active' : ''}
            onClick={() => setPreviewMode('desktop')}
          >
            🖥️ Desktop
          </button>
          <button
            className={previewMode === 'mobile' ? 'active' : ''}
            onClick={() => setPreviewMode('mobile')}
          >
            📱 Mobile
          </button>
        </div>
      </div>

      <div className="editor-layout">
        {/* Sol Panel - Ayarlar */}
        <div className="settings-panel">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={activeTab === 'theme' ? 'active' : ''}
              onClick={() => setActiveTab('theme')}
            >
              🎨 Tema & Renkler
            </button>
            <button
              className={activeTab === 'layout' ? 'active' : ''}
              onClick={() => setActiveTab('layout')}
            >
              📐 Düzen & Boyut
            </button>
            <button
              className={activeTab === 'behavior' ? 'active' : ''}
              onClick={() => setActiveTab('behavior')}
            >
              ⚙️ Davranış
            </button>
            <button
              className={activeTab === 'branding' ? 'active' : ''}
              onClick={() => setActiveTab('branding')}
            >
              🏷️ Marka
            </button>
          </div>

          {/* Theme & Renk Sekmesi */}
          {activeTab === 'theme' && (
            <div className="theme-settings">
              {/* Hazır Temalar */}
              <div className="preset-themes">
                <h3>Hazır Temalar</h3>
                <div className="theme-grid">
                  {Object.entries(themeOptions.presetThemes).map(([key, theme]) => (
                    <div
                      key={key}
                      className={`theme-card ${settings.selectedTheme === key ? 'selected' : ''}`}
                      onClick={() => applyPresetTheme(key, theme)}
                    >
                      <div className="theme-preview" style={{
                        backgroundColor: theme.backgroundColor,
                        border: `2px solid ${theme.primaryColor}`
                      }}>
                        <div
                          className="primary-color"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                        <div
                          className="secondary-color"
                          style={{ backgroundColor: theme.secondaryColor }}
                        />
                      </div>
                      <span className="theme-name">{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Özel Renk Seçici */}
              <div className="custom-colors">
                <h3>Özel Renkler</h3>

                <div className="color-group">
                  <label>Ana Renk (Primary)</label>
                  <ColorPicker
                    value={settings.theme.primaryColor}
                    onChange={(color) => updateThemeColor('primaryColor', color)}
                  />
                </div>

                <div className="color-group">
                  <label>İkincil Renk (Secondary)</label>
                  <ColorPicker
                    value={settings.theme.secondaryColor}
                    onChange={(color) => updateThemeColor('secondaryColor', color)}
                  />
                </div>

                <div className="color-group">
                  <label>Arkaplan Rengi</label>
                  <ColorPicker
                    value={settings.theme.backgroundColor}
                    onChange={(color) => updateThemeColor('backgroundColor', color)}
                  />
                </div>

                <div className="color-group">
                  <label>Metin Rengi</label>
                  <ColorPicker
                    value={settings.theme.textColor}
                    onChange={(color) => updateThemeColor('textColor', color)}
                  />
                </div>
              </div>

              {/* Typography */}
              <div className="typography-settings">
                <h3>Tipografi</h3>

                <div className="font-family">
                  <label>Font Ailesi</label>
                  <select
                    value={settings.theme.fontFamily}
                    onChange={(e) => updateTheme('fontFamily', e.target.value)}
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Poppins, sans-serif">Poppins</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="system-ui, sans-serif">System UI</option>
                  </select>
                </div>

                <div className="border-radius">
                  <label>Köşe Yuvarlaklığı</label>
                  <RangeSlider
                    min={0}
                    max={20}
                    value={parseInt(settings.theme.borderRadius)}
                    onChange={(value) => updateTheme('borderRadius', `${value}px`)}
                  />
                  <span>{settings.theme.borderRadius}</span>
                </div>
              </div>
            </div>
          )}

          {/* Layout & Boyut Sekmesi */}
          {activeTab === 'layout' && (
            <div className="layout-settings">
              <div className="position-settings">
                <h3>Widget Pozisyonu</h3>
                <div className="position-grid">
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                    <button
                      key={pos}
                      className={settings.layout.position === pos ? 'active' : ''}
                      onClick={() => updateLayout('position', pos)}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="size-settings">
                <h3>Boyut Ayarları</h3>

                <div className="size-control">
                  <label>Genişlik</label>
                  <input
                    type="range"
                    min="320"
                    max="500"
                    value={parseInt(settings.layout.width)}
                    onChange={(e) => updateLayout('width', `${e.target.value}px`)}
                  />
                  <span>{settings.layout.width}</span>
                </div>

                <div className="size-control">
                  <label>Yükseklik</label>
                  <input
                    type="range"
                    min="400"
                    max="700"
                    value={parseInt(settings.layout.height)}
                    onChange={(e) => updateLayout('height', `${e.target.value}px`)}
                  />
                  <span>{settings.layout.height}</span>
                </div>
              </div>
            </div>
          )}

          {/* Davranış Sekmesi */}
          {activeTab === 'behavior' && (
            <div className="behavior-settings">
              <div className="welcome-settings">
                <h3>Karşılama Mesajı</h3>
                <textarea
                  value={settings.behavior.welcomeMessage}
                  onChange={(e) => updateBehavior('welcomeMessage', e.target.value)}
                  placeholder="Hoş geldiniz mesajınızı yazın..."
                />
              </div>

              <div className="feature-toggles">
                <h3>Özellikler</h3>

                <ToggleSwitch
                  label="Otomatik Açılma"
                  checked={settings.behavior.autoOpen}
                  onChange={(checked) => updateBehavior('autoOpen', checked)}
                />

                <ToggleSwitch
                  label="Dosya Yükleme"
                  checked={settings.features.allowFileUploads}
                  onChange={(checked) => updateFeature('allowFileUploads', checked)}
                />

                <ToggleSwitch
                  label="Ses Girişi"
                  checked={settings.features.allowVoiceInput}
                  onChange={(checked) => updateFeature('allowVoiceInput', checked)}
                />

                <ToggleSwitch
                  label="Follow-up Önerileri"
                  checked={settings.features.showFollowUpPrompts}
                  onChange={(checked) => updateFeature('showFollowUpPrompts', checked)}
                />
              </div>
            </div>
          )}

          {/* Marka Sekmesi */}
          {activeTab === 'branding' && (
            <div className="branding-settings">
              <div className="logo-upload">
                <h3>Şirket Logosu</h3>
                <ImageUpload
                  value={settings.branding.companyLogo}
                  onChange={(url) => updateBranding('companyLogo', url)}
                  placeholder="Logo yükleyin..."
                />
              </div>

              <div className="company-info">
                <h3>Şirket Bilgileri</h3>
                <input
                  type="text"
                  placeholder="Şirket Adı"
                  value={settings.branding.companyName}
                  onChange={(e) => updateBranding('companyName', e.target.value)}
                />
              </div>

              <div className="powered-by">
                <h3>"Powered By" Ayarları</h3>
                <ToggleSwitch
                  label="Powered By Göster"
                  checked={settings.branding.showPoweredBy}
                  onChange={(checked) => updateBranding('showPoweredBy', checked)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sağ Panel - Preview */}
        <div className="preview-panel">
          <div className={`preview-container ${previewMode}`}>
            <div className="preview-device">
              <ChatWidgetPreview
                settings={settings}
                mode={previewMode}
              />
            </div>
          </div>

          {/* Embed Code */}
          <div className="embed-code-section">
            <h3>Embed Kodu</h3>
            <CodeBlock
              code={generateEmbedCode(settings)}
              language="html"
              copyButton={true}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="editor-footer">
        <button className="btn-secondary" onClick={onCancel}>
          İptal
        </button>
        <button className="btn-primary" onClick={onSave}>
          Kaydet
        </button>
      </div>
    </div>
  );
};
```

### Widget Preview Component

```jsx
const ChatWidgetPreview = ({ settings, mode }) => {
  return (
    <div
      className={`chat-widget-preview ${mode}`}
      style={{
        ...settings.theme,
        width: settings.layout.width,
        height: settings.layout.height,
        position: 'fixed',
        [settings.layout.position.split('-')[0]]: '20px',
        [settings.layout.position.split('-')[1]]: '20px'
      }}
    >
      {/* Widget Header */}
      <div className="widget-header" style={{
        backgroundColor: settings.theme.primaryColor,
        color: 'white'
      }}>
        {settings.branding.companyLogo && (
          <img src={settings.branding.companyLogo} alt="Logo" className="widget-logo" />
        )}
        <span className="widget-title">{settings.branding.companyName}</span>
        <button className="minimize-btn">−</button>
      </div>

      {/* Chat Area */}
      <div className="chat-area" style={{
        backgroundColor: settings.theme.chatBackgroundColor
      }}>
        {/* Welcome Message */}
        <div className="bot-message" style={{
          backgroundColor: settings.theme.messageBackgroundBot,
          color: settings.theme.textColor
        }}>
          {settings.behavior.welcomeMessage}
        </div>

        {/* Sample User Message */}
        <div className="user-message" style={{
          backgroundColor: settings.theme.messageBackgroundUser,
          color: 'white'
        }}>
          Merhaba, yardımcı olabilir misiniz?
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area">
        <input
          type="text"
          placeholder={settings.behavior.placeholderText}
          style={{
            borderColor: settings.theme.borderColor,
            color: settings.theme.textColor
          }}
        />
        <button
          className="send-btn"
          style={{ backgroundColor: settings.theme.primaryColor }}
        >
          →
        </button>
      </div>

      {/* Powered By */}
      {settings.branding.showPoweredBy && (
        <div className="powered-by">
          <small>{settings.branding.poweredByText}</small>
        </div>
      )}
    </div>
  );
};
```

## Widget Embed Code Generator

### Dinamik Embed Code Üretimi

```javascript
// Embed Code Generator Function
const generateEmbedCode = (widgetSettings) => {
  const {
    webhookUrl,
    theme,
    layout,
    behavior,
    features,
    branding,
    customerId,
    widgetId
  } = widgetSettings;

  // Theme object'ini temizle ve optimize et
  const optimizedTheme = {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    fontFamily: theme.fontFamily,
    borderRadius: theme.borderRadius,
    ...theme.customColors
  };

  // Widget konfigürasyonunu oluştur
  const config = {
    webhookUrl,
    metadata: {
      customerId,
      widgetId,
      companyName: branding.companyName,
      timestamp: new Date().toISOString()
    },
    theme: optimizedTheme,
    layout: {
      position: layout.position,
      width: layout.width,
      height: layout.height,
      mode: layout.mode
    },
    behavior,
    features,
    branding: {
      companyLogo: branding.companyLogo,
      companyName: branding.companyName,
      showPoweredBy: branding.showPoweredBy,
      poweredByText: branding.poweredByText
    }
  };

  // Embed HTML kodunu oluştur
  const embedCode = `<!-- Chat Widget by OSİDİEN -->
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

  // Widget Konfigürasyonu
  const chatConfig = ${JSON.stringify(config, null, 2)};

  // Chat Widget'ı Başlat
  createChat(chatConfig);
</script>

<!-- Stil Özelleştirmeleri (İsteğe Bağlı) -->
<style>
  /* Widget Container */
  .n8n-chat {
    font-family: ${theme.fontFamily} !important;
    border-radius: ${theme.borderRadius} !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
  }

  /* Widget Header */
  .n8n-chat-header {
    background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor}) !important;
    color: white !important;
  }

  /* Message Bubbles */
  .n8n-chat-message-user {
    background-color: ${theme.primaryColor} !important;
    color: white !important;
  }

  .n8n-chat-message-bot {
    background-color: ${theme.messageBackgroundBot || '#f3f4f6'} !important;
    color: ${theme.textColor} !important;
  }

  /* Input Area */
  .n8n-chat-input {
    border-color: ${theme.borderColor || '#e5e7eb'} !important;
  }

  .n8n-chat-send-button {
    background-color: ${theme.primaryColor} !important;
  }

  /* Hover Effects */
  .n8n-chat-send-button:hover {
    background-color: ${theme.secondaryColor} !important;
  }
</style>`;

  return embedCode;
};

// Compact Embed Code (Minified)
const generateCompactEmbedCode = (widgetSettings) => {
  const config = {
    webhookUrl: widgetSettings.webhookUrl,
    metadata: {
      customerId: widgetSettings.customerId,
      widgetId: widgetSettings.widgetId,
      companyName: widgetSettings.branding.companyName
    },
    theme: {
      primaryColor: widgetSettings.theme.primaryColor,
      backgroundColor: widgetSettings.theme.backgroundColor,
      textColor: widgetSettings.theme.textColor
    },
    chatSessionKey: `${widgetSettings.customerId}_${widgetSettings.widgetId}`,
    initialMessages: [widgetSettings.behavior.welcomeMessage],
    allowFileUploads: widgetSettings.features.allowFileUploads,
    showWelcomeScreen: widgetSettings.features.showWelcomeScreen
  };

  return `<script type="module">import{createChat}from'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';createChat(${JSON.stringify(config)});</script>`;
};

// Custom Domain Embed Code
const generateCustomDomainEmbedCode = (widgetSettings, customDomain) => {
  const config = {
    ...widgetSettings,
    webhookUrl: widgetSettings.webhookUrl.replace(/^https?:\/\/[^\/]+/, customDomain)
  };

  return generateEmbedCode(config);
};

// WordPress Plugin Embed Code
const generateWordPressEmbedCode = (widgetSettings) => {
  return `<?php
// WordPress Chat Widget
function osidien_chat_widget() {
    $config = '${JSON.stringify({
      webhookUrl: widgetSettings.webhookUrl,
      metadata: {
        customerId: widgetSettings.customerId,
        widgetId: widgetSettings.widgetId
      },
      theme: widgetSettings.theme
    })}';

    echo '<script type="module">
        import { createChat } from "https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js";
        createChat(' . $config . ');
    </script>';
}

// Hook to footer
add_action('wp_footer', 'osidien_chat_widget');
?>`;
};

// React Component Embed Code
const generateReactEmbedCode = (widgetSettings) => {
  return `import React, { useEffect } from 'react';

const ChatWidget = () => {
  useEffect(() => {
    const loadChatWidget = async () => {
      const { createChat } = await import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js');

      const config = ${JSON.stringify(widgetSettings, null, 2)};

      createChat(config);
    };

    loadChatWidget();
  }, []);

  return null; // Widget N8N tarafından DOM'a eklenir
};

export default ChatWidget;`;
};
```

### Multi-Platform Embed Options

```javascript
// Platform-specific embed code generator
const generatePlatformEmbedCode = (widgetSettings, platform) => {
  const baseConfig = {
    webhookUrl: widgetSettings.webhookUrl,
    metadata: {
      customerId: widgetSettings.customerId,
      widgetId: widgetSettings.widgetId,
      platform: platform
    },
    theme: widgetSettings.theme
  };

  switch (platform) {
    case 'html':
      return generateEmbedCode(widgetSettings);

    case 'react':
      return generateReactEmbedCode(widgetSettings);

    case 'wordpress':
      return generateWordPressEmbedCode(widgetSettings);

    case 'shopify':
      return `<!-- Shopify Liquid Template -->
{% comment %} Paste this in your theme.liquid before </body> {% endcomment %}
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

  createChat(${JSON.stringify(baseConfig, null, 2)});
</script>`;

    case 'wix':
      return `<!-- Wix Embed Code -->
<!-- Add this to Custom Code > Body - End Tag -->
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

  window.addEventListener('load', () => {
    createChat(${JSON.stringify(baseConfig, null, 2)});
  });
</script>`;

    case 'squarespace':
      return `<!-- Squarespace Code Injection -->
<!-- Add to Settings > Advanced > Code Injection > Footer -->
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

  createChat(${JSON.stringify(baseConfig, null, 2)});
</script>`;

    default:
      return generateEmbedCode(widgetSettings);
  }
};
```

### Embed Code Component

```jsx
const EmbedCodeSection = ({ widgetSettings }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('html');
  const [copied, setCopied] = useState(false);

  const platforms = [
    { value: 'html', label: '🌐 HTML/JavaScript', icon: '📄' },
    { value: 'react', label: '⚛️ React', icon: '⚛️' },
    { value: 'wordpress', label: '🔸 WordPress', icon: '📝' },
    { value: 'shopify', label: '🛍️ Shopify', icon: '🛒' },
    { value: 'wix', label: '🎨 Wix', icon: '🎨' },
    { value: 'squarespace', label: '⬜ Squarespace', icon: '⬜' }
  ];

  const embedCode = generatePlatformEmbedCode(widgetSettings, selectedPlatform);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="embed-code-section">
      <div className="embed-header">
        <h3>📋 Embed Kodu</h3>
        <p>Widget'ınızı web sitenize eklemek için aşağıdaki kodu kopyalayın:</p>
      </div>

      {/* Platform Seçici */}
      <div className="platform-selector">
        <label>Platform Seçin:</label>
        <div className="platform-grid">
          {platforms.map(platform => (
            <button
              key={platform.value}
              className={`platform-btn ${selectedPlatform === platform.value ? 'active' : ''}`}
              onClick={() => setSelectedPlatform(platform.value)}
            >
              <span className="platform-icon">{platform.icon}</span>
              <span className="platform-label">{platform.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Kod Bloku */}
      <div className="code-block-container">
        <div className="code-header">
          <span className="code-language">{selectedPlatform.toUpperCase()}</span>
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
          >
            {copied ? '✅ Kopyalandı' : '📋 Kopyala'}
          </button>
        </div>

        <pre className="code-block">
          <code>{embedCode}</code>
        </pre>
      </div>

      {/* Kurulum Talimatları */}
      <div className="installation-instructions">
        <h4>📖 Kurulum Talimatları</h4>
        {selectedPlatform === 'html' && (
          <ol>
            <li>Yukarıdaki kodu kopyalayın</li>
            <li>HTML sayfanızın <code>&lt;/body&gt;</code> etiketinden hemen önce yapıştırın</li>
            <li>Sayfayı kaydedin ve test edin</li>
          </ol>
        )}
        {selectedPlatform === 'wordpress' && (
          <ol>
            <li>WordPress admin paneline giriş yapın</li>
            <li>Görünüm → Tema Editörü'ne gidin</li>
            <li>functions.php dosyasını açın</li>
            <li>Kodu dosyanın sonuna ekleyin</li>
            <li>Dosyayı güncelleyin</li>
          </ol>
        )}
        {selectedPlatform === 'react' && (
          <ol>
            <li>Yukarıdaki React komponenti kodu kopyalayın</li>
            <li>Projenizde yeni bir dosya oluşturun (örn: ChatWidget.jsx)</li>
            <li>Komponenti istediğiniz yerde import edin ve kullanın</li>
            <li><code>&lt;ChatWidget /&gt;</code> şeklinde ekleyin</li>
          </ol>
        )}
      </div>

      {/* Test Linki */}
      <div className="test-section">
        <h4>🧪 Test Edin</h4>
        <p>Widget'ınızı test etmek için:</p>
        <a
          href={`${widgetSettings.webhookUrl}/test`}
          target="_blank"
          rel="noopener noreferrer"
          className="test-link"
        >
          🔗 Test Sayfasını Aç
        </a>
      </div>
    </div>
  );
};
```

### 1. Landing Page (/)
- Sistem tanıtımı
- Pricing
- Sign up call-to-action

### 2. Authentication (/auth)
- Sign up form
- Sign in form  
- Email verification page
- Password reset

### 3. Dashboard (/dashboard)
- Document management
- Chat widget management
- Analytics
- Settings

### 4. Chat Widget (/widget/[id])
- Embeddable chat interface
- n8n webhook integration

## Enhanced Features

### Chat Streaming Support
```javascript
// Widget configuration for streaming
createChat({
  webhookUrl: webhookUrl,
  enableStreaming: true, // Real-time response streaming
  metadata: { customerId, widgetId }
})
```

### File Upload Integration
```json
// n8n workflow'unda file handling
{
  "name": "Handle File Upload",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "// File upload durumunda metadata string olarak gelir\nconst metadata = JSON.parse($json.metadata);\nconst files = $json.files || [];\n\n// Dosya bilgilerini işle\nconst fileInfo = files.map(file => ({\n  name: file.filename,\n  size: file.size,\n  type: file.mimeType,\n  url: file.url\n}));\n\nreturn [{\n  json: {\n    customer_id: metadata.customerId,\n    user_query: $json.chatInput,\n    files: fileInfo,\n    has_files: files.length > 0\n  }\n}];"
  }
}
```

### Voice Input Support
```javascript
// Voice input configuration
createChat({
  webhookUrl: webhookUrl,
  allowVoiceInput: true,
  voiceSettings: {
    language: 'tr-TR',
    autoSend: true
  },
  metadata: { customerId, widgetId }
})
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# n8n
N8N_WEBHOOK_BASE_URL=https://your-n8n-domain.com/webhook
```

## Geliştirme Adımları

### Fase 1: Temel Setup
1. Next.js projesi kurulumu
2. Supabase client konfigürasyonu
3. Database schema oluşturma
4. Basic authentication

### Fase 2: Document Management
1. File upload komponenti
2. Text extraction ve chunking
3. Embedding generation
4. Vector storage

### Fase 3: Chat System
1. Chat widget development
2. n8n workflow setup
3. RAG integration
4. Response handling

### Fase 4: Dashboard
1. Document management UI
2. Chat widget management
3. Analytics dashboard
4. Settings sayfası

## Önemli Kararlar

- **Document Upload Method**: Dashboard üzerinden direct upload
- **Authentication**: Supabase Auth ile email verification
- **File Storage**: Supabase Storage
- **Vector Database**: SELF HOST Supabase PostgreSQL + pgvector
- **Chat Processing**: n8n workflows
- **Deployment**: Coolify container management

## İleriye Dönük Planlar

- Multi-language support
- Advanced analytics
- API endpoints
- Webhook integrations
- Custom branding options
- Enterprise features

Bu prompt ile birlikte Claude Code kullanarak hem frontend hem backend geliştirmesini aynı anda yapabiliriz.

 **Secure Identity System** - Hash-based user verification
2. **Role-based Document Access** - Admin/Manager/Guest seviyeleri
3. **Advanced Rate Limiting** - Per-user ve per-domain kontroller
4. **Enterprise Security** - Domain whitelist, encryption
5. **Custom Metadata Injection** - User context'li AI responses
Örnek alınacak siteler
https://www.chatbase.co
https://www.droxy.ai
https://n8nchatui.com

Bu özelliklerin hepsi N8N workflow'larında rahatlıkla implement edilebilir ve bize **büyük competitive advantage** sağlar.

## N8N Supabase-Only Document Embedding Workflow

Bu workflow, dokümanları backend API'sız direkt olarak N8N içinde process eder ve Supabase'e embedding'lerini saklar:

```json
{
  "name": "Supabase-Only Document Embedding",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "embed-document",
        "options": {
          "cors": {
            "allowedOrigins": "*"
          }
        }
      },
      "id": "document-trigger",
      "name": "Document Upload Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "jsCode": "// Parse document upload request\nconst { documentId, customerId, widgetId, filename, fileUrl, fileType, fileContent } = $json;\n\n// Validation\nif (!documentId || !customerId || (!fileUrl && !fileContent)) {\n  throw new Error('Missing required fields: documentId, customerId, and file source');\n}\n\n// Determine processing method\nlet textContent = '';\nif (fileContent) {\n  textContent = fileContent; // Direct text content\n} else {\n  // Will need to fetch from URL\n  textContent = null;\n}\n\nreturn [{\n  json: {\n    documentId,\n    customerId,\n    widgetId: widgetId || null,\n    filename,\n    fileUrl: fileUrl || null,\n    fileType: fileType || 'text/plain',\n    textContent,\n    needsFetch: !fileContent,\n    startTime: Date.now()\n  }\n}];"
      },
      "id": "parse-request",
      "name": "Parse Document Request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.needsFetch }}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "equal"
              }
            }
          ]
        }
      },
      "id": "check-fetch-needed",
      "name": "Check if Fetch Needed",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [680, 300]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "={{ $json.fileUrl }}",
        "options": {
          "timeout": 30000
        }
      },
      "id": "fetch-document",
      "name": "Fetch Document from URL",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [900, 200]
    },
    {
      "parameters": {
        "jsCode": "// Extract text from fetched document\nconst documentData = $('Parse Document Request').item(0).json;\nlet textContent = '';\n\nif (documentData.needsFetch) {\n  // Get from HTTP request\n  const fetchedData = $json;\n  if (typeof fetchedData === 'string') {\n    textContent = fetchedData;\n  } else if (fetchedData.body) {\n    textContent = fetchedData.body;\n  } else {\n    textContent = JSON.stringify(fetchedData);\n  }\n} else {\n  // Use direct content\n  textContent = documentData.textContent;\n}\n\n// Basic text cleaning\ntextContent = textContent\n  .replace(/\\s+/g, ' ')\n  .replace(/[\\x00-\\x1F\\x7F-\\x9F]/g, '')\n  .trim();\n\nif (!textContent || textContent.length < 10) {\n  throw new Error('Document is empty or too short');\n}\n\nreturn [{\n  json: {\n    ...documentData,\n    textContent,\n    textLength: textContent.length,\n    wordCount: textContent.split(' ').length\n  }\n}];"
      },
      "id": "extract-text",
      "name": "Extract Text Content",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1120, 300]
    },
    {
      "parameters": {
        "jsCode": "// Simple but effective chunking\nconst { textContent, ...documentData } = $json;\n\nconst chunkSize = 1000;\nconst chunkOverlap = 200;\nconst chunks = [];\n\nlet currentPos = 0;\nlet chunkIndex = 0;\n\nwhile (currentPos < textContent.length) {\n  const chunkEnd = Math.min(currentPos + chunkSize, textContent.length);\n  \n  // Find a good break point (end of sentence or word)\n  let actualEnd = chunkEnd;\n  if (chunkEnd < textContent.length) {\n    for (let i = chunkEnd; i > currentPos + chunkSize * 0.5; i--) {\n      if (textContent[i] === '.' || textContent[i] === '!' || textContent[i] === '?') {\n        actualEnd = i + 1;\n        break;\n      }\n    }\n    \n    // If no sentence break, find word break\n    if (actualEnd === chunkEnd) {\n      for (let i = chunkEnd; i > currentPos + chunkSize * 0.7; i--) {\n        if (textContent[i] === ' ') {\n          actualEnd = i;\n          break;\n        }\n      }\n    }\n  }\n  \n  const chunkContent = textContent.slice(currentPos, actualEnd).trim();\n  \n  if (chunkContent.length > 50) {\n    chunks.push({\n      chunkIndex,\n      content: chunkContent,\n      length: chunkContent.length,\n      startPos: currentPos,\n      endPos: actualEnd\n    });\n    chunkIndex++;\n  }\n  \n  // Move to next chunk with overlap\n  currentPos = Math.max(actualEnd - chunkOverlap, currentPos + 100);\n  if (currentPos >= actualEnd) break;\n}\n\nreturn [{\n  json: {\n    ...documentData,\n    chunks,\n    chunkCount: chunks.length,\n    processingStatus: 'chunked'\n  }\n}];"
      },
      "id": "chunk-text",
      "name": "Chunk Text Content",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1340, 300]
    },
    {
      "parameters": {
        "batchSize": 5,
        "options": {}
      },
      "id": "batch-chunks",
      "name": "Batch Chunks",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "position": [1560, 300]
    },
    {
      "parameters": {
        "jsCode": "// Prepare embedding batch\nconst documentData = $('Chunk Text Content').item(0).json;\nconst batchData = $json;\n\nconst currentBatch = documentData.chunks.slice(\n  batchData.index * batchData.batchSize,\n  (batchData.index + 1) * batchData.batchSize\n);\n\n// Prepare texts for embedding\nconst textsToEmbed = currentBatch.map(chunk => \n  `Belge: ${documentData.filename}\\n${chunk.content}`\n);\n\nreturn [{\n  json: {\n    ...documentData,\n    currentBatch,\n    textsToEmbed,\n    batchIndex: batchData.index,\n    totalBatches: Math.ceil(documentData.chunks.length / batchData.batchSize)\n  }\n}];"
      },
      "id": "prepare-batch",
      "name": "Prepare Embedding Batch",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1780, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.openai.com/v1/embeddings",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "Authorization",
              "value": "Bearer {{ $env.OPENAI_API_KEY }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "model",
              "value": "text-embedding-ada-002"
            },
            {
              "name": "input",
              "value": "={{ $json.textsToEmbed }}"
            }
          ]
        },
        "options": {
          "timeout": 60000
        }
      },
      "id": "generate-embeddings",
      "name": "Generate Embeddings",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2000, 300]
    },
    {
      "parameters": {
        "jsCode": "// Process embeddings for customer_embeding table\nconst embeddingResponse = $json;\nconst batchData = $('Prepare Embedding Batch').item(0).json;\n\nif (!embeddingResponse.data || !Array.isArray(embeddingResponse.data)) {\n  throw new Error('Invalid embedding response');\n}\n\nconst chunksWithEmbeddings = batchData.currentBatch.map((chunk, index) => {\n  const embedding = embeddingResponse.data[index];\n  \n  return {\n    id: `${batchData.documentId}_chunk_${chunk.chunkIndex}`,\n    kind: 'document',\n    question: null,\n    answer: null,\n    text: chunk.content,\n    chunk_index: chunk.chunkIndex,\n    chunk_total: batchData.totalBatches * batchData.currentBatch.length,\n    metadata: {\n      documentId: batchData.documentId,\n      filename: batchData.filename,\n      fileType: batchData.fileType,\n      chunkLength: chunk.length,\n      startPos: chunk.startPos,\n      endPos: chunk.endPos,\n      widgetId: batchData.widgetId,\n      processingVersion: '1.0',\n      createdAt: new Date().toISOString()\n    },\n    embedding: `[${embedding.embedding.join(',')}]`,\n    embedding_model: 'text-embedding-ada-002',\n    embedding_dim: embedding.embedding.length,\n    customer_id: batchData.customerId,\n    created_at: new Date().toISOString()\n  };\n});\n\nreturn [{\n  json: {\n    chunksWithEmbeddings,\n    documentId: batchData.documentId,\n    batchIndex: batchData.batchIndex,\n    totalBatches: batchData.totalBatches,\n    tokensUsed: embeddingResponse.usage?.total_tokens || 0\n  }\n}];"
      },
      "id": "process-embeddings",
      "name": "Process Embeddings",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [2220, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "{{ $env.SUPABASE_URL }}/rest/v1/customer_embeding",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "apikey",
              "value": "{{ $env.SUPABASE_SERVICE_KEY }}"
            },
            {
              "name": "Authorization",
              "value": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}"
            },
            {
              "name": "Prefer",
              "value": "return=minimal"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "",
              "value": "={{ $json.chunksWithEmbeddings }}"
            }
          ]
        }
      },
      "id": "store-chunks",
      "name": "Store Embeddings in customer_embeding",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2440, 300]
    },
    {
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $('Process Embeddings').item(0).json.batchIndex + 1 }}",
              "rightValue": "={{ $('Process Embeddings').item(0).json.totalBatches }}",
              "operator": {
                "type": "number",
                "operation": "equals"
              }
            }
          ]
        }
      },
      "id": "check-completion",
      "name": "Check if Last Batch",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [2660, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "{{ $env.SUPABASE_URL }}/rest/v1/customer_embeding",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "apikey",
              "value": "{{ $env.SUPABASE_SERVICE_KEY }}"
            },
            {
              "name": "Authorization",
              "value": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "",
              "value": "={{ [{\\n  id: `${$('Process Embeddings').item(0).json.documentId}_completed`,\\n  kind: 'document_status',\\n  question: null,\\n  answer: null,\\n  text: `Document processing completed: ${$('Chunk Text Content').item(0).json.chunkCount} chunks`,\\n  chunk_index: null,\\n  chunk_total: $('Chunk Text Content').item(0).json.chunkCount,\\n  metadata: {\\n    documentId: $('Process Embeddings').item(0).json.documentId,\\n    status: 'completed',\\n    totalChunks: $('Chunk Text Content').item(0).json.chunkCount,\\n    completedAt: new Date().toISOString()\\n  },\\n  embedding: null,\\n  embedding_model: null,\\n  embedding_dim: null,\\n  customer_id: $('Parse Document Request').item(0).json.customerId,\\n  created_at: new Date().toISOString()\\n}] }}"
            }
          ]
        }
      },
      "id": "mark-completed",
      "name": "Mark Document Completed",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2880, 200]
    }
  ],
  "connections": {
    "Document Upload Trigger": {
      "main": [[{"node": "Parse Document Request", "type": "main", "index": 0}]]
    },
    "Parse Document Request": {
      "main": [[{"node": "Check if Fetch Needed", "type": "main", "index": 0}]]
    },
    "Check if Fetch Needed": {
      "main": [
        [{"node": "Fetch Document from URL", "type": "main", "index": 0}],
        [{"node": "Extract Text Content", "type": "main", "index": 0}]
      ]
    },
    "Fetch Document from URL": {
      "main": [[{"node": "Extract Text Content", "type": "main", "index": 0}]]
    },
    "Extract Text Content": {
      "main": [[{"node": "Chunk Text Content", "type": "main", "index": 0}]]
    },
    "Chunk Text Content": {
      "main": [[{"node": "Batch Chunks", "type": "main", "index": 0}]]
    },
    "Batch Chunks": {
      "main": [[{"node": "Prepare Embedding Batch", "type": "main", "index": 0}]]
    },
    "Prepare Embedding Batch": {
      "main": [[{"node": "Generate Embeddings", "type": "main", "index": 0}]]
    },
    "Generate Embeddings": {
      "main": [[{"node": "Process Embeddings", "type": "main", "index": 0}]]
    },
    "Process Embeddings": {
      "main": [[{"node": "Store Chunks in Supabase", "type": "main", "index": 0}]]
    },
    "Store Chunks in Supabase": {
      "main": [[{"node": "Check if Last Batch", "type": "main", "index": 0}]]
    },
    "Check if Last Batch": {
      "main": [
        [{"node": "Mark Document Completed", "type": "main", "index": 0}],
        [{"node": "Batch Chunks", "type": "main", "index": 0}]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "tags": [{
    "id": "supabase-embedding",
    "name": "Supabase Embedding"
  }]
}
```

### Workflow Özellikleri:

1. **Backend Bağımsız**: Doküman processing tamamen N8N içinde yapılır
2. **Basit Text Extraction**: Doğrudan text content veya URL'den fetch
3. **Akıllı Chunking**: Cümle ve kelime sınırlarını koruyarak chunking
4. **Batch Processing**: 5'li gruplar halinde embedding generation
5. **Direkt Supabase**: Embedding'ler doğrudan Supabase'e kaydedilir

### Kullanım:

```javascript
// Frontend'den doküman gönderimi
const response = await fetch('https://your-n8n.com/webhook/embed-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentId: 'doc_123',
    customerId: 'customer_456',
    widgetId: 'widget_789',
    filename: 'document.txt',
    fileContent: 'Bu dokümanın içeriği...' // Direkt text
    // VEYA
    // fileUrl: 'https://example.com/document.pdf' // URL'den fetch
  })
});
```

## Customer Embedding Tablosu için Vector Search Fonksiyonu

Mevcut `customer_embeding` tablo yapınız için optimize edilmiş vector search fonksiyonu:

```sql
-- Vector search function for customer_embeding table
CREATE OR REPLACE FUNCTION search_customer_embeddings(
    query_embedding vector(1536),
    filter_customer_id TEXT,
    filter_kind TEXT DEFAULT 'document',
    match_count INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id TEXT,
    kind TEXT,
    text TEXT,
    question TEXT,
    answer TEXT,
    similarity FLOAT,
    metadata JSONB,
    chunk_index INTEGER,
    chunk_total INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.kind,
        ce.text,
        ce.question,
        ce.answer,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata,
        ce.chunk_index,
        ce.chunk_total
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = filter_kind
        AND ce.embedding IS NOT NULL
        AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Q&A specific search function
CREATE OR REPLACE FUNCTION search_qa_embeddings(
    query_embedding vector(1536),
    filter_customer_id TEXT,
    match_count INT DEFAULT 3,
    similarity_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (
    id TEXT,
    question TEXT,
    answer TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.question,
        ce.answer,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = 'qa'
        AND ce.question IS NOT NULL
        AND ce.answer IS NOT NULL
        AND ce.embedding IS NOT NULL
        AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

## Workflow Entegrasyonu için N8N Vector Search Node

```json
{
  "name": "Vector Search in customer_embeding",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "{{ $env.SUPABASE_URL }}/rest/v1/rpc/search_customer_embeddings",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "apikey",
          "value": "{{ $env.SUPABASE_SERVICE_KEY }}"
        },
        {
          "name": "Authorization",
          "value": "Bearer {{ $env.SUPABASE_SERVICE_KEY }}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "query_embedding",
          "value": "={{ $json.query_embedding }}"
        },
        {
          "name": "filter_customer_id",
          "value": "={{ $json.customer_id }}"
        },
        {
          "name": "filter_kind",
          "value": "document"
        },
        {
          "name": "match_count",
          "value": 5
        },
        {
          "name": "similarity_threshold",
          "value": 0.7
        }
      ]
    }
  }
}
```