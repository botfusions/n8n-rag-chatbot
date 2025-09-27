-- ===========================================
-- N8N RAG Chat Dashboard - Database Schema
-- ===========================================
-- Supabase PostgreSQL + pgvector extension
-- RLS (Row Level Security) enabled
-- Multi-tenant architecture

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===========================================
-- CUSTOMERS TABLE
-- ===========================================
CREATE TABLE customers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT,
    full_name TEXT,
    phone TEXT,
    language TEXT DEFAULT 'tr' CHECK (language IN ('tr', 'en')),
    timezone TEXT DEFAULT 'Europe/Istanbul',
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'premium', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
    usage_quota JSONB DEFAULT '{"documents": 10, "widgets": 3, "monthly_messages": 1000}',
    usage_current JSONB DEFAULT '{"documents": 0, "widgets": 0, "monthly_messages": 0}',
    settings JSONB DEFAULT '{"notifications": true, "analytics": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- CHAT WIDGETS TABLE
-- ===========================================
CREATE TABLE chat_widgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    webhook_url TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{
        "theme": {
            "primaryColor": "#6366f1",
            "backgroundColor": "#ffffff",
            "textColor": "#1f2937",
            "borderRadius": "8px"
        },
        "behavior": {
            "welcomeMessage": "Merhaba! Size nasıl yardımcı olabilirim?",
            "allowFileUploads": true,
            "allowVoiceInput": false,
            "enableStreaming": true,
            "maxFileSize": "10MB",
            "allowedFileTypes": "image/*,application/pdf,text/*"
        },
        "features": {
            "showWelcomeScreen": true,
            "showFollowUpPrompts": true,
            "showTypingIndicator": true,
            "enableAnalytics": true
        },
        "customization": {
            "companyLogo": null,
            "customCSS": null,
            "footerText": "Powered by OSİDİEN"
        }
    }',
    domain_whitelist TEXT[], -- Allowed domains for embedding
    rate_limit_config JSONB DEFAULT '{"messagesPerMinute": 10, "messagesPerHour": 100}',
    analytics_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- DOCUMENTS TABLE
-- ===========================================
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES chat_widgets(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT, -- Supabase Storage URL
    chunk_count INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ===========================================
-- DOCUMENT CHUNKS TABLE (Vector Storage)
-- ===========================================
CREATE TABLE document_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES chat_widgets(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_length INTEGER,
    embedding vector(1536), -- OpenAI embedding size
    metadata JSONB DEFAULT '{}', -- Page number, section, etc.
    tokens_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CHAT SESSIONS TABLE
-- ===========================================
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES chat_widgets(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    visitor_id TEXT, -- Anonymous visitor identifier
    visitor_metadata JSONB DEFAULT '{}', -- IP, user agent, etc.
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT
);

-- ===========================================
-- CHAT MESSAGES TABLE
-- ===========================================
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES chat_widgets(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Files, voice input, etc.
    response_time_ms INTEGER, -- For assistant messages
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ANALYTICS TABLE
-- ===========================================
CREATE TABLE analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES chat_widgets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}', -- Flexible metrics storage
    -- Common metrics:
    -- {"sessions": 45, "messages": 123, "avg_response_time": 1200, "satisfaction": 4.2}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, widget_id, date)
);

-- ===========================================
-- ADMIN USERS TABLE
-- ===========================================
CREATE TABLE admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id)
);

-- ===========================================
-- SYSTEM SETTINGS TABLE
-- ===========================================
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES admin_users(id)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Vector search index (most important)
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Customer-related indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_subscription ON customers(subscription_plan, subscription_status);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Widget-related indexes
CREATE INDEX idx_chat_widgets_customer_id ON chat_widgets(customer_id);
CREATE INDEX idx_chat_widgets_active ON chat_widgets(customer_id, is_active);

-- Document-related indexes
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_widget_id ON documents(widget_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Document chunks indexes
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_customer_id ON document_chunks(customer_id);
CREATE INDEX idx_document_chunks_widget_id ON document_chunks(widget_id);

-- Chat session indexes
CREATE INDEX idx_chat_sessions_customer_id ON chat_sessions(customer_id);
CREATE INDEX idx_chat_sessions_widget_id ON chat_sessions(widget_id);
CREATE INDEX idx_chat_sessions_session_key ON chat_sessions(session_key);
CREATE INDEX idx_chat_sessions_started_at ON chat_sessions(started_at);

-- Chat messages indexes
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_customer_id ON chat_messages(customer_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Analytics indexes
CREATE INDEX idx_analytics_customer_id ON analytics(customer_id);
CREATE INDEX idx_analytics_widget_id ON analytics(widget_id);
CREATE INDEX idx_analytics_date ON analytics(date);

-- ===========================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Customers can only see their own data
CREATE POLICY "Customers can view own data" ON customers
    FOR ALL USING (auth.uid() = id);

-- Chat widgets - customers can only access their own widgets
CREATE POLICY "Customers can manage own widgets" ON chat_widgets
    FOR ALL USING (customer_id = auth.uid());

-- Documents - customers can only access their own documents
CREATE POLICY "Customers can manage own documents" ON documents
    FOR ALL USING (customer_id = auth.uid());

-- Document chunks - customers can only access their own chunks
CREATE POLICY "Customers can access own document chunks" ON document_chunks
    FOR ALL USING (customer_id = auth.uid());

-- Chat sessions - customers can access their own sessions
CREATE POLICY "Customers can view own chat sessions" ON chat_sessions
    FOR ALL USING (customer_id = auth.uid());

-- Chat messages - customers can view their own messages
CREATE POLICY "Customers can view own chat messages" ON chat_messages
    FOR ALL USING (customer_id = auth.uid());

-- Analytics - customers can view their own analytics
CREATE POLICY "Customers can view own analytics" ON analytics
    FOR ALL USING (customer_id = auth.uid());

-- ===========================================
-- VECTOR SEARCH FUNCTION
-- ===========================================
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(1536),
    filter_customer_id UUID,
    filter_widget_id UUID DEFAULT NULL,
    match_count INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    document_filename TEXT,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id as chunk_id,
        dc.document_id,
        dc.content,
        d.filename as document_filename,
        1 - (dc.embedding <=> query_embedding) as similarity,
        dc.metadata
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE
        dc.customer_id = filter_customer_id
        AND (filter_widget_id IS NULL OR dc.widget_id = filter_widget_id)
        AND d.processing_status = 'completed'
        AND 1 - (dc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ===========================================
-- USAGE TRACKING FUNCTIONS
-- ===========================================

-- Function to update customer usage
CREATE OR REPLACE FUNCTION update_customer_usage(
    customer_uuid UUID,
    usage_type TEXT,
    increment_by INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE customers
    SET
        usage_current = jsonb_set(
            usage_current,
            ARRAY[usage_type],
            to_jsonb((usage_current->usage_type)::INT + increment_by)
        ),
        updated_at = NOW()
    WHERE id = customer_uuid;
END;
$$;

-- Function to reset monthly usage (call from cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE customers
    SET
        usage_current = jsonb_set(usage_current, '{monthly_messages}', '0'),
        updated_at = NOW();
END;
$$;

-- ===========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===========================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_widgets_updated_at BEFORE UPDATE ON chat_widgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ===========================================

-- Insert sample system settings
INSERT INTO system_settings (key, value, description) VALUES
('app_name', '"N8N RAG Chat Dashboard"', 'Application name'),
('default_language', '"tr"', 'Default application language'),
('supported_languages', '["tr", "en"]', 'Supported languages'),
('max_file_size', '10485760', 'Maximum file size in bytes (10MB)'),
('allowed_file_types', '["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]', 'Allowed file MIME types'),
('rate_limits', '{"messages_per_minute": 10, "messages_per_hour": 100, "uploads_per_day": 50}', 'Global rate limits'),
('openai_model', '"gpt-4"', 'Default OpenAI model for chat'),
('embedding_model', '"text-embedding-ada-002"', 'OpenAI embedding model'),
('chunk_size', '1000', 'Document chunk size in characters'),
('chunk_overlap', '200', 'Document chunk overlap in characters')
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- GRANTS AND PERMISSIONS
-- ===========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for service role (for server-side operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE customers IS 'Customer accounts with subscription and usage tracking';
COMMENT ON TABLE chat_widgets IS 'Customizable chat widgets for each customer';
COMMENT ON TABLE documents IS 'Uploaded documents for RAG processing';
COMMENT ON TABLE document_chunks IS 'Chunked document content with vector embeddings';
COMMENT ON TABLE chat_sessions IS 'Chat sessions between visitors and widgets';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat sessions';
COMMENT ON TABLE analytics IS 'Daily aggregated analytics data';
COMMENT ON TABLE admin_users IS 'System administrators with various permission levels';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';

COMMENT ON FUNCTION search_documents IS 'Vector similarity search across document chunks';
COMMENT ON FUNCTION update_customer_usage IS 'Track and update customer usage metrics';
COMMENT ON FUNCTION reset_monthly_usage IS 'Reset monthly usage counters (run via cron)';

-- ===========================================
-- END OF SCHEMA
-- ===========================================