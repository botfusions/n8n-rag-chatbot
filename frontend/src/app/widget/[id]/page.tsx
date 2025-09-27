'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClientSupabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink, Settings, Eye, Code2 } from 'lucide-react'
import { toast } from 'sonner'

interface ChatWidget {
  id: string
  name: string
  description: string
  webhook_url: string
  is_active: boolean
  settings: {
    theme: {
      primaryColor: string
      backgroundColor: string
      textColor: string
      borderRadius: string
    }
    behavior: {
      welcomeMessage: string
      allowFileUploads: boolean
      allowVoiceInput: boolean
      enableStreaming: boolean
      maxFileSize: string
      allowedFileTypes: string
    }
    features: {
      showWelcomeScreen: boolean
      showFollowUpPrompts: boolean
      showTypingIndicator: boolean
      enableAnalytics: boolean
    }
    customization: {
      companyLogo: string | null
      customCSS: string | null
      footerText: string
    }
  }
  customer_id: string
  created_at: string
}

export default function ChatWidgetPage() {
  const params = useParams()
  const widgetId = params.id as string
  const [widget, setWidget] = useState<ChatWidget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'embed' | 'settings'>('preview')

  const supabase = createClientSupabase()

  useEffect(() => {
    if (widgetId) {
      fetchWidget()
    }
  }, [widgetId])

  const fetchWidget = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chat_widgets')
        .select('*')
        .eq('id', widgetId)
        .single()

      if (error) {
        console.error('Widget fetch error:', error)
        setError('Widget bulunamadı')
        return
      }

      setWidget(data)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const generateEmbedCode = (widget: ChatWidget) => {
    const embedCode = `<!-- ${widget.name} Chat Widget -->
<script type="module">
  import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'

  createChat({
    webhookUrl: '${widget.webhook_url}',
    metadata: {
      customerId: '${widget.customer_id}',
      widgetId: '${widget.id}',
      companyName: '${widget.settings.customization?.footerText || 'Şirket Adı'}',
      userRole: 'visitor',
      subscription: 'free',
      pageUrl: window.location.href,
      sessionStart: new Date().toISOString()
    },
    theme: {
      primaryColor: '${widget.settings.theme.primaryColor}',
      backgroundColor: '${widget.settings.theme.backgroundColor}',
      textColor: '${widget.settings.theme.textColor}',
      borderRadius: '${widget.settings.theme.borderRadius}'
    },
    chatSessionKey: '${widget.customer_id}_${widget.id}',
    initialMessages: ['${widget.settings.behavior.welcomeMessage}'],
    allowFileUploads: ${widget.settings.behavior.allowFileUploads},
    allowVoiceInput: ${widget.settings.behavior.allowVoiceInput},
    allowedFileTypes: '${widget.settings.behavior.allowedFileTypes}',
    maxFileSize: '${widget.settings.behavior.maxFileSize}',
    showWelcomeScreen: ${widget.settings.features.showWelcomeScreen},
    enableStreaming: ${widget.settings.behavior.enableStreaming},
    mode: 'window'
  })
</script>`

    return embedCode
  }

  const copyEmbedCode = () => {
    if (!widget) return

    const embedCode = generateEmbedCode(widget)
    navigator.clipboard.writeText(embedCode)
    toast.success('Embed kodu kopyalandı!')
  }

  const openPreview = () => {
    if (!widget) return

    // Preview için yeni pencere aç
    const previewWindow = window.open('', '_blank', 'width=400,height=600,resizable=yes,scrollbars=yes')
    if (!previewWindow) return

    const previewHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${widget.name} - Preview</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .preview-info {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .preview-info h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .preview-info p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="preview-info">
        <h3>🎯 ${widget.name}</h3>
        <p><strong>Durum:</strong> ${widget.is_active ? '✅ Aktif' : '❌ Pasif'}</p>
        <p><strong>Açıklama:</strong> ${widget.description || 'Açıklama yok'}</p>
        <p><strong>Oluşturulma:</strong> ${new Date(widget.created_at).toLocaleDateString('tr-TR')}</p>
    </div>

    ${generateEmbedCode(widget)}
</body>
</html>`

    previewWindow.document.write(previewHTML)
    previewWindow.document.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !widget) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <CardContent>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Widget Bulunamadı
              </h1>
              <p className="text-gray-600 mb-6">
                {error || 'İstediğiniz chat widget bulunamadı veya erişim izniniz yok.'}
              </p>
              <Button onClick={() => window.history.back()}>
                Geri Dön
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {widget.name}
              </h1>
              <p className="text-gray-600">
                Widget ID: {widget.id}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                widget.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {widget.is_active ? '✅ Aktif' : '❌ Pasif'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'preview', label: 'Önizleme', icon: Eye },
                { id: 'embed', label: 'Embed Kodu', icon: Code2 },
                { id: 'settings', label: 'Ayarlar', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Widget Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Widget Bilgileri</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">İsim</label>
                    <p className="text-gray-900">{widget.name}</p>
                  </div>
                  {widget.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Açıklama</label>
                      <p className="text-gray-900">{widget.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Webhook URL</label>
                    <p className="text-gray-900 font-mono text-sm break-all">{widget.webhook_url}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</label>
                    <p className="text-gray-900">{new Date(widget.created_at).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button
                    onClick={openPreview}
                    className="w-full"
                    size="lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Canlı Önizleme Aç
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme Preview */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Tema Önizlemesi</h3>
                <div
                  className="border rounded-lg p-4 mb-4"
                  style={{
                    backgroundColor: widget.settings.theme.backgroundColor,
                    color: widget.settings.theme.textColor,
                    borderRadius: widget.settings.theme.borderRadius
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: widget.settings.theme.primaryColor }}
                    ></div>
                    <span className="font-medium">Chat Widget</span>
                  </div>
                  <div
                    className="bg-opacity-10 p-3 rounded mb-2"
                    style={{ backgroundColor: widget.settings.theme.primaryColor }}
                  >
                    {widget.settings.behavior.welcomeMessage}
                  </div>
                  <div className="text-xs opacity-75">
                    {widget.settings.customization.footerText}
                  </div>
                </div>

                {/* Theme Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ana Renk:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: widget.settings.theme.primaryColor }}
                      ></div>
                      <span className="font-mono">{widget.settings.theme.primaryColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Arkaplan:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: widget.settings.theme.backgroundColor }}
                      ></div>
                      <span className="font-mono">{widget.settings.theme.backgroundColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Metin Rengi:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: widget.settings.theme.textColor }}
                      ></div>
                      <span className="font-mono">{widget.settings.theme.textColor}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'embed' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Embed Kodu</h3>
                <Button onClick={copyEmbedCode} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Kopyala
                </Button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{generateEmbedCode(widget)}</code>
                </pre>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📝 Kullanım Talimatları</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Bu kodu web sitenizin HTML'ine yapıştırın</li>
                  <li>• Widget otomatik olarak sayfanızda görünecektir</li>
                  <li>• Mobil uyumlu ve responsive tasarımı vardır</li>
                  <li>• Dosya yükleme ve ses girişi desteklenir</li>
                  <li>• Gerçek zamanlı mesajlaşma sağlar</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Behavior Settings */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Davranış Ayarları</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hoş Geldin Mesajı</label>
                    <p className="text-gray-900 bg-gray-50 p-2 rounded text-sm">
                      {widget.settings.behavior.welcomeMessage}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Dosya Yükleme</label>
                      <p className={`text-sm font-medium ${
                        widget.settings.behavior.allowFileUploads ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {widget.settings.behavior.allowFileUploads ? '✅ Aktif' : '❌ Pasif'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Ses Girişi</label>
                      <p className={`text-sm font-medium ${
                        widget.settings.behavior.allowVoiceInput ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {widget.settings.behavior.allowVoiceInput ? '✅ Aktif' : '❌ Pasif'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Maksimum Dosya Boyutu</label>
                    <p className="text-gray-900">{widget.settings.behavior.maxFileSize}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">İzin Verilen Dosya Türleri</label>
                    <p className="text-gray-900 font-mono text-sm">{widget.settings.behavior.allowedFileTypes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Settings */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Özellik Ayarları</h3>
                <div className="space-y-4">
                  {[
                    { key: 'showWelcomeScreen', label: 'Hoş Geldin Ekranı' },
                    { key: 'showFollowUpPrompts', label: 'Takip Soruları' },
                    { key: 'showTypingIndicator', label: 'Yazıyor Göstergesi' },
                    { key: 'enableAnalytics', label: 'Analytics' }
                  ].map((feature) => (
                    <div key={feature.key} className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">
                        {feature.label}
                      </label>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        widget.settings.features[feature.key as keyof typeof widget.settings.features]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {widget.settings.features[feature.key as keyof typeof widget.settings.features] ? 'Aktif' : 'Pasif'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Özelleştirme</h4>
                  <div className="space-y-3">
                    {widget.settings.customization.companyLogo && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Logo URL</label>
                        <p className="text-gray-900 text-sm break-all">{widget.settings.customization.companyLogo}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">Footer Metni</label>
                      <p className="text-gray-900">{widget.settings.customization.footerText}</p>
                    </div>

                    {widget.settings.customization.customCSS && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Özel CSS</label>
                        <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto">
                          {widget.settings.customization.customCSS}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}