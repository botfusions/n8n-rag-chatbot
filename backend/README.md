# N8N RAG Backend API

A production-ready Express.js backend for the N8N RAG Chat Dashboard with TypeScript, Supabase, and OpenAI integration.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Document Processing**: Upload, extract text, chunk, and generate embeddings for PDF, DOCX, TXT, MD files
- **Vector Search**: Semantic search using OpenAI embeddings and Supabase vector storage
- **Chat System**: Real-time chat with RAG (Retrieval-Augmented Generation) capabilities
- **Widget Management**: Create and manage embeddable chat widgets
- **N8N Integration**: Webhook endpoints for workflow automation
- **Analytics**: Comprehensive usage analytics and reporting
- **Rate Limiting**: Configurable rate limiting with role-based rules
- **File Upload**: Secure file upload with validation and processing
- **Error Handling**: Comprehensive error handling and logging
- **Security**: CORS, Helmet, input validation, and security best practices

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Supabase account and project
- OpenAI API key

## 🛠️ Installation

1. **Clone and navigate to backend directory**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Environment setup**:
```bash
cp .env.example .env
```

4. **Configure environment variables** in `.env`:
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=text-embedding-3-small

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,docx,txt,md

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Build the project**:
```bash
npm run build
```

## 🗄️ Database Setup

### Supabase Tables

Create the following tables in your Supabase project:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'premium')),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  processing_error TEXT,
  chunk_count INTEGER,
  text_content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks table with vector embeddings
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat widgets table
CREATE TABLE chat_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  document_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  embed_code TEXT,
  n8n_webhook_url VARCHAR(500),
  analytics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID REFERENCES chat_widgets(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  visitor_id VARCHAR(255),
  visitor_info JSONB,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  message_count INTEGER DEFAULT 0,
  duration INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  feedback TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'bot', 'admin')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'quick_reply', 'system')),
  metadata JSONB,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chat_widgets_user_id ON chat_widgets(user_id);
CREATE INDEX idx_conversations_widget_id ON conversations(widget_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);

-- Vector similarity search function (requires pgvector extension)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > similarity_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Enable pgvector Extension

```sql
-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Document Endpoints

#### POST `/api/documents/upload`
Upload a document for processing.

**Request:**
- Multipart form data with `file` field
- Supported formats: PDF, DOCX, TXT, MD
- Max size: 10MB

#### GET `/api/documents`
Get user's documents with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (uploaded, processing, processed, failed)
- `search`: Search in document names and content

#### POST `/api/documents/:id/process`
Process an uploaded document (extract text, generate chunks, create embeddings).

### Search Endpoints

#### POST `/api/search/documents`
Perform vector search across documents.

**Request Body:**
```json
{
  "query": "search query",
  "widget_id": "uuid", // optional
  "document_ids": ["uuid1", "uuid2"], // optional
  "limit": 10,
  "similarity_threshold": 0.7
}
```

#### POST `/api/search/embeddings/generate`
Generate embeddings for text.

**Request Body:**
```json
{
  "text": "text to embed",
  "model": "text-embedding-3-small" // optional
}
```

### Widget Endpoints

#### POST `/api/widgets`
Create a new chat widget.

#### GET `/api/widgets`
Get user's chat widgets.

#### GET `/api/widgets/:id/embed-code`
Get embed code for a widget.

### Webhook Endpoints

#### POST `/api/webhooks/chat/:widgetId`
Handle chat messages from embedded widgets.

**Request Body:**
```json
{
  "message": "User message",
  "session_id": "session123",
  "visitor_info": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "referrer": "https://example.com"
  }
}
```

#### POST `/api/webhooks/n8n/:widgetId`
N8N webhook integration endpoint.

### Analytics Endpoints

#### GET `/api/analytics/dashboard`
Get dashboard analytics.

#### GET `/api/analytics/widget/:id`
Get widget-specific analytics.

### Admin Endpoints

#### GET `/api/admin/users`
Get all users (admin only).

#### POST `/api/admin/users/:id/toggle-status`
Enable/disable user account (admin only).

#### GET `/api/admin/statistics`
Get system statistics (admin only).

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Admin, Premium, and User roles
- **Rate Limiting**: Configurable limits based on user role
- **Input Validation**: Comprehensive validation using Joi
- **File Upload Security**: File type and size validation
- **CORS Protection**: Configurable CORS policy
- **Helmet Security**: Security headers protection
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Password Hashing**: bcrypt with configurable rounds

## 📊 Rate Limiting

Rate limits are applied based on user roles:

- **Anonymous**: 20 requests per 15 minutes
- **User**: 50 requests per 15 minutes
- **Premium**: 200 requests per 15 minutes
- **Admin**: 1000 requests per 15 minutes

Special limits for specific operations:
- **Authentication**: 5 attempts per 15 minutes
- **File Upload**: 20 uploads per hour
- **Chat Messages**: 30 messages per minute
- **Password Reset**: 3 attempts per hour

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── controllers/        # Route handlers
│   │   ├── auth.ts
│   │   └── documents.ts
│   ├── middleware/         # Custom middleware
│   │   ├── auth.ts
│   │   ├── rateLimiting.ts
│   │   ├── upload.ts
│   │   └── validation.ts
│   ├── routes/            # API routes
│   │   ├── auth.ts
│   │   ├── documents.ts
│   │   ├── widgets.ts
│   │   ├── search.ts
│   │   ├── analytics.ts
│   │   ├── webhooks.ts
│   │   └── admin.ts
│   ├── services/          # Business logic
│   │   ├── supabase.ts
│   │   ├── openai.ts
│   │   ├── document.ts
│   │   ├── vector.ts
│   │   └── chat.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   ├── utils/             # Utilities
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── response.ts
│   │   ├── jwt.ts
│   │   └── crypto.ts
│   └── app.ts             # Express app setup
├── logs/                  # Log files
├── uploads/               # Uploaded files
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── README.md
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Docker

```bash
# Build Docker image
docker build -t n8n-rag-backend .

# Run container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  -e JWT_SECRET=your-secret \
  n8n-rag-backend
```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=your-production-secret
SUPABASE_URL=your-production-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-production-key
OPENAI_API_KEY=your-production-openai-key
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📈 Monitoring & Health Checks

### Health Check Endpoints

- **GET `/health`**: Comprehensive health check
- **GET `/ready`**: Readiness probe
- **GET `/live`**: Liveness probe
- **GET `/metrics`**: Basic metrics

### Logging

Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (error logs only)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.