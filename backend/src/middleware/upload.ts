import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '../utils/config';
import { FileUploadError, FileSizeError, FileTypeError } from '../utils/errors';
import logger from '../utils/logger';

// Configure multer storage
const storage = multer.memoryStorage(); // Store files in memory for processing

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);

    // Check if file type is allowed
    if (!appConfig.upload.allowedTypes.includes(fileExtension)) {
      const error = new FileTypeError(appConfig.upload.allowedTypes);
      logger.warn('File type not allowed', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extension: fileExtension,
        allowedTypes: appConfig.upload.allowedTypes,
      });
      return cb(error);
    }

    // Additional MIME type validation
    const allowedMimeTypes = {
      'pdf': ['application/pdf'],
      'docx': [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream', // Sometimes DOCX files come with this MIME type
      ],
      'txt': ['text/plain'],
      'md': ['text/markdown', 'text/plain'],
    };

    const expectedMimeTypes = allowedMimeTypes[fileExtension as keyof typeof allowedMimeTypes];
    if (expectedMimeTypes && !expectedMimeTypes.includes(file.mimetype)) {
      logger.warn('MIME type mismatch', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extension: fileExtension,
        expectedMimeTypes,
      });

      // Allow the upload but log the warning
      // Some browsers/systems may report incorrect MIME types
    }

    cb(null, true);
  } catch (error) {
    logger.error('Error in file filter:', error);
    cb(new FileUploadError('File validation failed'));
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.upload.maxFileSize,
    files: 1, // Only allow single file uploads
    fields: 10, // Limit number of fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024, // 1MB limit for field values
  },
});

// Single file upload middleware
export const uploadSingleFile = (fieldName: string = 'file') => {
  return upload.single(fieldName);
};

// Multiple file upload middleware
export const uploadMultipleFiles = (fieldName: string = 'files', maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};

// File upload with custom validation
export const uploadWithValidation = (options: {
  fieldName?: string;
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  const {
    fieldName = 'file',
    maxSize = appConfig.upload.maxFileSize,
    allowedTypes = appConfig.upload.allowedTypes,
    required = true,
  } = options;

  // Create custom multer instance with specific options
  const customUpload = multer({
    storage,
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      try {
        const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);

        if (!allowedTypes.includes(fileExtension)) {
          return cb(new FileTypeError(allowedTypes));
        }

        cb(null, true);
      } catch (error) {
        cb(new FileUploadError('File validation failed'));
      }
    },
    limits: {
      fileSize: maxSize,
      files: 1,
    },
  });

  return customUpload.single(fieldName);
};

// Error handling middleware for multer
export const handleUploadErrors = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer error:', error);

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum allowed size of ${appConfig.upload.maxFileSize} bytes`,
          },
        });

      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many files uploaded',
          },
        });

      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FIELD',
            message: 'Unexpected file field',
          },
        });

      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FIELDS',
            message: 'Too many form fields',
          },
        });

      case 'LIMIT_FIELD_KEY':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FIELD_NAME_TOO_LONG',
            message: 'Field name too long',
          },
        });

      case 'LIMIT_FIELD_VALUE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FIELD_VALUE_TOO_LONG',
            message: 'Field value too long',
          },
        });

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload error',
          },
        });
    }
  }

  if (error instanceof FileUploadError ||
      error instanceof FileSizeError ||
      error instanceof FileTypeError) {
    return res.status(400).json({
      success: false,
      error: error.toApiError(),
    });
  }

  next(error);
};

// File validation utilities
export const validateFileContent = async (file: Express.Multer.File): Promise<boolean> => {
  try {
    // Check if file is empty
    if (file.size === 0) {
      return false;
    }

    // Basic file signature validation
    const fileSignatures = {
      'pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
      'docx': [0x50, 0x4B, 0x03, 0x04], // ZIP header (DOCX is a ZIP file)
      'txt': null, // Text files don't have a specific signature
      'md': null, // Markdown files don't have a specific signature
    };

    const extension = path.extname(file.originalname).toLowerCase().substring(1);
    const expectedSignature = fileSignatures[extension as keyof typeof fileSignatures];

    if (expectedSignature && file.buffer) {
      const fileHeader = Array.from(file.buffer.slice(0, 4));
      const matches = expectedSignature.every((byte, index) => fileHeader[index] === byte);

      if (!matches) {
        logger.warn('File signature mismatch', {
          filename: file.originalname,
          expectedSignature,
          actualHeader: fileHeader,
        });
        // Don't reject, just log warning as some files may have variations
      }
    }

    return true;
  } catch (error) {
    logger.error('Error validating file content:', error);
    return false;
  }
};

// Generate safe filename
export const generateSafeFilename = (originalName: string): string => {
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);

  // Sanitize filename
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

  // Generate unique filename
  const uniqueId = uuidv4().split('-')[0]; // Use first part of UUID
  return `${uniqueId}_${safeName}${extension}`;
};

// File metadata extractor
export const extractFileMetadata = (file: Express.Multer.File): Record<string, any> => {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    encoding: file.encoding,
    fieldName: file.fieldname,
    uploadedAt: new Date().toISOString(),
    extension: path.extname(file.originalname).toLowerCase(),
    safeName: generateSafeFilename(file.originalname),
  };
};

// Cleanup uploaded files (for temporary files)
export const cleanupFiles = (files: Express.Multer.File | Express.Multer.File[]): void => {
  try {
    const fileArray = Array.isArray(files) ? files : [files];

    fileArray.forEach(file => {
      // For memory storage, we don't need to delete files from disk
      // But we can clear the buffer to free memory
      if (file.buffer) {
        file.buffer = Buffer.alloc(0);
      }
    });

    logger.debug(`Cleaned up ${fileArray.length} file(s) from memory`);
  } catch (error) {
    logger.error('Error cleaning up files:', error);
  }
};

// File size formatter
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${Math.round(size * 100) / 100} ${sizes[i]}`;
};

// Export upload configurations
export const uploadConfigs = {
  // Standard document upload
  document: uploadWithValidation({
    fieldName: 'file',
    maxSize: appConfig.upload.maxFileSize,
    allowedTypes: appConfig.upload.allowedTypes,
    required: true,
  }),

  // Profile image upload (if needed in future)
  image: uploadWithValidation({
    fieldName: 'image',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif'],
    required: false,
  }),

  // Large file upload
  largeFile: uploadWithValidation({
    fieldName: 'file',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: appConfig.upload.allowedTypes,
    required: true,
  }),
};