/**
 * N8N Embedding Webhook Integration Service
 * Handles document upload and embedding generation via N8N workflow
 */

export interface EmbeddingUploadRequest {
  customerId: string;
  fileUrl?: string;
  fileId?: string;
  fileContent?: string;
  fileName?: string;
  metadata?: {
    source?: string;
    category?: string;
    [key: string]: any;
  };
}

export interface EmbeddingUploadResponse {
  success: boolean;
  document_id?: string;
  chunks_created?: number;
  embeddings_created?: number;
  message?: string;
  metadata?: {
    processing_time?: number;
    n8n_workflow?: boolean;
    [key: string]: any;
  };
}

export interface BatchUploadResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    fileName?: string;
    success: boolean;
    document_id?: string;
    error?: string;
  }>;
}

export class EmbeddingWebhookService {
  private webhookUrl: string;
  private timeout: number;

  constructor(webhookUrl?: string, timeout: number = 120000) {
    this.webhookUrl = webhookUrl || process.env.NEXT_PUBLIC_N8N_EMBEDDING_WEBHOOK_URL || '';
    this.timeout = timeout;
  }

  /**
   * Upload document for embedding generation
   */
  async uploadDocument(request: EmbeddingUploadRequest): Promise<EmbeddingUploadResponse> {
    if (!this.webhookUrl) {
      throw new Error('N8N embedding webhook URL not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const payload = {
        customerId: request.customerId,
        fileUrl: request.fileUrl,
        fileId: request.fileId,
        fileContent: request.fileContent,
        fileName: request.fileName,
        metadata: {
          ...request.metadata,
          timestamp: new Date().toISOString(),
          source: request.metadata?.source || 'frontend',
        },
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Embedding webhook failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        document_id: data?.document_id || data?.id,
        chunks_created: data?.chunks_created || data?.chunk_count,
        embeddings_created: data?.embeddings_created || data?.embedding_count,
        message: data?.message || 'Document uploaded and processed successfully',
        metadata: data?.metadata || {},
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Embedding webhook timeout - document processing taking too long');
        }
        throw error;
      }
      throw new Error('Unknown error occurred during embedding upload');
    }
  }

  /**
   * Upload multiple documents in batch
   */
  async uploadBatch(
    customerId: string,
    documents: Array<Omit<EmbeddingUploadRequest, 'customerId'>>
  ): Promise<BatchUploadResult> {
    const results = await Promise.allSettled(
      documents.map(doc =>
        this.uploadDocument({
          customerId,
          ...doc,
        })
      )
    );

    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          fileName: documents[index]?.fileName,
          success: true,
          document_id: result.value.document_id,
        };
      } else {
        return {
          fileName: documents[index]?.fileName,
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const successful = processedResults.filter(r => r.success).length;
    const failed = processedResults.filter(r => !r.success).length;

    return {
      total: documents.length,
      successful,
      failed,
      results: processedResults,
    };
  }

  /**
   * Upload file from File object
   */
  async uploadFile(customerId: string, file: File, metadata?: Record<string, any>): Promise<EmbeddingUploadResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const fileContent = reader.result as string;

          const result = await this.uploadDocument({
            customerId,
            fileName: file.name,
            fileContent,
            metadata: {
              ...metadata,
              fileType: file.type,
              fileSize: file.size,
            },
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Upload file from URL
   */
  async uploadFromUrl(
    customerId: string,
    fileUrl: string,
    fileName?: string,
    metadata?: Record<string, any>
  ): Promise<EmbeddingUploadResponse> {
    return this.uploadDocument({
      customerId,
      fileUrl,
      fileName: fileName || fileUrl.split('/').pop(),
      metadata,
    });
  }

  /**
   * Check if webhook is configured
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * Get webhook URL
   */
  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

// Singleton instance
export const embeddingWebhook = new EmbeddingWebhookService();

/**
 * React hook for embedding webhook integration
 */
export function useEmbeddingWebhook(webhookUrl?: string) {
  const service = new EmbeddingWebhookService(webhookUrl);

  const uploadDocument = async (request: EmbeddingUploadRequest) => {
    return service.uploadDocument(request);
  };

  const uploadFile = async (customerId: string, file: File, metadata?: Record<string, any>) => {
    return service.uploadFile(customerId, file, metadata);
  };

  const uploadFromUrl = async (
    customerId: string,
    fileUrl: string,
    fileName?: string,
    metadata?: Record<string, any>
  ) => {
    return service.uploadFromUrl(customerId, fileUrl, fileName, metadata);
  };

  const uploadBatch = async (
    customerId: string,
    documents: Array<Omit<EmbeddingUploadRequest, 'customerId'>>
  ) => {
    return service.uploadBatch(customerId, documents);
  };

  return {
    uploadDocument,
    uploadFile,
    uploadFromUrl,
    uploadBatch,
    isConfigured: service.isConfigured(),
    webhookUrl: service.getWebhookUrl(),
  };
}
