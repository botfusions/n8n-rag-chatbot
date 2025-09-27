import { Router } from 'express';
import { authenticateWidget } from '../middleware/auth';
import { validate, webhookSchemas, chatSchemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimiting';
import chatService from '../services/chat';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

// Chat webhook for widgets
router.post('/chat/:widgetId',
  rateLimiters.chatEndpoint,
  authenticateWidget,
  validate(chatSchemas.message),
  async (req, res) => {
    try {
      const { widgetId } = req.params;
      const { message, session_id, visitor_info } = req.body;

      const result = await chatService.handleMessage(widgetId, message, session_id, visitor_info);

      logger.info('Chat message processed', {
        widgetId,
        conversationId: result.conversationId,
        messageLength: message.length,
        sourcesCount: result.sources?.length || 0,
      });

      return ResponseHandler.success(res, result, 'Message processed successfully');
    } catch (error) {
      logger.error('Chat webhook error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// N8N webhook endpoint
router.post('/n8n/:widgetId',
  rateLimiters.apiKey,
  validate(webhookSchemas.n8n),
  async (req, res) => {
    try {
      const { widgetId } = req.params;
      const payload = req.body;

      // Process N8N webhook
      logger.info('N8N webhook received', {
        widgetId,
        conversationId: payload.conversation_id,
      });

      // Echo back the payload for now (implement N8N integration logic here)
      return ResponseHandler.success(res, {
        message: 'Webhook processed successfully',
        widgetId,
        payload,
      });
    } catch (error) {
      logger.error('N8N webhook error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// End conversation endpoint
router.post('/chat/:widgetId/end',
  rateLimiters.chatEndpoint,
  authenticateWidget,
  validate(chatSchemas.endConversation),
  async (req, res) => {
    try {
      const { conversation_id, satisfaction_rating, feedback } = req.body;

      await chatService.endConversation(conversation_id, satisfaction_rating, feedback);

      return ResponseHandler.success(res, null, 'Conversation ended successfully');
    } catch (error) {
      logger.error('End conversation error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Get conversation history
router.get('/chat/:widgetId/history/:conversationId',
  rateLimiters.chatEndpoint,
  authenticateWidget,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50 } = req.query;

      const messages = await chatService.getConversationHistory(
        conversationId,
        parseInt(limit as string, 10)
      );

      return ResponseHandler.success(res, { messages }, 'Conversation history retrieved');
    } catch (error) {
      logger.error('Get conversation history error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

export default router;