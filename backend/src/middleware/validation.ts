import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/response';
import { ValidationError } from '../utils/errors';
import logger from '../utils/logger';

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn('Validation error:', { property, errors: errorDetails });

        return ResponseHandler.badRequest(res, 'Validation failed', { errors: errorDetails }) as any;
      }

      // Replace the request property with the validated and sanitized value
      req[property] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return ResponseHandler.error(res, err as Error) as any;
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // Basic types
  id: Joi.string().uuid().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  optionalPassword: Joi.string().min(8).max(128).optional(),
  name: Joi.string().trim().min(1).max(100).required(),
  optionalName: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(1000).optional(),
  url: Joi.string().uri().optional(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Search
  search: Joi.object({
    query: Joi.string().trim().min(1).max(500).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    similarity_threshold: Joi.number().min(0).max(1).default(0.7),
  }),
};

// Authentication schemas
export const authSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    first_name: commonSchemas.name,
    last_name: commonSchemas.name,
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),

  resetPassword: Joi.object({
    email: commonSchemas.email,
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: commonSchemas.password,
  }),

  refreshToken: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

// Document schemas
export const documentSchemas = {
  upload: Joi.object({
    metadata: Joi.object().optional(),
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('uploaded', 'processing', 'processed', 'failed').optional(),
    search: Joi.string().trim().min(1).max(200).optional(),
  }),

  process: Joi.object({
    force: Joi.boolean().default(false),
  }),
};

// Widget schemas
export const widgetSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    description: commonSchemas.description,
    config: Joi.object({
      title: Joi.string().trim().min(1).max(100).required(),
      subtitle: Joi.string().trim().max(200).optional(),
      placeholder: Joi.string().trim().min(1).max(200).required(),
      welcome_message: Joi.string().trim().max(500).optional(),
      theme: Joi.object({
        primary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
        secondary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
        text_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
        background_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
        border_radius: Joi.number().integer().min(0).max(50).default(8),
        font_family: Joi.string().trim().max(50).default('Inter'),
      }).required(),
      position: Joi.object({
        placement: Joi.string().valid('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center').default('bottom-right'),
        offset_x: Joi.number().integer().min(-100).max(100).default(20),
        offset_y: Joi.number().integer().min(-100).max(100).default(20),
      }).required(),
      size: Joi.object({
        width: Joi.number().integer().min(300).max(800).default(400),
        height: Joi.number().integer().min(400).max(800).default(600),
        min_width: Joi.number().integer().min(250).max(400).default(300),
        min_height: Joi.number().integer().min(300).max(500).default(400),
        is_responsive: Joi.boolean().default(true),
      }).required(),
      branding: Joi.object({
        show_logo: Joi.boolean().default(true),
        logo_url: commonSchemas.url,
        company_name: Joi.string().trim().max(100).optional(),
        footer_text: Joi.string().trim().max(200).optional(),
      }).required(),
      behavior: Joi.object({
        auto_open: Joi.boolean().default(false),
        auto_open_delay: Joi.number().integer().min(0).max(60000).default(3000),
        enable_sound: Joi.boolean().default(true),
        max_history: Joi.number().integer().min(10).max(1000).default(100),
        idle_timeout: Joi.number().integer().min(300).max(3600).default(1800),
        typing_indicator: Joi.boolean().default(true),
      }).required(),
    }).required(),
    document_ids: Joi.array().items(commonSchemas.id).min(1).required(),
  }),

  update: Joi.object({
    name: commonSchemas.optionalName,
    description: commonSchemas.description,
    config: Joi.object({
      title: Joi.string().trim().min(1).max(100).optional(),
      subtitle: Joi.string().trim().max(200).optional(),
      placeholder: Joi.string().trim().min(1).max(200).optional(),
      welcome_message: Joi.string().trim().max(500).optional(),
      theme: Joi.object({
        primary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
        text_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
        background_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
        border_radius: Joi.number().integer().min(0).max(50).optional(),
        font_family: Joi.string().trim().max(50).optional(),
      }).optional(),
      position: Joi.object({
        placement: Joi.string().valid('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center').optional(),
        offset_x: Joi.number().integer().min(-100).max(100).optional(),
        offset_y: Joi.number().integer().min(-100).max(100).optional(),
      }).optional(),
      size: Joi.object({
        width: Joi.number().integer().min(300).max(800).optional(),
        height: Joi.number().integer().min(400).max(800).optional(),
        min_width: Joi.number().integer().min(250).max(400).optional(),
        min_height: Joi.number().integer().min(300).max(500).optional(),
        is_responsive: Joi.boolean().optional(),
      }).optional(),
      branding: Joi.object({
        show_logo: Joi.boolean().optional(),
        logo_url: commonSchemas.url,
        company_name: Joi.string().trim().max(100).optional(),
        footer_text: Joi.string().trim().max(200).optional(),
      }).optional(),
      behavior: Joi.object({
        auto_open: Joi.boolean().optional(),
        auto_open_delay: Joi.number().integer().min(0).max(60000).optional(),
        enable_sound: Joi.boolean().optional(),
        max_history: Joi.number().integer().min(10).max(1000).optional(),
        idle_timeout: Joi.number().integer().min(300).max(3600).optional(),
        typing_indicator: Joi.boolean().optional(),
      }).optional(),
    }).optional(),
    document_ids: Joi.array().items(commonSchemas.id).min(1).optional(),
    is_active: Joi.boolean().optional(),
  }).min(1),

  list: commonSchemas.pagination,
};

// Search schemas
export const searchSchemas = {
  documents: Joi.object({
    query: Joi.string().trim().min(1).max(500).required(),
    widget_id: commonSchemas.id.optional(),
    document_ids: Joi.array().items(commonSchemas.id).optional(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    similarity_threshold: Joi.number().min(0).max(1).default(0.7),
    include_metadata: Joi.boolean().default(true),
  }),

  embeddings: Joi.object({
    text: Joi.string().trim().min(1).max(8000).required(),
    model: Joi.string().valid('text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002').optional(),
  }),

  suggestions: Joi.object({
    query: Joi.string().trim().min(1).max(500).required(),
    widget_id: commonSchemas.id.optional(),
    limit: Joi.number().integer().min(1).max(10).default(5),
  }),
};

// Chat schemas
export const chatSchemas = {
  message: Joi.object({
    message: Joi.string().trim().min(1).max(2000).required(),
    session_id: Joi.string().trim().min(1).max(100).required(),
    visitor_info: Joi.object({
      ip_address: Joi.string().ip().optional(),
      user_agent: Joi.string().trim().max(500).optional(),
      referrer: commonSchemas.url,
      location: Joi.object({
        country: Joi.string().length(2).optional(),
        city: Joi.string().trim().max(100).optional(),
        region: Joi.string().trim().max(100).optional(),
      }).optional(),
      browser: Joi.string().trim().max(50).optional(),
      device: Joi.string().trim().max(50).optional(),
      os: Joi.string().trim().max(50).optional(),
    }).optional(),
  }),

  endConversation: Joi.object({
    satisfaction_rating: Joi.number().integer().min(1).max(5).optional(),
    feedback: Joi.string().trim().max(1000).optional(),
  }),

  listConversations: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('active', 'completed', 'abandoned').optional(),
  }),
};

// Analytics schemas
export const analyticsSchemas = {
  dashboard: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    widget_id: commonSchemas.id.optional(),
  }),

  widget: Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    metric: Joi.string().valid('conversations', 'messages', 'satisfaction', 'response_time').optional(),
  }),
};

// Admin schemas
export const adminSchemas = {
  listUsers: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().valid('admin', 'user', 'premium').optional(),
    is_active: Joi.boolean().optional(),
    search: Joi.string().trim().min(1).max(200).optional(),
  }),

  toggleUserStatus: Joi.object({
    is_active: Joi.boolean().required(),
    reason: Joi.string().trim().max(500).optional(),
  }),

  updateUserRole: Joi.object({
    role: Joi.string().valid('admin', 'user', 'premium').required(),
  }),
};

// Webhook schemas
export const webhookSchemas = {
  n8n: Joi.object({
    widget_id: commonSchemas.id.required(),
    conversation_id: commonSchemas.id.required(),
    message: Joi.string().trim().min(1).max(2000).required(),
    visitor_info: Joi.object().optional(),
    context: Joi.object({
      previous_messages: Joi.array().items(Joi.object()).optional(),
      search_results: Joi.array().items(Joi.object()).optional(),
      user_metadata: Joi.object().optional(),
    }).optional(),
  }),
};

// File validation middleware
export const validateFile = (
  allowedTypes: string[],
  maxSize: number,
  required: boolean = true
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.file && required) {
        return ResponseHandler.badRequest(res, 'File is required') as any;
      }

      if (req.file) {
        // Check file size
        if (req.file.size > maxSize) {
          return ResponseHandler.badRequest(res, `File size exceeds maximum allowed size of ${maxSize} bytes`) as any;
        }

        // Check file type
        const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
        if (!fileExtension || !allowedTypes.includes(fileExtension)) {
          return ResponseHandler.badRequest(res, `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`) as any;
        }

        // Check if file has content
        if (req.file.size === 0) {
          return ResponseHandler.badRequest(res, 'File is empty') as any;
        }
      }

      next();
    } catch (error) {
      logger.error('File validation error:', error);
      return ResponseHandler.error(res, error as Error) as any;
    }
  };
};

// Custom validation functions
export const customValidations = {
  // Validate widget ownership
  validateWidgetOwnership: async (widgetId: string, userId: string): Promise<boolean> => {
    try {
      // This would typically check the database
      // Implementation depends on your service layer
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  },

  // Validate document ownership
  validateDocumentOwnership: async (documentId: string, userId: string): Promise<boolean> => {
    try {
      // This would typically check the database
      // Implementation depends on your service layer
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  },

  // Validate date range
  validateDateRange: (startDate: Date, endDate: Date): boolean => {
    const now = new Date();
    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    // End date cannot be in the future
    if (endDate > now) {
      return false;
    }

    // Start date cannot be after end date
    if (startDate > endDate) {
      return false;
    }

    // Range cannot exceed 90 days
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      return false;
    }

    return true;
  },
};