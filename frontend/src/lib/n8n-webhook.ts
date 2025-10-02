/**
 * N8N Webhook Integration Service
 * Handles communication with N8N RAG Chat workflow
 */

export interface N8NChatRequest {
  chatInput: string;
  sessionId: string;
  customerId?: string;
  metadata?: {
    visitorInfo?: any;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface N8NChatResponse {
  output?: string;
  response?: string;
  message?: string;
  sources?: Array<{
    content: string;
    similarity_score: number;
    document: {
      id: string;
      filename: string;
    };
  }>;
  metadata?: {
    processing_time?: number;
    n8n_workflow?: boolean;
    [key: string]: any;
  };
}

export class N8NWebhookService {
  private webhookUrl: string;
  private timeout: number;

  constructor(webhookUrl?: string, timeout: number = 30000) {
    this.webhookUrl = webhookUrl || process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL || '';
    this.timeout = timeout;
  }

  /**
   * Send message to N8N RAG Chat workflow
   */
  async sendMessage(request: N8NChatRequest): Promise<N8NChatResponse> {
    if (!this.webhookUrl) {
      throw new Error('N8N webhook URL not configured');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: request.chatInput,
          sessionId: request.sessionId,
          customerId: request.customerId,
          metadata: {
            ...request.metadata,
            timestamp: request.metadata?.timestamp || new Date().toISOString(),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        output: data?.output || data?.response || data?.message,
        response: data?.response,
        message: data?.message,
        sources: data?.sources || [],
        metadata: data?.metadata || {},
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('N8N webhook timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
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
export const n8nWebhook = new N8NWebhookService();

/**
 * React hook for N8N webhook integration
 */
export function useN8NWebhook(webhookUrl?: string) {
  const service = new N8NWebhookService(webhookUrl);

  const sendMessage = async (
    message: string,
    sessionId: string,
    customerId?: string,
    metadata?: any
  ): Promise<N8NChatResponse> => {
    return service.sendMessage({
      chatInput: message,
      sessionId,
      customerId,
      metadata,
    });
  };

  return {
    sendMessage,
    isConfigured: service.isConfigured(),
    webhookUrl: service.getWebhookUrl(),
  };
}
