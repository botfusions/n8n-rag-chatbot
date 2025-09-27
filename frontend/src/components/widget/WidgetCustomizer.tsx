'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Palette, Settings, Eye, Code, Download } from 'lucide-react'

interface WidgetConfig {
  theme: 'corporate' | 'modern' | 'minimal' | 'vibrant'
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  borderRadius: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size: 'small' | 'medium' | 'large'
  welcomeMessage: string
  placeholder: string
  companyName: string
  logoUrl: string
  enableVoice: boolean
  enableFileUpload: boolean
  enableEmojis: boolean
}

const defaultConfig: WidgetConfig = {
  theme: 'corporate',
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  borderRadius: '8px',
  position: 'bottom-right',
  size: 'medium',
  welcomeMessage: 'TalksFusion\'a hoş geldiniz! Size nasıl yardımcı olabilirim?',
  placeholder: 'Mesajınızı yazın...',
  companyName: 'TalksFusion',
  logoUrl: '',
  enableVoice: true,
  enableFileUpload: true,
  enableEmojis: true
}

const themes = {
  corporate: {
    name: 'Corporate',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937'
  },
  modern: {
    name: 'Modern',
    primaryColor: '#10B981',
    secondaryColor: '#059669',
    backgroundColor: '#F9FAFB',
    textColor: '#111827'
  },
  minimal: {
    name: 'Minimal',
    primaryColor: '#6B7280',
    secondaryColor: '#4B5563',
    backgroundColor: '#FFFFFF',
    textColor: '#374151'
  },
  vibrant: {
    name: 'Vibrant',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    backgroundColor: '#FFFBEB',
    textColor: '#92400E'
  }
}

export default function WidgetCustomizer() {
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig)
  const [activeTab, setActiveTab] = useState('appearance')

  const updateConfig = (key: keyof WidgetConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const applyTheme = (themeName: keyof typeof themes) => {
    const theme = themes[themeName]
    setConfig(prev => ({
      ...prev,
      theme: themeName,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor
    }))
  }

  const generateEmbedCode = () => {
    return `<!-- TalksFusion Chat Widget -->
<div id="talksfusion-widget"></div>
<script>
  window.TalksFusionConfig = ${JSON.stringify(config, null, 2)};
  (function() {
    var script = document.createElement('script');
    script.src = 'https://talksfusion.com/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Widget Özelleştirme
              </CardTitle>
              <CardDescription>
                Chat widget'ınızı markanıza uygun olarak özelleştirin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="appearance">Görünüm</TabsTrigger>
                  <TabsTrigger value="behavior">Davranış</TabsTrigger>
                  <TabsTrigger value="branding">Marka</TabsTrigger>
                  <TabsTrigger value="features">Özellikler</TabsTrigger>
                </TabsList>

                <TabsContent value="appearance" className="space-y-4">
                  {/* Theme Selection */}
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(themes).map(([key, theme]) => (
                        <Button
                          key={key}
                          variant={config.theme === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => applyTheme(key as keyof typeof themes)}
                          className="justify-start"
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          {theme.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Color Customization */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Ana Renk</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => updateConfig('primaryColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => updateConfig('primaryColor', e.target.value)}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">İkinci Renk</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={config.secondaryColor}
                          onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={config.secondaryColor}
                          onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                          placeholder="#1E40AF"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Position and Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pozisyon</Label>
                      <Select value={config.position} onValueChange={(value) => updateConfig('position', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Sağ Alt</SelectItem>
                          <SelectItem value="bottom-left">Sol Alt</SelectItem>
                          <SelectItem value="top-right">Sağ Üst</SelectItem>
                          <SelectItem value="top-left">Sol Üst</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Boyut</Label>
                      <Select value={config.size} onValueChange={(value) => updateConfig('size', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Küçük</SelectItem>
                          <SelectItem value="medium">Orta</SelectItem>
                          <SelectItem value="large">Büyük</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="behavior" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcomeMessage">Karşılama Mesajı</Label>
                    <Textarea
                      id="welcomeMessage"
                      value={config.welcomeMessage}
                      onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                      placeholder="Hoş geldiniz! Size nasıl yardımcı olabilirim?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="placeholder">Placeholder Metni</Label>
                    <Input
                      id="placeholder"
                      value={config.placeholder}
                      onChange={(e) => updateConfig('placeholder', e.target.value)}
                      placeholder="Mesajınızı yazın..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Şirket Adı</Label>
                    <Input
                      id="companyName"
                      value={config.companyName}
                      onChange={(e) => updateConfig('companyName', e.target.value)}
                      placeholder="TalksFusion"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={config.logoUrl}
                      onChange={(e) => updateConfig('logoUrl', e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableVoice">Ses Girişi</Label>
                        <p className="text-xs text-muted-foreground">Kullanıcıların sesli mesaj göndermesini sağla</p>
                      </div>
                      <Switch
                        id="enableVoice"
                        checked={config.enableVoice}
                        onCheckedChange={(checked) => updateConfig('enableVoice', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableFileUpload">Dosya Yükleme</Label>
                        <p className="text-xs text-muted-foreground">Kullanıcıların dosya yüklemesini sağla</p>
                      </div>
                      <Switch
                        id="enableFileUpload"
                        checked={config.enableFileUpload}
                        onCheckedChange={(checked) => updateConfig('enableFileUpload', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableEmojis">Emoji Desteği</Label>
                        <p className="text-xs text-muted-foreground">Emoji seçici ve görüntüleme</p>
                      </div>
                      <Switch
                        id="enableEmojis"
                        checked={config.enableEmojis}
                        onCheckedChange={(checked) => updateConfig('enableEmojis', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Embed Kodu
              </CardTitle>
              <CardDescription>
                Bu kodu web sitenize ekleyin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={generateEmbedCode()}
                  readOnly
                  rows={8}
                  className="font-mono text-xs"
                />
                <Button
                  onClick={() => navigator.clipboard.writeText(generateEmbedCode())}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Kodu Kopyala
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Canlı Önizleme
              </CardTitle>
              <CardDescription>
                Widget'ınızın nasıl görüneceğini görün
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-gray-100 rounded-lg p-4 min-h-[400px]">
                {/* Mock Website Background */}
                <div className="text-center text-gray-500 mt-16">
                  <h3 className="text-lg font-semibold mb-2">Web Siteniz</h3>
                  <p className="text-sm">Chat widget burada görünecek</p>
                </div>

                {/* Widget Preview */}
                <div
                  className={`absolute ${
                    config.position === 'bottom-right' ? 'bottom-4 right-4' :
                    config.position === 'bottom-left' ? 'bottom-4 left-4' :
                    config.position === 'top-right' ? 'top-4 right-4' :
                    'top-4 left-4'
                  }`}
                >
                  <div
                    className={`
                      ${config.size === 'small' ? 'w-64 h-80' :
                        config.size === 'medium' ? 'w-80 h-96' :
                        'w-96 h-[28rem]'}
                      border shadow-lg rounded-lg overflow-hidden
                    `}
                    style={{
                      backgroundColor: config.backgroundColor,
                      borderRadius: config.borderRadius
                    }}
                  >
                    {/* Widget Header */}
                    <div
                      className="p-3 text-white flex items-center gap-2"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo" className="w-6 h-6 rounded" />
                      )}
                      <span className="font-semibold text-sm">{config.companyName}</span>
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="p-3 flex-1">
                      <div className="space-y-2">
                        <div className="bg-gray-100 rounded-lg p-2 max-w-[80%]">
                          <p className="text-xs" style={{ color: config.textColor }}>
                            {config.welcomeMessage}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={config.placeholder}
                          className="flex-1 text-xs"
                          style={{ borderColor: config.primaryColor }}
                        />
                        <Button
                          size="sm"
                          style={{ backgroundColor: config.primaryColor }}
                        >
                          →
                        </Button>
                      </div>
                      {(config.enableVoice || config.enableFileUpload || config.enableEmojis) && (
                        <div className="flex gap-1 mt-2">
                          {config.enableVoice && <Badge variant="secondary" className="text-xs">🎤</Badge>}
                          {config.enableFileUpload && <Badge variant="secondary" className="text-xs">📎</Badge>}
                          {config.enableEmojis && <Badge variant="secondary" className="text-xs">😊</Badge>}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="text-center p-2 text-xs text-gray-500">
                      Powered by TalksFusion | A BotFusions Product
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}