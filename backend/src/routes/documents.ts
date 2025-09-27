import { Router } from 'express';
import { DocumentController } from '../controllers/documents';
import { authenticate, ensureOwnership } from '../middleware/auth';
import { validate, documentSchemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimiting';
import { uploadConfigs } from '../middleware/upload';

const router = Router();
const documentController = new DocumentController();

// All document routes require authentication
router.use(authenticate);

// Upload document
router.post('/upload',
  rateLimiters.uploadEndpoint,
  uploadConfigs.document,
  validate(documentSchemas.upload),
  documentController.uploadDocument.bind(documentController)
);

// Get user's documents
router.get('/',
  validate(documentSchemas.list, 'query'),
  documentController.getDocuments.bind(documentController)
);

// Get specific document
router.get('/:id',
  ensureOwnership(),
  documentController.getDocument.bind(documentController)
);

// Process document
router.post('/:id/process',
  ensureOwnership(),
  validate(documentSchemas.process),
  documentController.processDocument.bind(documentController)
);

// Reprocess document
router.post('/:id/reprocess',
  ensureOwnership(),
  rateLimiters.strict,
  documentController.reprocessDocument.bind(documentController)
);

// Get document chunks
router.get('/:id/chunks',
  ensureOwnership(),
  documentController.getDocumentChunks.bind(documentController)
);

// Delete document
router.delete('/:id',
  ensureOwnership(),
  rateLimiters.strict,
  documentController.deleteDocument.bind(documentController)
);

export default router;