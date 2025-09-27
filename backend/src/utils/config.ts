import { config } from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables
config();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getEnvVarAsNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
}

function getEnvVarAsBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value ? value.toLowerCase() === 'true' : defaultValue!;
}

export const appConfig: AppConfig = {
  port: getEnvVarAsNumber('PORT', 3001),
  host: getEnvVar('HOST', 'localhost'),
  env: getEnvVar('NODE_ENV', 'development'),

  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRE', '7d'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRE', '30d'),
  },

  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  },

  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVar('OPENAI_MODEL', 'text-embedding-3-small'),
    maxTokens: getEnvVarAsNumber('OPENAI_MAX_TOKENS', 1000),
  },

  upload: {
    maxFileSize: getEnvVarAsNumber('MAX_FILE_SIZE', 10485760), // 10MB
    allowedTypes: getEnvVar('ALLOWED_FILE_TYPES', 'pdf,docx,txt,md').split(','),
    path: getEnvVar('UPLOAD_PATH', 'uploads'),
  },

  rateLimit: {
    windowMs: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  n8n: {
    webhookBaseUrl: getEnvVar('N8N_WEBHOOK_BASE_URL', 'http://localhost:5678/webhook'),
    apiKey: getEnvVar('N8N_API_KEY', ''),
  },

  security: {
    bcryptRounds: getEnvVarAsNumber('BCRYPT_ROUNDS', 12),
    corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
    trustedProxies: getEnvVar('TRUSTED_PROXIES', '127.0.0.1').split(','),
  },
};

export const isDevelopment = appConfig.env === 'development';
export const isProduction = appConfig.env === 'production';
export const isTest = appConfig.env === 'test';