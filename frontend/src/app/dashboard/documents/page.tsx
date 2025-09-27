'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Upload, FileText, Search, Trash2, Download, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  created_at: string;
  updated_at: string;
  customer_id: string;
  widget_id: string;
}

const statusIcons = {
  pending: Clock,
  processing: Clock,
  completed: CheckCircle,
  failed: AlertCircle
};

const statusColors = {
  pending: 'text-yellow-500',
  processing: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500'
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const supabase = createClientComponentClient();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadWidgets();
    loadDocuments();
  }, [user]);

  const loadWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWidgets(data || []);

      if (data && data.length > 0 && !selectedWidget) {
        setSelectedWidget(data[0].id);
      }
    } catch (error) {
      console.error('Widget yükleme hatası:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Döküman yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFiles || !selectedWidget) return;

    setUploading(true);
    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      try {
        // Dosyayı Supabase Storage'a yükle
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `documents/${user?.id}/${fileName}`;

        // Upload progress takibi
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        // Döküman kaydını veritabanına ekle
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            customer_id: user?.id,
            widget_id: selectedWidget,
            filename: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            status: 'pending'
          })
          .select()
          .single();

        if (docError) throw docError;

        setUploadProgress(prev => ({ ...prev, [file.name]: 75 }));

        // N8N workflow'unu tetikle
        const response = await fetch('/api/trigger-document-processing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: docData.id,
            filePath: filePath,
            customerId: user?.id,
            widgetId: selectedWidget
          }),
        });

        if (!response.ok) {
          throw new Error('N8N workflow tetikleme hatası');
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        return docData;
      } catch (error) {
        console.error(`${file.name} yükleme hatası:`, error);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
        throw error;
      }
    });

    try {
      const results = await Promise.allSettled(uploadPromises);

      // Başarılı yüklemeleri kontrol et
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (successful > 0) {
        alert(t('documents.uploadSuccess', { count: successful }));
        loadDocuments();
      }

      if (failed > 0) {
        alert(t('documents.uploadFailed', { count: failed }));
      }

    } catch (error) {
      console.error('Yükleme hatası:', error);
      alert(t('documents.uploadError'));
    } finally {
      setUploading(false);
      setSelectedFiles(null);
      setUploadProgress({});

      // File input'u temizle
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm(t('documents.confirmDelete'))) return;

    try {
      // Önce dökümanın file_path'ini al
      const { data: docData } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      // Dosyayı storage'dan sil
      if (docData?.file_path) {
        await supabase.storage
          .from('documents')
          .remove([docData.file_path]);
      }

      // Chunks'ları sil
      await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', documentId);

      // Döküman kaydını sil
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      alert(t('documents.deleteSuccess'));
      loadDocuments();
    } catch (error) {
      console.error('Silme hatası:', error);
      alert(t('documents.deleteError'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedWidget === '' || doc.widget_id === selectedWidget)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('documents.title')}
          </h1>
          <p className="text-gray-600">
            {t('documents.description')}
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('documents.upload')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Widget Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('documents.selectWidget')}
              </label>
              <select
                value={selectedWidget}
                onChange={(e) => setSelectedWidget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={uploading}
              >
                <option value="">{t('documents.selectWidgetOption')}</option>
                {widgets.map((widget) => (
                  <option key={widget.id} value={widget.id}>
                    {widget.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('documents.selectFiles')}
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('documents.uploadProgress')}</h3>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span>{fileName}</span>
                    <span>
                      {progress === -1 ? t('documents.failed') : `${progress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        progress === -1 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress === -1 ? 100 : progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleFileUpload}
            disabled={!selectedFiles || !selectedWidget || uploading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? t('documents.uploading') : t('documents.uploadFiles')}
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('documents.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('documents.allWidgets')}</option>
              {widgets.map((widget) => (
                <option key={widget.id} value={widget.id}>
                  {widget.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              {t('documents.list')} ({filteredDocuments.length})
            </h2>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {t('documents.noDocuments')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('documents.filename')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('documents.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('documents.size')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('documents.chunks')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('documents.uploadDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('documents.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => {
                    const StatusIcon = statusIcons[doc.status];
                    const statusColor = statusColors[doc.status];

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {doc.filename}
                              </div>
                              <div className="text-sm text-gray-500">
                                {doc.file_type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className={`w-4 h-4 mr-2 ${statusColor}`} />
                            <span className={`text-sm font-medium ${statusColor}`}>
                              {t(`documents.status.${doc.status}`)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doc.chunk_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(doc.created_at).toLocaleDateString(locale)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}