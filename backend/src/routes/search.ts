import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, searchSchemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimiting';
import vectorService from '../services/vector';
import openaiService from '../services/openai';
import { ResponseHandler } from '../utils/response';
import { ValidationError } from '../utils/errors';

const router = Router();

// Vector search in documents
router.post('/documents',
  rateLimiters.searchEndpoint,
  optionalAuth,
  validate(searchSchemas.documents),
  async (req, res) => {
    try {
      const results = await vectorService.searchDocuments(req.body);
      return ResponseHandler.success(res, { results }, 'Search completed successfully');
    } catch (error) {
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Generate embeddings
router.post('/embeddings/generate',
  rateLimiters.strict,
  authenticate,
  validate(searchSchemas.embeddings),
  async (req, res) => {
    try {
      const embedding = await openaiService.generateEmbedding(req.body);
      return ResponseHandler.success(res, { embedding }, 'Embedding generated successfully');
    } catch (error) {
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Get search suggestions
router.post('/suggestions',
  rateLimiters.searchEndpoint,
  optionalAuth,
  validate(searchSchemas.suggestions),
  async (req, res) => {
    try {
      const { query, widget_id, limit } = req.body;
      const userId = req.user?.id;

      const suggestions = await vectorService.getSearchSuggestions(query, userId, widget_id, limit);
      return ResponseHandler.success(res, { suggestions }, 'Suggestions retrieved successfully');
    } catch (error) {
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Analyze query intent
router.post('/analyze-intent',
  rateLimiters.searchEndpoint,
  optionalAuth,
  async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        throw new ValidationError('Query is required');
      }

      const analysis = await vectorService.analyzeQueryIntent(query);
      return ResponseHandler.success(res, { analysis }, 'Query analyzed successfully');
    } catch (error) {
      return ResponseHandler.error(res, error as Error);
    }
  }
);

export default router;