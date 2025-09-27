import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  MessageSquare,
  Zap,
  Globe,
  BarChart3,
  Palette,
  Clock,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react'

export default function HomePage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">N8N RAG</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Özellikler
              </Link>
              <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Fiyatlandırma
              </Link>
              <Link href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                İletişim
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost">{t('navigation.login')}</Button>
              </Link>
              <Link href="/auth/register">
                <Button>{t('navigation.register')}</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                <Star className="w-4 h-4 mr-2" />
                RAG Teknolojisi ile Güçlendirilmiş
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              {t('landing.hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="btn-hover">
                  {t('landing.hero.getStarted')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="btn-hover">
                {t('landing.hero.watchDemo')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-hover">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.feature1.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('landing.features.feature1.description')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.feature2.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('landing.features.feature2.description')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.feature3.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('landing.features.feature3.description')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.feature4.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('landing.features.feature4.description')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Palette className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.feature5.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('landing.features.feature5.description')}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('landing.features.feature6.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('landing.features.feature6.description')}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {t('landing.cta.title')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('landing.cta.subtitle')}
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="btn-hover">
                {t('landing.cta.getStarted')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">N8N RAG</span>
              </div>
              <p className="text-muted-foreground">
                Akıllı chatbot çözümleri ile müşteri deneyiminizi geliştirin.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ürün</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Özellikler</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Fiyatlandırma</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Destek</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Dokümantasyon</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">İletişim</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">SSS</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Şirket</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Hakkımızda</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Kariyer</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 N8N RAG Chatbot. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}