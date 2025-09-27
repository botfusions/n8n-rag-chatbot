import { ApiError } from '../types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  public toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

// Authentication Errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', true, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS', true, details);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = 'Invalid credentials', details?: Record<string, unknown>) {
    super(message, 401, 'INVALID_CREDENTIALS', true, details);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token expired', details?: Record<string, unknown>) {
    super(message, 401, 'TOKEN_EXPIRED', true, details);
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string = 'Invalid input provided', details?: Record<string, unknown>) {
    super(message, 400, 'INVALID_INPUT', true, details);
  }
}

// Resource Errors
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, 'RESOURCE_CONFLICT', true, details);
  }
}

export class DuplicateResourceError extends AppError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} already exists`, 409, 'DUPLICATE_RESOURCE', true, details);
  }
}

// File Errors
export class FileUploadError extends AppError {
  constructor(message: string = 'File upload failed', details?: Record<string, unknown>) {
    super(message, 400, 'FILE_UPLOAD_ERROR', true, details);
  }
}

export class FileSizeError extends AppError {
  constructor(maxSize: number, details?: Record<string, unknown>) {
    super(`File size exceeds maximum allowed size of ${maxSize} bytes`, 400, 'FILE_SIZE_EXCEEDED', true, details);
  }
}

export class FileTypeError extends AppError {
  constructor(allowedTypes: string[], details?: Record<string, unknown>) {
    super(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400, 'FILE_TYPE_NOT_ALLOWED', true, details);
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string = 'File processing failed', details?: Record<string, unknown>) {
    super(message, 500, 'FILE_PROCESSING_ERROR', true, details);
  }
}

// Rate Limiting Errors
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
  }
}

// External Service Errors
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error', details?: Record<string, unknown>) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
  }
}

export class OpenAIError extends AppError {
  constructor(message: string = 'OpenAI API error', details?: Record<string, unknown>) {
    super(message, 502, 'OPENAI_ERROR', true, details);
  }
}

export class SupabaseError extends AppError {
  constructor(message: string = 'Supabase error', details?: Record<string, unknown>) {
    super(message, 502, 'SUPABASE_ERROR', true, details);
  }
}

export class N8NError extends AppError {
  constructor(message: string = 'N8N webhook error', details?: Record<string, unknown>) {
    super(message, 502, 'N8N_ERROR', true, details);
  }
}

// Database Errors
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', details?: Record<string, unknown>) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

export class ConnectionError extends AppError {
  constructor(message: string = 'Connection error', details?: Record<string, unknown>) {
    super(message, 500, 'CONNECTION_ERROR', true, details);
  }
}

// Business Logic Errors
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', true, details);
  }
}

export class InsufficientQuotaError extends AppError {
  constructor(message: string = 'Insufficient quota', details?: Record<string, unknown>) {
    super(message, 402, 'INSUFFICIENT_QUOTA', true, details);
  }
}

// Utility Functions
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function createErrorFromUnknown(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, 'UNKNOWN_ERROR', false);
  }

  return new AppError('An unknown error occurred', 500, 'UNKNOWN_ERROR', false);
}