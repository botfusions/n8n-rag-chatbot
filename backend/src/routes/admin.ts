import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import { validate, adminSchemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimiting';
import { ResponseHandler, createPaginationInfo } from '../utils/response';
import supabaseService from '../services/supabase';
import { User, UserRole } from '../types';
import logger from '../utils/logger';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// Get all users
router.get('/users',
  rateLimiters.adminEndpoint,
  validate(adminSchemas.listUsers, 'query'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role, is_active, search } = req.query;

      const options = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      // Build filters
      const filters: Record<string, unknown> = {};
      if (role) filters.role = role;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const users = await supabaseService.findMany<User>('users', {
        filters,
        orderBy: { column: 'created_at', ascending: false },
        limit: options.limit,
        offset: (options.page - 1) * options.limit,
        select: 'id, email, first_name, last_name, role, is_active, email_verified, created_at, last_login',
      });

      const total = await supabaseService.count('users', filters);
      const pagination = createPaginationInfo(options.page, options.limit, total);

      return ResponseHandler.paginated(res, users, pagination);
    } catch (error) {
      logger.error('Admin get users error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Get user statistics
router.get('/statistics',
  rateLimiters.adminEndpoint,
  async (req, res) => {
    try {
      const totalUsers = await supabaseService.count('users');
      const activeUsers = await supabaseService.count('users', { is_active: true });
      const totalDocuments = await supabaseService.count('documents');
      const totalWidgets = await supabaseService.count('chat_widgets');
      const totalConversations = await supabaseService.count('conversations');

      const statistics = {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        content: {
          documents: totalDocuments,
          widgets: totalWidgets,
          conversations: totalConversations,
        },
        system: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version,
        },
      };

      return ResponseHandler.success(res, { statistics }, 'Statistics retrieved successfully');
    } catch (error) {
      logger.error('Admin statistics error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Toggle user status
router.post('/users/:id/toggle-status',
  rateLimiters.adminEndpoint,
  validate(adminSchemas.toggleUserStatus),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active, reason } = req.body;

      const user = await supabaseService.findById<User>('users', id);
      if (!user) {
        return ResponseHandler.notFound(res, 'User');
      }

      const updatedUser = await supabaseService.update<User>('users', id, {
        is_active,
      });

      logger.info('User status toggled by admin', {
        adminId: req.user?.id,
        targetUserId: id,
        newStatus: is_active,
        reason,
      });

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = updatedUser;

      return ResponseHandler.success(res, { user: userWithoutPassword }, 'User status updated successfully');
    } catch (error) {
      logger.error('Admin toggle user status error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Update user role
router.post('/users/:id/role',
  rateLimiters.adminEndpoint,
  validate(adminSchemas.updateUserRole),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await supabaseService.findById<User>('users', id);
      if (!user) {
        return ResponseHandler.notFound(res, 'User');
      }

      const updatedUser = await supabaseService.update<User>('users', id, {
        role: role as UserRole,
      });

      logger.info('User role updated by admin', {
        adminId: req.user?.id,
        targetUserId: id,
        oldRole: user.role,
        newRole: role,
      });

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = updatedUser;

      return ResponseHandler.success(res, { user: userWithoutPassword }, 'User role updated successfully');
    } catch (error) {
      logger.error('Admin update user role error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// Get system logs (basic implementation)
router.get('/logs',
  rateLimiters.adminEndpoint,
  async (req, res) => {
    try {
      const { level = 'info', limit = 100 } = req.query;

      // This is a placeholder - in a real implementation, you'd fetch from your logging system
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System operational',
          meta: {},
        },
      ];

      return ResponseHandler.success(res, { logs }, 'Logs retrieved successfully');
    } catch (error) {
      logger.error('Admin get logs error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

// System health check
router.get('/health',
  rateLimiters.adminEndpoint,
  async (req, res) => {
    try {
      const health = {
        database: await supabaseService.healthCheck(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };

      return ResponseHandler.success(res, { health }, 'System health check completed');
    } catch (error) {
      logger.error('Admin health check error:', error);
      return ResponseHandler.error(res, error as Error);
    }
  }
);

export default router;