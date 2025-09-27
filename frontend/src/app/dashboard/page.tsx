'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Users,
  BarChart3,
  TrendingUp,
  Plus,
  Settings,
  Eye,
  FileText,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';

interface DashboardStats {
  totalWidgets: number;
  totalDocuments: number;
  totalMessages: number;
  activeChats: number;
  documentsProcessing: number;
  documentsCompleted: number;
  documentsFailed: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'document' | 'widget';
  description: string;
  timestamp: string;
  status?: 'success' | 'error' | 'warning';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalWidgets: 0,
    totalDocuments: 0,
    totalMessages: 0,
    activeChats: 0,
    documentsProcessing: 0,
    documentsCompleted: 0,
    documentsFailed: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Widget sayısı
      const { count: widgetCount } = await supabase
        .from('widgets')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user?.id);

      // Döküman sayıları
      const { data: documents } = await supabase
        .from('documents')
        .select('status')
        .eq('customer_id', user?.id);

      // Mesaj sayısı
      const { count: messageCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user?.id);

      // Son mesajlardan aktif sohbet sayısını hesapla (son 24 saat)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: activeChatsData } = await supabase
        .from('chat_messages')
        .select('session_id')
        .eq('customer_id', user?.id)
        .gte('created_at', yesterday.toISOString());

      const uniqueSessions = new Set(activeChatsData?.map(msg => msg.session_id) || []);

      // Döküman durumları
      const documentsProcessing = documents?.filter(doc => doc.status === 'processing').length || 0;
      const documentsCompleted = documents?.filter(doc => doc.status === 'completed').length || 0;
      const documentsFailed = documents?.filter(doc => doc.status === 'failed').length || 0;

      setStats({
        totalWidgets: widgetCount || 0,
        totalDocuments: documents?.length || 0,
        totalMessages: messageCount || 0,
        activeChats: uniqueSessions.size,
        documentsProcessing,
        documentsCompleted,
        documentsFailed
      });

      // Son aktiviteleri yükle
      await loadRecentActivity();

    } catch (error) {
      console.error('Dashboard veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Son mesajlar
      const { data: recentMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('customer_id', user?.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(3);

      // Son dökümanlar
      const { data: recentDocuments } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Son widget'lar
      const { data: recentWidgets } = await supabase
        .from('widgets')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Aktiviteleri birleştir ve sırala
      const activities: RecentActivity[] = [];

      recentMessages?.forEach(message => {
        activities.push({
          id: `message-${message.id}`,
          type: 'message',
          description: `Yeni mesaj: ${message.content.substring(0, 50)}...`,
          timestamp: message.created_at,
          status: 'success'
        });
      });

      recentDocuments?.forEach(doc => {
        let status: 'success' | 'error' | 'warning' = 'success';
        if (doc.status === 'failed') status = 'error';
        if (doc.status === 'processing') status = 'warning';

        activities.push({
          id: `document-${doc.id}`,
          type: 'document',
          description: `Döküman yüklendi: ${doc.filename}`,
          timestamp: doc.created_at,
          status
        });
      });

      recentWidgets?.forEach(widget => {
        activities.push({
          id: `widget-${widget.id}`,
          type: 'widget',
          description: `Widget oluşturuldu: ${widget.name}`,
          timestamp: widget.created_at,
          status: 'success'
        });
      });

      // Timestamp'e göre sırala
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      console.error('Son aktivite yükleme hatası:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} saat önce`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} gün önce`;
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'message': return MessageSquare;
      case 'document': return FileText;
      case 'widget': return Activity;
      default: return Activity;
    }
  };

  const getStatusColor = (status?: RecentActivity['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const recentChatbots = [
    {
      id: '1',
      name: 'Müşteri Destek Botu',
      description: 'Genel müşteri sorularını yanıtlayan bot',
      isActive: true,
      conversations: 523
    },
    {
      id: '2',
      name: 'Satış Danışmanı',
      description: 'Ürün bilgileri ve satış desteği',
      isActive: true,
      conversations: 298
    },
    {
      id: '3',
      name: 'Teknik Destek',
      description: 'Teknik sorunlar için destek botu',
      isActive: false,
      conversations: 426
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.welcome')}, chatbot'larınızı yönetin ve performanslarını takip edin.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.totalWidgets')}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWidgets}</div>
            <p className="text-xs text-muted-foreground">
              Aktif widget sayısı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.totalDocuments')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Yüklenen döküman
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.totalMessages')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Toplam mesaj sayısı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.activeChats')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChats}</div>
            <p className="text-xs text-muted-foreground">
              Son 24 saatte aktif
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quickActions.title')}</CardTitle>
            <CardDescription>
              Hızlı işlemler için kısayollar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/widgets/create">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {t('dashboard.quickActions.createWidget')}
              </Button>
            </Link>
            <Link href="/dashboard/documents">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                {t('dashboard.quickActions.uploadDocuments')}
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button className="w-full justify-start" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                {t('dashboard.quickActions.viewAnalytics')}
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Document Status */}
        <Card>
          <CardHeader>
            <CardTitle>Döküman Durumları</CardTitle>
            <CardDescription>
              Yüklenen dökümanların işlenme durumu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Tamamlandı</span>
              </div>
              <span className="font-semibold text-green-600">{stats.documentsCompleted}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">İşleniyor</span>
              </div>
              <span className="font-semibold text-yellow-600">{stats.documentsProcessing}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Başarısız</span>
              </div>
              <span className="font-semibold text-red-600">{stats.documentsFailed}</span>
            </div>

            <Link href="/dashboard/documents">
              <Button variant="ghost" className="w-full">
                Dökümanları Görüntüle
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Son Aktiviteler</CardTitle>
          <CardDescription>
            Sistemdeki son etkinlikler
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Henüz aktivite bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start space-x-3 py-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(activity.status)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                    <Icon className="w-4 h-4 text-muted-foreground mt-1" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}