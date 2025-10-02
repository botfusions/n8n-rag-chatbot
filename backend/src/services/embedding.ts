import axios from 'axios';
import { appConfig } from '../utils/config';
import logger from '../utils/logger';
import { N8NError } from '../utils/errors';

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
  metadata?: Record<string, unknown>;
}

class EmbeddingService {
  private static instance: EmbeddingService;

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Upload document to N8N embedding workflow
   */
  public async uploadDocument(request: EmbeddingUploadRequest): Promise<EmbeddingUploadResponse> {
    try {
      if (!appConfig.n8n.embeddingWebhookUrl) {
        throw new N8NError('N8N embedding webhook URL not configured');
      }

      const startTime = Date.now();

      const payload = {
        customerId: request.customerId,
        fileUrl: request.fileUrl,
        fileId: request.fileId,
        fileContent: request.fileContent,
        fileName: request.fileName,
        metadata: {
          ...request.metadata,
          timestamp: new Date().toISOString(),
          source: request.metadata?.source || 'api',
        },
      };

      logger.info('Uploading document to N8N embedding workflow', {
        customerId: request.customerId,
        fileName: request.fileName,
        hasFileUrl: !!request.fileUrl,
        hasFileContent: !!request.fileContent,
      });

      const response = await axios.post(appConfig.n8n.embeddingWebhookUrl, payload, {
        timeout: 120000, // 2 dakika timeout (embedding işlemi uzun sürebilir)
        headers: {
          'Content-Type': 'application/json',
        },
        // SSL sertifika doğrulamasını atla (self-signed cert için)
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false,
        }),
      });

      const processingTime = Date.now() - startTime;

      logger.info('Document uploaded successfully to N8N', {
        customerId: request.customerId,
        processingTime,
        status: response.status,
      });

      const result = response.data;

      return {
        success: true,
        document_id: result?.document_id || result?.id,
        chunks_created: result?.chunks_created || result?.chunk_count,
        embeddings_created: result?.embeddings_created || result?.embedding_count,
        message: result?.message || 'Document uploaded and processed successfully',
        metadata: {
          processing_time: processingTime,
          n8n_workflow: true,
          ...result?.metadata,
        },
      };
    } catch (error) {
      logger.error('Error uploading document to N8N embedding workflow:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new N8NError('Embedding workflow timeout - document too large or processing too slow');
        }

        throw new N8NError(
          `N8N embedding webhook failed: ${error.response?.status || 'unknown'} - ${
            error.response?.statusText || error.message
          }`
        );
      }

      throw new N8NError('Failed to upload document to embedding workflow');
    }
  }

  /**
   * Upload multiple documents in batch
   */
  public async uploadBatch(
    customerId: string,
    documents: Array<{
      fileUrl?: string;
      fileId?: string;
      fileContent?: string;
      fileName?: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      fileName?: string;
      success: boolean;
      document_id?: string;
      error?: string;
    }>;
  }> {
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

    logger.info('Batch document upload completed', {
      customerId,
      total: documents.length,
      successful,
      failed,
    });

    return {
      total: documents.length,
      successful,
      failed,
      results: processedResults,
    };
  }

  /**
   * Check if embedding webhook is configured
   */
  public isConfigured(): boolean {
    return !!appConfig.n8n.embeddingWebhookUrl;
  }

  /**
   * Get webhook URL
   */
  public getWebhookUrl(): string {
    return appConfig.n8n.embeddingWebhookUrl || '';
  }
}

export default EmbeddingService.getInstance();
