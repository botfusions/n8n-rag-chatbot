import { Request } from 'express';

// Base Types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// User & Authentication Types
export interface User extends BaseEntity {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  PREMIUM = 'premium'
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Document Types
export interface Document extends BaseEntity {
  user_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  processing_error?: string;
  chunk_count?: number;
  text_content?: string;
  metadata?: Record<string, unknown>;
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed'
}

export interface DocumentChunk extends BaseEntity {
  document_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

// Chat Widget Types
export interface ChatWidget extends BaseEntity {
  user_id: string;
  name: string;
  description?: string;
  config: WidgetConfig;
  document_ids: string[];
  is_active: boolean;
  embed_code: string;
  n8n_webhook_url?: string;
  analytics: WidgetAnalytics;
}

export interface WidgetConfig {
  title: string;
  subtitle?: string;
  placeholder: string;
  welcome_message?: string;
  theme: WidgetTheme;
  position: WidgetPosition;
  size: WidgetSize;
  branding: WidgetBranding;
  behavior: WidgetBehavior;
}

export interface WidgetTheme {
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  border_radius: number;
  font_family: string;
}

export interface WidgetPosition {
  placement: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  offset_x: number;
  offset_y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  min_width: number;
  min_height: number;
  is_responsive: boolean;
}

export interface WidgetBranding {
  show_logo: boolean;
  logo_url?: string;
  company_name?: string;
  footer_text?: string;
}

export interface WidgetBehavior {
  auto_open: boolean;
  auto_open_delay: number;
  enable_sound: boolean;
  max_history: number;
  idle_timeout: number;
  typing_indicator: boolean;
}

export interface WidgetAnalytics {
  total_conversations: number;
  total_messages: number;
  avg_session_duration: number;
  satisfaction_score: number;
  last_activity?: string;
}

// Chat & Conversation Types
export interface Conversation extends BaseEntity {
  widget_id: string;
  session_id: string;
  visitor_id?: string;
  visitor_info?: VisitorInfo;
  status: ConversationStatus;
  message_count: number;
  duration?: number;
  satisfaction_rating?: number;
  feedback?: string;
  metadata?: Record<string, unknown>;
}

export enum ConversationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export interface VisitorInfo {
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  browser?: string;
  device?: string;
  os?: string;
}

export interface ChatMessage extends BaseEntity {
  conversation_id: string;
  sender_type: MessageSender;
  content: string;
  message_type: MessageType;
  metadata?: MessageMetadata;
  is_internal: boolean;
}

export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  ADMIN = 'admin'
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  QUICK_REPLY = 'quick_reply',
  SYSTEM = 'system'
}

export interface MessageMetadata {
  sources?: DocumentSource[];
  confidence_score?: number;
  processing_time?: number;
  model_used?: string;
  tokens_used?: number;
  n8n_response?: Record<string, unknown>;
}

export interface DocumentSource {
  document_id: string;
  chunk_id: string;
  filename: string;
  similarity_score: number;
  content_preview: string;
}

// Search & Vector Types
export interface SearchRequest {
  query: string;
  widget_id?: string;
  document_ids?: string[];
  limit?: number;
  similarity_threshold?: number;
  include_metadata?: boolean;
}

export interface SearchResult {
  content: string;
  similarity_score: number;
  document: {
    id: string;
    filename: string;
    metadata?: Record<string, unknown>;
  };
  chunk: {
    id: string;
    chunk_index: number;
    metadata?: Record<string, unknown>;
  };
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  token_count: number;
  model: string;
}

// N8N Integration Types
export interface N8NWebhookPayload {
  widget_id: string;
  conversation_id: string;
  message: string;
  visitor_info?: VisitorInfo;
  context?: {
    previous_messages: ChatMessage[];
    search_results: SearchResult[];
    user_metadata?: Record<string, unknown>;
  };
}

export interface N8NResponse {
  message: string;
  actions?: N8NAction[];
  metadata?: Record<string, unknown>;
}

export interface N8NAction {
  type: 'redirect' | 'open_modal' | 'collect_info' | 'transfer_agent';
  payload: Record<string, unknown>;
}

// Analytics Types
export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  widgets: WidgetAnalytics[];
  conversations: ConversationAnalytics;
  documents: DocumentAnalytics;
  performance: PerformanceAnalytics;
}

export interface AnalyticsOverview {
  total_widgets: number;
  total_conversations: number;
  total_messages: number;
  total_documents: number;
  active_conversations: number;
  avg_response_time: number;
  satisfaction_score: number;
}

export interface ConversationAnalytics {
  daily_conversations: DailyMetric[];
  conversation_duration_avg: number;
  completion_rate: number;
  bounce_rate: number;
  top_queries: QueryMetric[];
}

export interface DocumentAnalytics {
  total_uploads: number;
  processing_success_rate: number;
  avg_processing_time: number;
  most_referenced: DocumentReference[];
  file_type_distribution: FileTypeMetric[];
}

export interface PerformanceAnalytics {
  avg_response_time: number;
  error_rate: number;
  uptime: number;
  api_usage: ApiUsageMetric[];
  token_consumption: TokenMetric[];
}

export interface DailyMetric {
  date: string;
  count: number;
}

export interface QueryMetric {
  query: string;
  count: number;
  avg_satisfaction: number;
}

export interface DocumentReference {
  document_id: string;
  filename: string;
  reference_count: number;
}

export interface FileTypeMetric {
  file_type: string;
  count: number;
  percentage: number;
}

export interface ApiUsageMetric {
  endpoint: string;
  request_count: number;
  avg_response_time: number;
  error_count: number;
}

export interface TokenMetric {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  pagination?: PaginationInfo;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Request/Response DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface CreateWidgetRequest {
  name: string;
  description?: string;
  config: WidgetConfig;
  document_ids: string[];
}

export interface UpdateWidgetRequest {
  name?: string;
  description?: string;
  config?: Partial<WidgetConfig>;
  document_ids?: string[];
  is_active?: boolean;
}

export interface UploadDocumentRequest {
  file: Express.Multer.File;
  metadata?: Record<string, unknown>;
}

// Configuration Types
export interface AppConfig {
  port: number;
  host: string;
  env: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    path: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  n8n: {
    webhookBaseUrl: string;
    apiKey: string;
  };
  security: {
    bcryptRounds: number;
    corsOrigin: string;
    trustedProxies: string[];
  };
}

// Utility Types
export type CreateEntity<T> = Omit<T, keyof BaseEntity>;
export type UpdateEntity<T> = Partial<Omit<T, keyof BaseEntity>>;
export type EntityWithoutDates<T> = Omit<T, 'created_at' | 'updated_at'>;