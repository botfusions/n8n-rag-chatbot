# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this N8N RAG Chatbot project.

## Language Requirements
**IMPORTANT**: All responses must be in Turkish (Türkçe). Claude must communicate in Turkish for all interactions in this project.

## Repository Overview

This is an N8N RAG (Retrieval Augmented Generation) Chatbot project with comprehensive chat and document processing workflows. The project includes:

- **N8N Workflows**: RAG Chat Main, RAG Chat Supabase Simple, RAG Document Processing
- **Frontend**: Next.js 14 admin dashboard with chat widget management
- **Backend**: Express.js API with Supabase integration
- **Documentation**: Comprehensive setup and testing guides
- **Tests**: Automated testing framework for N8N workflows

## Key Project Commands

### Frontend (Next.js 14)
```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build production
npm run build
npm start
```

### Backend (Express.js)
```bash
# Install dependencies
cd backend
npm install

# Run development server
npm run dev

# Build and run production
npm run build
npm start
```

### N8N Workflows
```bash
# Test workflows
cd tests
node n8n-workflow-tests.js

# Open test dashboard
open tests/n8n-test-dashboard.html
```

## Architecture and Technology Stack

### Core Technologies
- **Next.js 14**: Frontend with App Router, TypeScript, Tailwind CSS
- **Express.js**: Backend API with TypeScript
- **Supabase**: PostgreSQL database with pgvector for vector search
- **N8N**: Workflow automation platform
- **OpenAI API**: Embeddings and chat completion
- **React**: UI components with shadcn/ui

### N8N Integration
- **RAG Chat Main Workflow**: Main chat system with full RAG functionality
- **RAG Chat Supabase Simple**: Simplified version without backend API dependency
- **RAG Document Processing**: Document upload, chunking, and embedding

### External Integrations
- **OpenAI API**: GPT models and text embeddings
- **Supabase**: Real-time database, authentication, vector search
- **N8N Webhooks**: Workflow triggers and data processing

## Development Patterns

### Project Structure
```
n8n_rag_chatbot/
├── README.md                    # Project documentation
├── TODO.md                     # Task tracking
├── frontend/                   # Next.js 14 admin dashboard
│   ├── src/app/               # App Router pages
│   ├── src/components/        # React components
│   └── src/lib/              # Utilities and configurations
├── backend/                   # Express.js API
│   ├── src/routes/           # API endpoints
│   ├── src/middleware/       # Auth and validation
│   └── src/utils/           # Helper functions
├── docs/                     # Documentation
│   ├── database-schema.sql   # Supabase schema
│   ├── n8n-workflows/       # N8N workflow JSON files
│   └── *.md                 # Setup and integration guides
└── tests/                   # Testing framework
    ├── n8n-workflow-tests.js # Automated tests
    └── n8n-test-dashboard.html # Interactive test UI
```

### N8N Workflow Development
- Use chatTrigger node for hosted chat functionality
- Implement proper error handling and validation
- Support Turkish/English multi-language responses
- Include comprehensive metadata parsing
- Use Supabase RPC for vector search operations

### API Design Principles
- RESTful endpoints with proper HTTP status codes
- Comprehensive error handling and logging
- JWT authentication with Supabase
- Multi-tenant architecture with Row Level Security (RLS)
- Real-time updates with Supabase subscriptions

## Important Environment Variables

### N8N Workflows
```env
# Required for all workflows
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional (for backend API integration)
BACKEND_URL=https://your-backend-api.com
BACKEND_API_KEY=your-secret-backend-api-key
```

### Frontend
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-jwt-secret
```

## N8N API Configuration

### N8N Instance Details
- **Instance Type**: Self-hosted or cloud
- **Version**: Latest stable
- **Required Community Packages**: n8n-nodes-langchain

### N8N API Access
```bash
# Check N8N API health
curl https://your-n8n-instance.com/api/v1/workflows

# List workflows
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     https://your-n8n-instance.com/api/v1/workflows
```

### Webhook URLs Format
- **Chat Webhook**: `https://your-n8n.com/webhook/chat/{widgetId}`
- **Document Processing**: `https://your-n8n.com/webhook/document-processing`

## Turkish RAG System Context

### Language Support
- **Primary**: Turkish (tr)
- **Secondary**: English (en)
- **Fallback**: Turkish for all unsupported languages

### Chat System Features
- Multi-tenant widget system
- Real-time chat with RAG context
- Document-based knowledge retrieval
- Customizable chatbot personality
- Admin dashboard for management

### Document Processing
- **Supported Formats**: PDF, DOCX, TXT
- **Chunking Strategy**: 1000 characters with 200 character overlap
- **Embedding Model**: OpenAI text-embedding-ada-002
- **Vector Search**: Supabase pgvector with similarity threshold 0.7

## Security Considerations

- **API Keys**: Never commit API keys to version control
- **Authentication**: JWT-based with Supabase Auth
- **RLS Policies**: Row Level Security for multi-tenant data isolation
- **Input Validation**: Comprehensive validation on all user inputs
- **Rate Limiting**: Implement rate limiting on all public endpoints

## Testing Framework

### Automated Tests
```bash
# Run all N8N workflow tests
node tests/n8n-workflow-tests.js

# Run specific test
N8NWorkflowTests.testBasicChatGreeting()
```

### Interactive Testing
- Open `tests/n8n-test-dashboard.html` in browser
- Configure N8N instance URL
- Run comprehensive test suites
- Monitor performance metrics

## Development Workflow

1. **Environment Setup**: Configure N8N, Supabase, and OpenAI credentials
2. **Database Setup**: Run schema migrations in Supabase
3. **N8N Import**: Import RAG workflows using provided JSON files
4. **Testing**: Validate workflows with test framework
5. **Frontend Setup**: Configure Next.js dashboard
6. **Integration**: Connect all components and test end-to-end

## Production Deployment

### N8N Workflows
- Use production OpenAI API keys
- Configure proper error notifications
- Set up monitoring and logging
- Implement backup strategies

### Frontend/Backend
- Deploy to cloud platforms (Vercel, Railway, etc.)
- Configure CI/CD pipelines
- Set up monitoring and analytics
- Implement proper logging

When working with this project, prioritize:
1. **Security**: Proper authentication and data protection
2. **Performance**: Optimized vector search and caching
3. **Reliability**: Comprehensive error handling
4. **Usability**: Intuitive admin interface and clear documentation

## API Endpoints Reference

### Backend API
- `POST /api/auth/login` - User authentication
- `GET /api/widgets` - List chat widgets
- `POST /api/widgets` - Create new widget
- `POST /api/documents/upload` - Document upload
- `GET /api/analytics` - Dashboard analytics

### N8N Webhooks
- `POST /webhook/chat/{widgetId}` - Chat processing
- `POST /webhook/document-processing` - Document processing

## Common Commands

```bash
# Start development environment
npm run dev:all

# Run tests
npm run test

# Build for production
npm run build:all

# Deploy workflows
npm run deploy:workflows
```