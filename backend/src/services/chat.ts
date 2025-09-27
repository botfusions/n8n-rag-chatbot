import axios from 'axios';
import {
  ChatMessage,
  Conversation,
  ChatWidget,
  N8NWebhookPayload,
  N8NResponse,
  MessageSender,
  MessageType,
  ConversationStatus,
  SearchResult
} from '../types';
import { appConfig } from '../utils/config';
import { N8NError, ValidationError } from '../utils/errors';
import supabaseService from './supabase';
import vectorService from './vector';
import openaiService from './openai';
import logger from '../utils/logger';

class ChatService {
  private static instance: ChatService;

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  public async handleMessage(
    widgetId: string,
    message: string,
    sessionId: string,
    visitorInfo?: any
  ): Promise<{
    response: string;
    sources?: SearchResult[];
    conversationId: string;
    metadata?: Record<string, unknown>;
  }> {
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(widgetId, sessionId, visitorInfo);

      // Save user message
      await this.saveMessage(conversation.id, MessageSender.USER, message, MessageType.TEXT);

      // Get widget configuration
      const widget = await supabaseService.findById<ChatWidget>('chat_widgets', widgetId);
      if (!widget) {
        throw new ValidationError('Widget not found');
      }

      // Perform vector search on widget documents
      const searchResults = await vectorService.searchDocuments({
        query: message,
        widget_id: widgetId,
        limit: 5,
        similarity_threshold: 0.7,
      });

      // Generate response
      const { response, metadata } = await this.generateResponse(
        message,
        searchResults,
        widget,
        conversation
      );

      // Save bot response
      await this.saveMessage(conversation.id, MessageSender.BOT, response, MessageType.TEXT, {
        sources: searchResults.slice(0, 3), // Include top 3 sources
        ...metadata,
      });

      // Send to N8N webhook if configured
      if (widget.n8n_webhook_url) {
        try {
          await this.sendToN8N(widget, conversation, message, searchResults, visitorInfo);
        } catch (n8nError) {
          logger.warn('N8N webhook failed:', n8nError);
          // Don't fail the main response if N8N fails
        }
      }

      // Update conversation metrics
      await this.updateConversationMetrics(conversation.id);

      return {
        response,
        sources: searchResults.slice(0, 3),
        conversationId: conversation.id,
        metadata,
      };
    } catch (error) {
      logger.error(`Error handling message for widget ${widgetId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new Error('Failed to process message');
    }
  }

  public async getConversationHistory(
    conversationId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    try {
      return await supabaseService.findMany<ChatMessage>('chat_messages', {
        filters: { conversation_id: conversationId },
        orderBy: { column: 'created_at', ascending: true },
        limit,
      });
    } catch (error) {
      logger.error(`Error getting conversation history ${conversationId}:`, error);
      throw new Error('Failed to retrieve conversation history');
    }
  }

  public async endConversation(
    conversationId: string,
    satisfactionRating?: number,
    feedback?: string
  ): Promise<void> {
    try {
      const conversation = await supabaseService.findById<Conversation>('conversations', conversationId);
      if (!conversation) {
        throw new ValidationError('Conversation not found');
      }

      const endTime = new Date();
      const startTime = new Date(conversation.created_at);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // in seconds

      await supabaseService.update<Conversation>('conversations', conversationId, {
        status: ConversationStatus.COMPLETED,
        duration,
        satisfaction_rating: satisfactionRating,
        feedback,
      });

      logger.info(`Conversation ended: ${conversationId}`, {
        duration,
        satisfactionRating,
        feedback: !!feedback,
      });
    } catch (error) {
      logger.error(`Error ending conversation ${conversationId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new Error('Failed to end conversation');
    }
  }

  private async getOrCreateConversation(
    widgetId: string,
    sessionId: string,
    visitorInfo?: any
  ): Promise<Conversation> {
    try {
      // Try to find existing active conversation
      const existingConversations = await supabaseService.findMany<Conversation>('conversations', {
        filters: {
          widget_id: widgetId,
          session_id: sessionId,
          status: ConversationStatus.ACTIVE,
        },
        limit: 1,
      });

      if (existingConversations.length > 0) {
        return existingConversations[0]!;
      }

      // Create new conversation
      const conversationData = {
        widget_id: widgetId,
        session_id: sessionId,
        visitor_info: visitorInfo,
        status: ConversationStatus.ACTIVE,
        message_count: 0,
      };

      return await supabaseService.create<Conversation>('conversations', conversationData);
    } catch (error) {
      logger.error('Error getting or creating conversation:', error);
      throw new Error('Failed to manage conversation');
    }
  }

  private async saveMessage(
    conversationId: string,
    senderType: MessageSender,
    content: string,
    messageType: MessageType,
    metadata?: Record<string, unknown>
  ): Promise<ChatMessage> {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_type: senderType,
        content,
        message_type: messageType,
        metadata,
        is_internal: false,
      };

      return await supabaseService.create<ChatMessage>('chat_messages', messageData);
    } catch (error) {
      logger.error('Error saving message:', error);
      throw new Error('Failed to save message');
    }
  }

  private async generateResponse(
    message: string,
    searchResults: SearchResult[],
    widget: ChatWidget,
    conversation: Conversation
  ): Promise<{ response: string; metadata: Record<string, unknown> }> {
    try {
      const startTime = Date.now();

      // Build context from search results
      const context = searchResults.map(result => result.content).join('\n\n');

      // Get recent conversation history for context
      const recentMessages = await supabaseService.findMany<ChatMessage>('chat_messages', {
        filters: { conversation_id: conversation.id },
        orderBy: { column: 'created_at', ascending: false },
        limit: 6, // Last 3 exchanges
      });

      const conversationContext = recentMessages
        .reverse()
        .map(msg => `${msg.sender_type}: ${msg.content}`)
        .join('\n');

      // Build system prompt
      const systemPrompt = `You are a helpful AI assistant for ${widget.config.title || 'this website'}.
Your role is to answer questions based on the provided context from the user's documents.

Guidelines:
- Answer questions accurately based on the provided context
- If the context doesn't contain enough information, say so politely
- Be helpful, concise, and professional
- Reference the sources when providing specific information
- If greeting, respond warmly and ask how you can help

Context from documents:
${context}

Recent conversation:
${conversationContext}`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: message },
      ];

      // Generate response using OpenAI
      const response = await openaiService.generateChatCompletion(messages, {
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
      });

      const processingTime = Date.now() - startTime;

      const metadata = {
        processing_time: processingTime,
        sources_count: searchResults.length,
        context_length: context.length,
        model_used: 'gpt-3.5-turbo',
        confidence_score: this.calculateConfidenceScore(searchResults),
      };

      return { response, metadata };
    } catch (error) {
      logger.error('Error generating response:', error);

      // Fallback response
      const fallbackResponse = widget.config.welcome_message ||
        "I'm sorry, I'm having trouble processing your request right now. Please try again later.";

      return {
        response: fallbackResponse,
        metadata: { error: 'generation_failed', fallback: true },
      };
    }
  }

  private calculateConfidenceScore(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) {
      return 0;
    }

    const avgSimilarity = searchResults.reduce((sum, result) => sum + result.similarity_score, 0) / searchResults.length;
    return Math.round(avgSimilarity * 100) / 100;
  }

  private async sendToN8N(
    widget: ChatWidget,
    conversation: Conversation,
    message: string,
    searchResults: SearchResult[],
    visitorInfo?: any
  ): Promise<void> {
    try {
      if (!widget.n8n_webhook_url) {
        return;
      }

      // Get recent messages for context
      const recentMessages = await this.getConversationHistory(conversation.id, 10);

      const payload: N8NWebhookPayload = {
        widget_id: widget.id,
        conversation_id: conversation.id,
        message,
        visitor_info: visitorInfo,
        context: {
          previous_messages: recentMessages.slice(-5), // Last 5 messages
          search_results: searchResults.slice(0, 3), // Top 3 results
          user_metadata: conversation.visitor_info,
        },
      };

      const response = await axios.post(widget.n8n_webhook_url, payload, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          ...(appConfig.n8n.apiKey && { 'Authorization': `Bearer ${appConfig.n8n.apiKey}` }),
        },
      });

      logger.info(`N8N webhook sent successfully for widget ${widget.id}`, {
        conversationId: conversation.id,
        responseStatus: response.status,
      });

      // Process N8N response if needed
      if (response.data) {
        await this.handleN8NResponse(conversation.id, response.data as N8NResponse);
      }
    } catch (error) {
      logger.error('Error sending to N8N webhook:', error);
      throw new N8NError('Failed to send webhook to N8N');
    }
  }

  private async handleN8NResponse(conversationId: string, response: N8NResponse): Promise<void> {
    try {
      // Save N8N response as internal message for tracking
      if (response.message) {
        await this.saveMessage(
          conversationId,
          MessageSender.BOT,
          response.message,
          MessageType.SYSTEM,
          {
            n8n_response: response,
            is_internal: true,
          }
        );
      }

      // Handle N8N actions if needed
      if (response.actions) {
        for (const action of response.actions) {
          logger.info(`N8N action received: ${action.type}`, {
            conversationId,
            payload: action.payload,
          });
          // Additional action handling can be implemented here
        }
      }
    } catch (error) {
      logger.error('Error handling N8N response:', error);
    }
  }

  private async updateConversationMetrics(conversationId: string): Promise<void> {
    try {
      // Get current message count
      const messageCount = await supabaseService.count('chat_messages', {
        conversation_id: conversationId,
      });

      await supabaseService.update<Conversation>('conversations', conversationId, {
        message_count: messageCount,
      });
    } catch (error) {
      logger.error(`Error updating conversation metrics ${conversationId}:`, error);
      // Don't throw error for metrics update failure
    }
  }

  public async getWidgetConversations(
    widgetId: string,
    options: {
      page?: number;
      limit?: number;
      status?: ConversationStatus;
    } = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    try {
      const { page = 1, limit = 20, status } = options;
      const offset = (page - 1) * limit;

      const filters: Record<string, unknown> = { widget_id: widgetId };
      if (status) {
        filters.status = status;
      }

      const conversations = await supabaseService.findMany<Conversation>('conversations', {
        filters,
        orderBy: { column: 'created_at', ascending: false },
        limit,
        offset,
      });

      const total = await supabaseService.count('conversations', filters);

      return { conversations, total };
    } catch (error) {
      logger.error(`Error getting conversations for widget ${widgetId}:`, error);
      throw new Error('Failed to retrieve conversations');
    }
  }

  public async analyzeConversationSentiment(conversationId: string): Promise<{
    overall_sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    message_sentiments: Array<{ messageId: string; sentiment: string; score: number }>;
  }> {
    try {
      const messages = await this.getConversationHistory(conversationId);
      const userMessages = messages.filter(msg => msg.sender_type === MessageSender.USER);

      // Simple sentiment analysis based on keywords
      const positiviKeywords = ['good', 'great', 'excellent', 'helpful', 'thanks', 'thank you', 'perfect'];
      const negativeKeywords = ['bad', 'terrible', 'awful', 'useless', 'hate', 'problem', 'issue', 'wrong'];

      const messageSentiments = userMessages.map(message => {
        const content = message.content.toLowerCase();
        let score = 0;

        positiviKeywords.forEach(keyword => {
          if (content.includes(keyword)) score += 1;
        });

        negativeKeywords.forEach(keyword => {
          if (content.includes(keyword)) score -= 1;
        });

        let sentiment = 'neutral';
        if (score > 0) sentiment = 'positive';
        if (score < 0) sentiment = 'negative';

        return {
          messageId: message.id,
          sentiment,
          score: Math.abs(score),
        };
      });

      // Calculate overall sentiment
      const totalScore = messageSentiments.reduce((sum, msg) => sum + (msg.sentiment === 'positive' ? 1 : msg.sentiment === 'negative' ? -1 : 0), 0);
      let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      if (totalScore > 0) overallSentiment = 'positive';
      if (totalScore < 0) overallSentiment = 'negative';

      const confidence = messageSentiments.length > 0 ?
        Math.min(Math.abs(totalScore) / messageSentiments.length, 1) : 0;

      return {
        overall_sentiment: overallSentiment,
        confidence,
        message_sentiments: messageSentiments,
      };
    } catch (error) {
      logger.error(`Error analyzing sentiment for conversation ${conversationId}:`, error);
      throw new Error('Failed to analyze conversation sentiment');
    }
  }
}

export default ChatService.getInstance();