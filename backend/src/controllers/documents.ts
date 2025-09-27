import { Response } from 'express';
import { AuthenticatedRequest, Document, DocumentStatus } from '../types';
import { ResponseHandler, createPaginationInfo } from '../utils/response';
import { ValidationError, NotFoundError, AuthorizationError } from '../utils/errors';
import documentService from '../services/document';
import { checkOwnership } from '../middleware/auth';
import logger from '../utils/logger';

export class DocumentController {
  public async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      if (!req.file) {
        throw new ValidationError('File is required');
      }

      const { metadata } = req.body;

      const document = await documentService.uploadDocument(
        req.file,
        req.user.id,
        metadata ? JSON.parse(metadata) : undefined
      );

      logger.info('Document uploaded', {
        documentId: document.id,
        userId: req.user.id,
        filename: document.original_name,
        size: document.file_size,
      });

      return ResponseHandler.created(res, { document }, 'Document uploaded successfully');

    } catch (error) {
      logger.error('Document upload error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async getDocuments(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { page = 1, limit = 20, status, search } = req.query;

      const options = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        status: status as DocumentStatus,
        search: search as string,
      };

      const { documents, total } = await documentService.getDocuments(req.user.id, options);

      const pagination = createPaginationInfo(options.page, options.limit, total);

      return ResponseHandler.paginated(res, documents, pagination);

    } catch (error) {
      logger.error('Get documents error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async getDocument(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id } = req.params;

      // Check ownership
      const hasOwnership = await checkOwnership('documents', id, req.user.id);
      if (!hasOwnership) {
        throw new AuthorizationError('Access denied to this document');
      }

      const document = await documentService.getDocuments(req.user.id, { search: id });

      if (!document.documents.length) {
        throw new NotFoundError('Document');
      }

      return ResponseHandler.success(res, { document: document.documents[0] });

    } catch (error) {
      logger.error('Get document error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async processDocument(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id } = req.params;

      // Check ownership
      const hasOwnership = await checkOwnership('documents', id, req.user.id);
      if (!hasOwnership) {
        throw new AuthorizationError('Access denied to this document');
      }

      const document = await documentService.processDocument(id);

      logger.info('Document processing started', {
        documentId: id,
        userId: req.user.id,
      });

      return ResponseHandler.success(res, { document }, 'Document processing started');

    } catch (error) {
      logger.error('Document processing error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async deleteDocument(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id } = req.params;

      await documentService.deleteDocument(id, req.user.id);

      logger.info('Document deleted', {
        documentId: id,
        userId: req.user.id,
      });

      return ResponseHandler.success(res, null, 'Document deleted successfully');

    } catch (error) {
      logger.error('Delete document error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async getDocumentChunks(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id } = req.params;

      const chunks = await documentService.getDocumentChunks(id, req.user.id);

      return ResponseHandler.success(res, { chunks });

    } catch (error) {
      logger.error('Get document chunks error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }

  public async reprocessDocument(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id } = req.params;

      const document = await documentService.reprocessDocument(id, req.user.id);

      logger.info('Document reprocessing started', {
        documentId: id,
        userId: req.user.id,
      });

      return ResponseHandler.success(res, { document }, 'Document reprocessing started');

    } catch (error) {
      logger.error('Document reprocessing error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
}