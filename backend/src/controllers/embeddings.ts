import { Request, Response, NextFunction } from 'express';
import embeddingService, { EmbeddingUploadRequest } from '../services/embedding';
import { successResponse, errorResponse } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Upload single document for embedding
 */
export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, fileUrl, fileId, fileContent, fileName, metadata } = req.body;

    // Validation
    if (!customerId) {
      throw new ValidationError('customerId is required');
    }

    if (!fileUrl && !fileContent && !fileId) {
      throw new ValidationError('fileUrl, fileContent, or fileId is required');
    }

    const request: EmbeddingUploadRequest = {
      customerId,
      fileUrl,
      fileId,
      fileContent,
      fileName,
      metadata,
    };

    logger.info('Document upload request received', {
      customerId,
      fileName,
      hasFileUrl: !!fileUrl,
      hasFileContent: !!fileContent,
    });

    const result = await embeddingService.uploadDocument(request);

    return successResponse(res, result, 'Document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple documents in batch
 */
export const uploadBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, documents } = req.body;

    // Validation
    if (!customerId) {
      throw new ValidationError('customerId is required');
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      throw new ValidationError('documents array is required and must not be empty');
    }

    if (documents.length > 50) {
      throw new ValidationError('Maximum 50 documents per batch');
    }

    logger.info('Batch document upload request received', {
      customerId,
      documentCount: documents.length,
    });

    const result = await embeddingService.uploadBatch(customerId, documents);

    return successResponse(res, result, 'Batch upload completed', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Check webhook configuration status
 */
export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isConfigured = embeddingService.isConfigured();
    const webhookUrl = embeddingService.getWebhookUrl();

    return successResponse(res, {
      configured: isConfigured,
      webhook_url: webhookUrl ? '***configured***' : null,
      status: isConfigured ? 'active' : 'not_configured',
    });
  } catch (error) {
    next(error);
  }
};
