import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { appConfig, isDevelopment } from './utils/config';
import { ResponseHandler } from './utils/response';
import { AppError, createErrorFromUnknown } from './utils/errors';
import { generalRateLimit, trackMemoryUsage } from './middleware/rateLimiting';
import { handleUploadErrors } from './middleware/upload';
import logger, { loggerStream } from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import widgetRoutes from './routes/widgets';
import searchRoutes from './routes/search';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeHealthChecks();

    // Start memory tracking
    if (!isDevelopment) {
      trackMemoryUsage();
    }
  }

  private initializeMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', appConfig.security.trustedProxies);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for widget embedding
    }));

    // CORS middleware
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // Allow configured origins
        const allowedOrigins = appConfig.security.corsOrigin.split(',').map(o => o.trim());

        // In development, allow localhost with any port
        if (isDevelopment && origin.includes('localhost')) {
          return callback(null, true);
        }

        // Check if origin is allowed
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Client-Version',
        'X-Widget-ID',
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
      ],
    }));

    // Request logging
    this.app.use(morgan(
      isDevelopment
        ? 'dev'
        : 'combined',
      { stream: loggerStream }
    ));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use('/api', generalRateLimit);

    // Upload error handling
    this.app.use(handleUploadErrors);

    // Request metadata middleware
    this.app.use((req, res, next) => {
      req.requestTime = new Date().toISOString();
      req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add request ID to response headers
      res.set('X-Request-ID', req.requestId);

      next();
    });

    // API version middleware
    this.app.use('/api', (req, res, next) => {
      res.set('X-API-Version', '1.0.0');
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/documents', documentRoutes);
    this.app.use('/api/widgets', widgetRoutes);
    this.app.use('/api/search', searchRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/webhooks', webhookRoutes);
    this.app.use('/api/admin', adminRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      ResponseHandler.success(res, {
        name: 'N8N RAG Backend API',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: appConfig.env,
      }, 'API is running successfully');
    });

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      ResponseHandler.success(res, {
        name: 'N8N RAG Backend API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          documents: '/api/documents',
          widgets: '/api/widgets',
          search: '/api/search',
          analytics: '/api/analytics',
          webhooks: '/api/webhooks',
          admin: '/api/admin',
        },
        documentation: '/api/docs',
        health: '/health',
      });
    });

    // Catch 404 errors
    this.app.use('*', (req, res) => {
      ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
    });
  }

  private initializeHealthChecks(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
          },
          environment: appConfig.env,
          node_version: process.version,
        };

        // Add service health checks
        const services = {
          database: false,
          openai: false,
        };

        try {
          // Check database connection
          const supabaseService = (await import('./services/supabase')).default;
          services.database = await supabaseService.healthCheck();
        } catch (error) {
          logger.error('Database health check failed:', error);
        }

        try {
          // Check OpenAI connection
          const openaiService = (await import('./services/openai')).default;
          services.openai = await openaiService.healthCheck();
        } catch (error) {
          logger.error('OpenAI health check failed:', error);
        }

        const allServicesHealthy = Object.values(services).every(status => status);
        const responseStatus = allServicesHealthy ? 'healthy' : 'degraded';

        ResponseHandler.success(res, {
          ...health,
          status: responseStatus,
          services,
        });

      } catch (error) {
        logger.error('Health check error:', error);
        ResponseHandler.internalServerError(res, 'Health check failed');
      }
    });

    // Readiness probe
    this.app.get('/ready', (req, res) => {
      ResponseHandler.success(res, {
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    });

    // Liveness probe
    this.app.get('/live', (req, res) => {
      ResponseHandler.success(res, {
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Metrics endpoint (basic)
    this.app.get('/metrics', (req, res) => {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      };

      res.set('Content-Type', 'application/json');
      res.json(metrics);
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const appError = createErrorFromUnknown(error);

      // Log error
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: (req as any).requestId,
      });

      // Don't leak error details in production
      if (!isDevelopment && !appError.isOperational) {
        return ResponseHandler.internalServerError(res, 'An internal error occurred');
      }

      return ResponseHandler.error(res, appError);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit the process in production
      if (isDevelopment) {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      // Graceful shutdown
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close server
      const server = this.app.listen();
      server.close(() => {
        logger.info('HTTP server closed.');

        // Close database connections, cleanup resources, etc.
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  public listen(): void {
    this.app.listen(appConfig.port, appConfig.host, () => {
      logger.info(`🚀 Server running on ${appConfig.host}:${appConfig.port}`);
      logger.info(`📝 Environment: ${appConfig.env}`);
      logger.info(`🔗 API Documentation: http://${appConfig.host}:${appConfig.port}/api`);
      logger.info(`❤️ Health Check: http://${appConfig.host}:${appConfig.port}/health`);
    });
  }
}

// Create and export app instance
const app = new App();

// Start server if this file is run directly
if (require.main === module) {
  app.listen();
}

export default app.app;