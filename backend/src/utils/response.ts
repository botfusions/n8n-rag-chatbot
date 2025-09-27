import { Response } from 'express';
import { ApiResponse, PaginationInfo } from '../types';
import { AppError } from './errors';
import logger from './logger';

export class ResponseHandler {
  static success<T>(res: Response, data?: T, message?: string, pagination?: PaginationInfo): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      pagination,
    };

    return res.json(response);
  }

  static error(res: Response, error: AppError | Error, statusCode?: number): Response {
    if (error instanceof AppError) {
      logger.warn(`API Error: ${error.code} - ${error.message}`, {
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
      });

      const response: ApiResponse = {
        success: false,
        error: error.toApiError(),
        message: error.message,
      };

      return res.status(error.statusCode).json(response);
    }

    // Handle unknown errors
    const status = statusCode || 500;
    logger.error(`Unexpected error: ${error.message}`, {
      error: error.stack,
      statusCode: status,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      message: 'An internal error occurred',
    };

    return res.status(status).json(response);
  }

  static created<T>(res: Response, data?: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message: message || 'Resource created successfully',
    };

    return res.status(201).json(response);
  }

  static noContent(res: Response, message?: string): Response {
    const response: ApiResponse = {
      success: true,
      message: message || 'Operation completed successfully',
    };

    return res.status(204).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationInfo,
    message?: string
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      message,
      pagination,
    };

    return res.json(response);
  }

  static unauthorized(res: Response, message?: string): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: message || 'Authentication required',
      },
      message: message || 'Authentication required',
    };

    return res.status(401).json(response);
  }

  static forbidden(res: Response, message?: string): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: message || 'Insufficient permissions',
      },
      message: message || 'Insufficient permissions',
    };

    return res.status(403).json(response);
  }

  static notFound(res: Response, resource?: string): Response {
    const message = resource ? `${resource} not found` : 'Resource not found';
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message,
      },
      message,
    };

    return res.status(404).json(response);
  }

  static badRequest(res: Response, message?: string, details?: Record<string, unknown>): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: message || 'Bad request',
        details,
      },
      message: message || 'Bad request',
    };

    return res.status(400).json(response);
  }

  static conflict(res: Response, message?: string): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CONFLICT',
        message: message || 'Resource conflict',
      },
      message: message || 'Resource conflict',
    };

    return res.status(409).json(response);
  }

  static tooManyRequests(res: Response, message?: string): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: message || 'Rate limit exceeded',
      },
      message: message || 'Rate limit exceeded',
    };

    return res.status(429).json(response);
  }

  static internalServerError(res: Response, message?: string): Response {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: message || 'Internal server error',
      },
      message: message || 'Internal server error',
    };

    return res.status(500).json(response);
  }
}

// Utility function to create pagination info
export function createPaginationInfo(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}