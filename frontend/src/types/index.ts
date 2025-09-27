import { Database } from './database'

// Extract types from database schema
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Chatbot = Database['public']['Tables']['chatbots']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']

export type UserRole = Database['public']['Enums']['user_role']
export type MessageRole = Database['public']['Enums']['message_role']

// Auth types
export interface User {
  id: string
  email: string
  profile?: Profile
}

// Chatbot types
export interface ChatbotConfiguration {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  welcomeMessage: string
  fallbackMessage: string
  enabledFeatures: string[]
}

export interface WidgetSettings {
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size: 'small' | 'medium' | 'large'
  showBranding: boolean
  allowFileUpload: boolean
  placeholder: string
  title: string
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

export interface ResetPasswordForm {
  email: string
}

export interface UpdatePasswordForm {
  password: string
  confirmPassword: string
}

// Chat types
export interface ChatMessage {
  id: string
  content: string
  role: MessageRole
  timestamp: Date
  metadata?: {
    sources?: string[]
    confidence?: number
    [key: string]: any
  }
}

export interface ChatSession {
  id: string
  title?: string
  messages: ChatMessage[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormState {
  isLoading: boolean
  errors: ValidationError[]
  success?: boolean
  message?: string
}

// Dashboard types
export interface DashboardStats {
  totalChatbots: number
  totalConversations: number
  totalMessages: number
  activeUsers: number
  responseRate: number
  avgResponseTime: number
}

// Settings types
export interface UserSettings {
  language: 'tr' | 'en'
  notifications: {
    email: boolean
    browser: boolean
    newMessages: boolean
    weeklyReport: boolean
  }
  theme: 'light' | 'dark' | 'system'
}

// File upload types
export interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

// Navigation types
export interface NavigationItem {
  label: string
  href: string
  icon?: string
  active?: boolean
  children?: NavigationItem[]
}