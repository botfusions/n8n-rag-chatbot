import OpenAI from 'openai';
import { appConfig } from '../utils/config';
import { EmbeddingRequest, EmbeddingResponse } from '../types';
import { OpenAIError } from '../utils/errors';
import logger from '../utils/logger';

class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;

  private constructor() {
    this.client = new OpenAI({
      apiKey: appConfig.openai.apiKey,
    });

    logger.info('OpenAI client initialized');
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  public async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const { text, model = appConfig.openai.model } = request;

      if (!text || text.trim().length === 0) {
        throw new OpenAIError('Text content is required for embedding generation');
      }

      // Truncate text if it's too long
      const maxTokens = this.getMaxTokensForModel(model);
      const truncatedText = this.truncateText(text, maxTokens);

      const response = await this.client.embeddings.create({
        model,
        input: truncatedText,
        encoding_format: 'float',
      });

      if (!response.data || response.data.length === 0) {
        throw new OpenAIError('No embedding data received from OpenAI');
      }

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new OpenAIError('Invalid embedding data received from OpenAI');
      }

      return {
        embedding,
        token_count: response.usage?.total_tokens || this.estimateTokenCount(truncatedText),
        model,
      };
    } catch (error) {
      logger.error('Error generating embedding:', error);

      if (error instanceof OpenAI.APIError) {
        throw new OpenAIError(`OpenAI API error: ${error.message}`, {
          status: error.status,
          code: error.code,
          type: error.type,
        });
      }

      if (error instanceof OpenAIError) {
        throw error;
      }

      throw new OpenAIError('Unexpected error generating embedding');
    }
  }

  public async generateBatchEmbeddings(
    texts: string[],
    model: string = appConfig.openai.model
  ): Promise<Array<{ text: string; embedding: number[]; token_count: number }>> {
    try {
      if (!texts || texts.length === 0) {
        return [];
      }

      // Process in batches to avoid API limits
      const batchSize = 100; // OpenAI allows up to 2048 inputs per request
      const results: Array<{ text: string; embedding: number[]; token_count: number }> = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const truncatedBatch = batch.map(text => this.truncateText(text, this.getMaxTokensForModel(model)));

        const response = await this.client.embeddings.create({
          model,
          input: truncatedBatch,
          encoding_format: 'float',
        });

        if (!response.data || response.data.length !== truncatedBatch.length) {
          throw new OpenAIError('Incomplete embedding response from OpenAI');
        }

        response.data.forEach((embeddingData, index) => {
          results.push({
            text: batch[index]!,
            embedding: embeddingData.embedding,
            token_count: this.estimateTokenCount(truncatedBatch[index]!),
          });
        });

        // Add small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await this.delay(100);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error generating batch embeddings:', error);

      if (error instanceof OpenAI.APIError) {
        throw new OpenAIError(`OpenAI API error: ${error.message}`, {
          status: error.status,
          code: error.code,
          type: error.type,
        });
      }

      if (error instanceof OpenAIError) {
        throw error;
      }

      throw new OpenAIError('Unexpected error generating batch embeddings');
    }
  }

  public async generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const {
        model = 'gpt-3.5-turbo',
        maxTokens = appConfig.openai.maxTokens,
        temperature = 0.7,
        stream = false,
      } = options;

      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new OpenAIError('No response choices received from OpenAI');
      }

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new OpenAIError('Invalid response content from OpenAI');
      }

      return choice.message.content;
    } catch (error) {
      logger.error('Error generating chat completion:', error);

      if (error instanceof OpenAI.APIError) {
        throw new OpenAIError(`OpenAI API error: ${error.message}`, {
          status: error.status,
          code: error.code,
          type: error.type,
        });
      }

      throw new OpenAIError('Unexpected error generating chat completion');
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple embedding request
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'health check',
      });

      return response.data && response.data.length > 0;
    } catch (error) {
      logger.error('OpenAI health check failed:', error);
      return false;
    }
  }

  // Utility methods
  private getMaxTokensForModel(model: string): number {
    const tokenLimits: Record<string, number> = {
      'text-embedding-3-small': 8191,
      'text-embedding-3-large': 8191,
      'text-embedding-ada-002': 8191,
    };

    return tokenLimits[model] || 8191; // Default to 8k tokens
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private truncateText(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokenCount(text);

    if (estimatedTokens <= maxTokens) {
      return text;
    }

    // Truncate to approximately maxTokens
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get embedding dimension for a model
  public getEmbeddingDimension(model: string): number {
    const dimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };

    return dimensions[model] || 1536; // Default to 1536 dimensions
  }

  // Calculate cosine similarity between two embeddings
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  // Split text into chunks suitable for embedding
  public static chunkText(
    text: string,
    options: {
      maxChunkSize?: number;
      overlap?: number;
      splitOn?: string[];
    } = {}
  ): string[] {
    const {
      maxChunkSize = 1000,
      overlap = 100,
      splitOn = ['\n\n', '\n', '. ', '! ', '? ', ' '],
    } = options;

    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + maxChunkSize, text.length);

      // Try to find a good split point
      if (endIndex < text.length) {
        let bestSplit = endIndex;

        for (const delimiter of splitOn) {
          const lastDelimiter = text.lastIndexOf(delimiter, endIndex);
          if (lastDelimiter > startIndex) {
            bestSplit = lastDelimiter + delimiter.length;
            break;
          }
        }

        endIndex = bestSplit;
      }

      const chunk = text.substring(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Move start index, accounting for overlap
      startIndex = Math.max(endIndex - overlap, startIndex + 1);
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}

export default OpenAIService.getInstance();