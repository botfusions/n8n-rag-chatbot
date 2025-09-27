import WidgetCustomizer from '@/components/widget/WidgetCustomizer'

export default function WidgetCustomizePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget Özelleştirme</h1>
          <p className="text-muted-foreground">
            Chat widget'ınızı markanıza uygun olarak özelleştirin ve web sitenize entegre edin
          </p>
        </div>
      </div>

      <WidgetCustomizer />
    </div>
  )
}