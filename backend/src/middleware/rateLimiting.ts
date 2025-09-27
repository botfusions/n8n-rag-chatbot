import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { appConfig } from '../utils/config';
import { AuthenticatedRequest, UserRole } from '../types';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';

// Default rate limit configuration
const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.id || req.ip;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: (req as AuthenticatedRequest).user?.id,
        path: req.path,
        method: req.method,
      });

      return ResponseHandler.tooManyRequests(res, 'Rate limit exceeded. Please try again later.') as any;
    },
    skip: (req: Request) => {
      // Skip rate limiting for admin users
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.role === UserRole.ADMIN;
    },
  });
};

// General API rate limiter
export const generalRateLimit = createRateLimit(
  appConfig.rateLimit.windowMs, // 15 minutes
  appConfig.rateLimit.maxRequests, // 100 requests per windowMs
  'Too many API requests'
);

// Strict rate limiter for sensitive operations
export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests per 15 minutes
  'Too many requests for this operation'
);

// Auth rate limiter (login, register, etc.)
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  'Too many authentication attempts'
);

// File upload rate limiter
export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // 20 uploads per hour
  'Too many file uploads'
);

// Chat rate limiter
export const chatRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 messages per minute
  'Too many chat messages'
);

// Search rate limiter
export const searchRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  20, // 20 searches per minute
  'Too many search requests'
);

// Password reset rate limiter
export const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 password reset attempts per hour
  'Too many password reset attempts'
);

// Dynamic rate limiter based on user role
export const dynamicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    if (!user) {
      return 20; // Anonymous users: 20 requests per 15 minutes
    }

    switch (user.role) {
      case UserRole.ADMIN:
        return 1000; // Admin: 1000 requests per 15 minutes
      case UserRole.PREMIUM:
        return 200; // Premium: 200 requests per 15 minutes
      case UserRole.USER:
      default:
        return 50; // Regular user: 50 requests per 15 minutes
    }
  },
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.id || req.ip;
  },
  handler: (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn('Dynamic rate limit exceeded', {
      ip: req.ip,
      userId: authReq.user?.id,
      userRole: authReq.user?.role,
      path: req.path,
      method: req.method,
    });

    return ResponseHandler.tooManyRequests(res, 'Rate limit exceeded based on your user level') as any;
  },
  skip: (req: Request) => {
    // Never skip dynamic rate limiting
    return false;
  },
});

// Widget-specific rate limiter
export const widgetRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requests per 5 minutes per widget
  keyGenerator: (req: Request) => {
    // Rate limit by widget ID
    return req.params.widgetId || req.body.widget_id || req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Widget rate limit exceeded', {
      ip: req.ip,
      widgetId: req.params.widgetId || req.body.widget_id,
      path: req.path,
    });

    return ResponseHandler.tooManyRequests(res, 'Too many requests for this widget') as any;
  },
});

// API key rate limiter for external integrations
export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req: Request) => {
    // Rate limit by API key
    return req.headers['x-api-key'] as string || req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('API key rate limit exceeded', {
      ip: req.ip,
      apiKey: req.headers['x-api-key'],
      path: req.path,
    });

    return ResponseHandler.tooManyRequests(res, 'API rate limit exceeded') as any;
  },
});

// Burst protection - very short window with low limit
export const burstProtection = createRateLimit(
  10 * 1000, // 10 seconds
  5, // 5 requests per 10 seconds
  'Please slow down your requests'
);

// Create custom rate limiter with specific options
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Rate limit exceeded',
    keyGenerator: options.keyGenerator || ((req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.id || req.ip;
    }),
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        userId: (req as AuthenticatedRequest).user?.id,
        path: req.path,
        method: req.method,
        options,
      });

      return ResponseHandler.tooManyRequests(res, options.message || 'Rate limit exceeded') as any;
    },
    skip: options.skip || (() => false),
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limit for specific user actions
export const userActionRateLimit = (action: string, max: number, windowMs: number = 60 * 1000) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return `${authReq.user?.id || req.ip}:${action}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn(`${action} rate limit exceeded`, {
        ip: req.ip,
        userId: (req as AuthenticatedRequest).user?.id,
        action,
      });

      return ResponseHandler.tooManyRequests(res, `Too many ${action} requests`) as any;
    },
  });
};

// Memory usage tracking
export const trackMemoryUsage = () => {
  setInterval(() => {
    const usage = process.memoryUsage();
    if (usage.heapUsed > 512 * 1024 * 1024) { // 512MB
      logger.warn('High memory usage detected', {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB',
      });
    }
  }, 30000); // Check every 30 seconds
};

// Export rate limit middleware combinations
export const rateLimiters = {
  general: generalRateLimit,
  strict: strictRateLimit,
  auth: authRateLimit,
  upload: uploadRateLimit,
  chat: chatRateLimit,
  search: searchRateLimit,
  passwordReset: passwordResetRateLimit,
  dynamic: dynamicRateLimit,
  widget: widgetRateLimit,
  apiKey: apiKeyRateLimit,
  burst: burstProtection,

  // Combined limiters for specific endpoints
  authEndpoint: [burstProtection, authRateLimit],
  uploadEndpoint: [burstProtection, uploadRateLimit],
  chatEndpoint: [widgetRateLimit, chatRateLimit],
  searchEndpoint: [dynamicRateLimit, searchRateLimit],
  adminEndpoint: [strictRateLimit],
};