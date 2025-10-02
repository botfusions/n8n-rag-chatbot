import { Router } from 'express';
import * as embeddingsController from '../controllers/embeddings';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// Validation schemas
const uploadDocumentValidation = [
  body('customerId').isString().notEmpty().withMessage('customerId is required'),
  body('fileName').optional().isString(),
  body('fileUrl').optional().isURL(),
  body('fileId').optional().isString(),
  body('fileContent').optional().isString(),
  body('metadata').optional().isObject(),
];

const uploadBatchValidation = [
  body('customerId').isString().notEmpty().withMessage('customerId is required'),
  body('documents').isArray({ min: 1, max: 50 }).withMessage('documents must be an array (1-50 items)'),
  body('documents.*.fileName').optional().isString(),
  body('documents.*.fileUrl').optional().isURL(),
  body('documents.*.fileId').optional().isString(),
  body('documents.*.fileContent').optional().isString(),
  body('documents.*.metadata').optional().isObject(),
];

/**
 * @route   POST /api/embeddings/upload
 * @desc    Upload single document for embedding
 * @access  Private
 */
router.post(
  '/upload',
  authenticate,
  uploadDocumentValidation,
  validateRequest,
  embeddingsController.uploadDocument
);

/**
 * @route   POST /api/embeddings/batch
 * @desc    Upload multiple documents in batch
 * @access  Private
 */
router.post(
  '/batch',
  authenticate,
  uploadBatchValidation,
  validateRequest,
  embeddingsController.uploadBatch
);

/**
 * @route   GET /api/embeddings/status
 * @desc    Get embedding webhook configuration status
 * @access  Private
 */
router.get('/status', authenticate, embeddingsController.getStatus);

export default router;
