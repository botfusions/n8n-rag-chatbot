import { SearchRequest, SearchResult, DocumentChunk, Document } from '../types';
import { ValidationError, OpenAIError } from '../utils/errors';
import supabaseService from './supabase';
import openaiService from './openai';
import logger from '../utils/logger';

class VectorService {
  private static instance: VectorService;

  private constructor() {}

  public static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService();
    }
    return VectorService.instance;
  }

  public async searchDocuments(request: SearchRequest): Promise<SearchResult[]> {
    try {
      const {
        query,
        widget_id,
        document_ids,
        limit = 10,
        similarity_threshold = 0.7,
        include_metadata = true,
      } = request;

      if (!query || query.trim().length === 0) {
        throw new ValidationError('Search query is required');
      }

      // Generate embedding for the query
      const queryEmbedding = await openaiService.generateEmbedding({ text: query });

      // Build search filters
      const filters: Record<string, unknown> = {};

      // If widget_id is provided, get associated document IDs
      if (widget_id) {
        const widget = await supabaseService.findById('chat_widgets', widget_id);
        if (widget) {
          const widgetDocumentIds = (widget as any).document_ids || [];
          if (document_ids) {
            // Intersection of widget documents and requested documents
            filters.document_id = document_ids.filter(id => widgetDocumentIds.includes(id));
          } else {
            filters.document_id = widgetDocumentIds;
          }
        } else {
          return []; // Widget not found
        }
      } else if (document_ids && document_ids.length > 0) {
        filters.document_id = document_ids;
      }

      // Perform vector search
      const searchResults = await supabaseService.vectorSearch('document_chunks', queryEmbedding.embedding, {
        similarityThreshold: similarity_threshold,
        limit,
        filters,
      });

      // Convert to SearchResult format
      const results: SearchResult[] = [];

      for (const result of searchResults) {
        const chunk = result as any as DocumentChunk & { similarity: number };

        // Get document information
        const document = await supabaseService.findById<Document>('documents', chunk.document_id);

        if (document) {
          const searchResult: SearchResult = {
            content: chunk.content,
            similarity_score: 1 - chunk.similarity, // Convert distance to similarity
            document: {
              id: document.id,
              filename: document.original_name,
              ...(include_metadata && { metadata: document.metadata }),
            },
            chunk: {
              id: chunk.id,
              chunk_index: chunk.chunk_index,
              ...(include_metadata && { metadata: chunk.metadata }),
            },
          };

          results.push(searchResult);
        }
      }

      logger.info(`Vector search completed: ${results.length} results for query "${query}"`, {
        widget_id,
        document_ids,
        similarity_threshold,
        limit,
      });

      return results;
    } catch (error) {
      logger.error('Error performing vector search:', error);

      if (error instanceof ValidationError || error instanceof OpenAIError) {
        throw error;
      }

      throw new Error('Vector search failed');
    }
  }

  public async searchUserDocuments(
    userId: string,
    query: string,
    options: {
      limit?: number;
      similarity_threshold?: number;
      document_ids?: string[];
    } = {}
  ): Promise<SearchResult[]> {
    try {
      // Get user's documents
      const userDocuments = await supabaseService.findMany<Document>('documents', {
        filters: { user_id: userId },
        select: 'id',
      });

      const userDocumentIds = userDocuments.map(doc => doc.id);

      // Filter by requested document IDs if provided
      const documentIds = options.document_ids
        ? options.document_ids.filter(id => userDocumentIds.includes(id))
        : userDocumentIds;

      if (documentIds.length === 0) {
        return [];
      }

      return await this.searchDocuments({
        query,
        document_ids: documentIds,
        limit: options.limit,
        similarity_threshold: options.similarity_threshold,
      });
    } catch (error) {
      logger.error(`Error searching user documents for user ${userId}:`, error);
      throw error;
    }
  }

  public async findSimilarChunks(
    chunkId: string,
    options: {
      limit?: number;
      similarity_threshold?: number;
      exclude_same_document?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const { limit = 10, similarity_threshold = 0.8, exclude_same_document = false } = options;

      // Get the source chunk
      const sourceChunk = await supabaseService.findById<DocumentChunk>('document_chunks', chunkId);

      if (!sourceChunk || !sourceChunk.embedding) {
        throw new ValidationError('Source chunk not found or has no embedding');
      }

      // Build filters
      const filters: Record<string, unknown> = {};
      if (exclude_same_document) {
        // This would need to be implemented as a NOT filter in the vector search
        // For now, we'll filter after the search
      }

      // Perform vector search using the chunk's embedding
      const searchResults = await supabaseService.vectorSearch('document_chunks', sourceChunk.embedding, {
        similarityThreshold: similarity_threshold,
        limit: limit + (exclude_same_document ? 5 : 0), // Get extra results to filter
        filters,
      });

      // Convert and filter results
      let results: SearchResult[] = [];

      for (const result of searchResults) {
        const chunk = result as any as DocumentChunk & { similarity: number };

        // Skip the source chunk itself
        if (chunk.id === chunkId) {
          continue;
        }

        // Skip chunks from the same document if requested
        if (exclude_same_document && chunk.document_id === sourceChunk.document_id) {
          continue;
        }

        // Get document information
        const document = await supabaseService.findById<Document>('documents', chunk.document_id);

        if (document) {
          const searchResult: SearchResult = {
            content: chunk.content,
            similarity_score: 1 - chunk.similarity,
            document: {
              id: document.id,
              filename: document.original_name,
            },
            chunk: {
              id: chunk.id,
              chunk_index: chunk.chunk_index,
            },
          };

          results.push(searchResult);

          if (results.length >= limit) {
            break;
          }
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error finding similar chunks for ${chunkId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new Error('Failed to find similar chunks');
    }
  }

  public async getRecommendations(
    userId: string,
    options: {
      based_on_document?: string;
      based_on_query?: string;
      limit?: number;
      similarity_threshold?: number;
    }
  ): Promise<SearchResult[]> {
    try {
      const { based_on_document, based_on_query, limit = 5, similarity_threshold = 0.75 } = options;

      if (!based_on_document && !based_on_query) {
        throw new ValidationError('Either based_on_document or based_on_query is required');
      }

      if (based_on_query) {
        return await this.searchUserDocuments(userId, based_on_query, {
          limit,
          similarity_threshold,
        });
      }

      if (based_on_document) {
        // Get chunks from the source document
        const sourceChunks = await supabaseService.findMany<DocumentChunk>('document_chunks', {
          filters: { document_id: based_on_document },
          limit: 3, // Use first few chunks as seed
          orderBy: { column: 'chunk_index', ascending: true },
        });

        if (sourceChunks.length === 0) {
          return [];
        }

        // Use the first chunk to find similar content
        return await this.findSimilarChunks(sourceChunks[0]!.id, {
          limit,
          similarity_threshold,
          exclude_same_document: true,
        });
      }

      return [];
    } catch (error) {
      logger.error(`Error getting recommendations for user ${userId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new Error('Failed to get recommendations');
    }
  }

  public async analyzeQueryIntent(query: string): Promise<{
    intent: 'search' | 'question' | 'greeting' | 'unknown';
    confidence: number;
    suggested_refinements?: string[];
  }> {
    try {
      const lowercaseQuery = query.toLowerCase().trim();

      // Simple intent analysis
      const greetingPatterns = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
      const questionPatterns = ['what', 'how', 'why', 'when', 'where', 'who', 'can you', 'could you'];
      const searchPatterns = ['find', 'search', 'look for', 'show me', 'list'];

      let intent: 'search' | 'question' | 'greeting' | 'unknown' = 'unknown';
      let confidence = 0.5;

      if (greetingPatterns.some(pattern => lowercaseQuery.includes(pattern))) {
        intent = 'greeting';
        confidence = 0.9;
      } else if (questionPatterns.some(pattern => lowercaseQuery.startsWith(pattern))) {
        intent = 'question';
        confidence = 0.8;
      } else if (searchPatterns.some(pattern => lowercaseQuery.includes(pattern))) {
        intent = 'search';
        confidence = 0.8;
      } else if (lowercaseQuery.length > 3) {
        intent = 'search';
        confidence = 0.6;
      }

      const suggested_refinements: string[] = [];

      // Suggest refinements for low-confidence queries
      if (confidence < 0.7) {
        if (lowercaseQuery.length < 3) {
          suggested_refinements.push('Try using more specific terms');
        }
        if (!lowercaseQuery.includes(' ')) {
          suggested_refinements.push('Try using multiple keywords');
        }
      }

      return {
        intent,
        confidence,
        ...(suggested_refinements.length > 0 && { suggested_refinements }),
      };
    } catch (error) {
      logger.error('Error analyzing query intent:', error);
      return {
        intent: 'unknown',
        confidence: 0.1,
      };
    }
  }

  public async getSearchSuggestions(
    query: string,
    userId?: string,
    widgetId?: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      // Build filters based on context
      const filters: Record<string, unknown> = {};

      if (widgetId) {
        const widget = await supabaseService.findById('chat_widgets', widgetId);
        if (widget) {
          filters.document_id = (widget as any).document_ids || [];
        }
      } else if (userId) {
        const userDocuments = await supabaseService.findMany<Document>('documents', {
          filters: { user_id: userId },
          select: 'id',
        });
        filters.document_id = userDocuments.map(doc => doc.id);
      }

      // Get chunks that contain the query term
      const chunks = await supabaseService.findMany<DocumentChunk>('document_chunks', {
        filters,
        limit: limit * 2, // Get more to have options
      });

      // Extract potential suggestions from chunk content
      const suggestions = new Set<string>();

      for (const chunk of chunks) {
        const content = chunk.content.toLowerCase();
        const queryLower = query.toLowerCase();

        // Find sentences containing the query
        const sentences = content.split(/[.!?]+/);

        for (const sentence of sentences) {
          if (sentence.includes(queryLower)) {
            // Extract potential query extensions
            const words = sentence.trim().split(/\s+/);
            const queryWords = queryLower.split(/\s+/);

            // Look for phrases that start with the query
            for (let i = 0; i < words.length - queryWords.length + 1; i++) {
              const phrase = words.slice(i, i + queryWords.length + 2).join(' ');
              if (phrase.toLowerCase().startsWith(queryLower)) {
                suggestions.add(phrase);
              }
            }
          }
        }

        if (suggestions.size >= limit) {
          break;
        }
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }
}

export default VectorService.getInstance();