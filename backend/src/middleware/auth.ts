import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, User, UserRole } from '../types';
import { JWTUtils } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { ResponseHandler } from '../utils/response';
import supabaseService from '../services/supabase';
import logger from '../utils/logger';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return ResponseHandler.unauthorized(res, 'Access token required') as any;
    }

    const payload = JWTUtils.verifyAccessToken(token);

    // Fetch user from database to ensure they still exist and are active
    const user = await supabaseService.findById<User>('users', payload.userId);

    if (!user) {
      return ResponseHandler.unauthorized(res, 'User not found') as any;
    }

    if (!user.is_active) {
      return ResponseHandler.unauthorized(res, 'Account is deactivated') as any;
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof AuthenticationError) {
      return ResponseHandler.unauthorized(res, error.message) as any;
    }

    return ResponseHandler.error(res, error as Error) as any;
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return ResponseHandler.unauthorized(res, 'Authentication required') as any;
      }

      if (!roles.includes(req.user.role)) {
        return ResponseHandler.forbidden(res, 'Insufficient permissions') as any;
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return ResponseHandler.error(res, error as Error) as any;
    }
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const payload = JWTUtils.verifyAccessToken(token);
        const user = await supabaseService.findById<User>('users', payload.userId);

        if (user && user.is_active) {
          req.user = user;
        }
      } catch (error) {
        // Ignore authentication errors for optional auth
        logger.debug('Optional auth failed:', error);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

// Middleware for widget API authentication
export const authenticateWidget = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;

    if (!apiKey) {
      return ResponseHandler.unauthorized(res, 'Widget API key required') as any;
    }

    const { widgetId, userId } = JWTUtils.verifyWidgetApiKey(apiKey);

    // Verify widget exists and belongs to user
    const widget = await supabaseService.findById('chat_widgets', widgetId);
    if (!widget || (widget as any).user_id !== userId) {
      return ResponseHandler.unauthorized(res, 'Invalid widget API key') as any;
    }

    // Attach widget info to request
    (req as any).widget = widget;
    (req as any).widgetUserId = userId;

    next();
  } catch (error) {
    logger.error('Widget authentication error:', error);

    if (error instanceof AuthenticationError) {
      return ResponseHandler.unauthorized(res, error.message) as any;
    }

    return ResponseHandler.error(res, error as Error) as any;
  }
};

// Middleware to ensure user owns resource
export const ensureOwnership = (resourceIdParam: string = 'id', userIdField: string = 'user_id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return ResponseHandler.unauthorized(res, 'Authentication required') as any;
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return ResponseHandler.badRequest(res, 'Resource ID is required') as any;
      }

      // Skip ownership check for admins
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      // The actual ownership check should be implemented in the controller
      // This middleware just ensures the user is authenticated and passes the check to the controller
      (req as any).requireOwnership = { resourceId, userIdField };

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return ResponseHandler.error(res, error as Error) as any;
    }
  };
};

// Helper function to check ownership in controllers
export const checkOwnership = async (
  tableName: string,
  resourceId: string,
  userId: string,
  userIdField: string = 'user_id'
): Promise<boolean> => {
  try {
    const resource = await supabaseService.findById(tableName, resourceId);
    return resource && (resource as any)[userIdField] === userId;
  } catch (error) {
    logger.error('Ownership verification error:', error);
    return false;
  }
};

// Middleware for admin-only endpoints
export const adminOnly = authorize([UserRole.ADMIN]);

// Middleware for premium users and admins
export const premiumOrAdmin = authorize([UserRole.PREMIUM, UserRole.ADMIN]);

// Rate limiting based on user role
export const getUserRateLimit = (user?: User): { windowMs: number; max: number } => {
  if (!user) {
    return { windowMs: 15 * 60 * 1000, max: 20 }; // Anonymous: 20 requests per 15 minutes
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return { windowMs: 15 * 60 * 1000, max: 1000 }; // Admin: 1000 requests per 15 minutes
    case UserRole.PREMIUM:
      return { windowMs: 15 * 60 * 1000, max: 200 }; // Premium: 200 requests per 15 minutes
    case UserRole.USER:
    default:
      return { windowMs: 15 * 60 * 1000, max: 50 }; // Regular user: 50 requests per 15 minutes
  }
};

// Middleware to check email verification
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required') as any;
    }

    if (!req.user.email_verified) {
      return ResponseHandler.forbidden(res, 'Email verification required') as any;
    }

    next();
  } catch (error) {
    logger.error('Email verification check error:', error);
    return ResponseHandler.error(res, error as Error) as any;
  }
};