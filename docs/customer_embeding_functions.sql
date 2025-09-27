-- Customer Embedding Table Vector Search Functions
-- Compatible with existing customer_embeding table structure
-- Supports both document chunks and Q&A embeddings

-- Main vector search function for customer_embeding table
CREATE OR REPLACE FUNCTION search_customer_embeddings(
    query_embedding vector(1536),
    filter_customer_id TEXT,
    filter_kind TEXT DEFAULT 'document',
    match_count INT DEFAULT 5,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id TEXT,
    kind TEXT,
    text TEXT,
    question TEXT,
    answer TEXT,
    similarity FLOAT,
    metadata JSONB,
    chunk_index INTEGER,
    chunk_total INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.kind,
        ce.text,
        ce.question,
        ce.answer,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata,
        ce.chunk_index,
        ce.chunk_total,
        ce.created_at
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = filter_kind
        AND ce.embedding IS NOT NULL
        AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Q&A specific search function
CREATE OR REPLACE FUNCTION search_qa_embeddings(
    query_embedding vector(1536),
    filter_customer_id TEXT,
    match_count INT DEFAULT 3,
    similarity_threshold FLOAT DEFAULT 0.8
)
RETURNS TABLE (
    id TEXT,
    question TEXT,
    answer TEXT,
    similarity FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.question,
        ce.answer,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata,
        ce.created_at
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = 'qa'
        AND ce.question IS NOT NULL
        AND ce.answer IS NOT NULL
        AND ce.embedding IS NOT NULL
        AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Hybrid search function (combines documents and Q&A)
CREATE OR REPLACE FUNCTION search_hybrid_embeddings(
    query_embedding vector(1536),
    filter_customer_id TEXT,
    doc_count INT DEFAULT 3,
    qa_count INT DEFAULT 2,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id TEXT,
    kind TEXT,
    content TEXT,
    similarity FLOAT,
    metadata JSONB,
    source_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Document chunks
    SELECT
        ce.id,
        ce.kind,
        ce.text as content,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata,
        'document'::TEXT as source_type
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = 'document'
        AND ce.embedding IS NOT NULL
        AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT doc_count

    UNION ALL

    -- Q&A pairs
    SELECT
        ce.id,
        ce.kind,
        CONCAT('Q: ', ce.question, ' A: ', ce.answer) as content,
        1 - (ce.embedding <=> query_embedding) as similarity,
        ce.metadata,
        'qa'::TEXT as source_type
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = 'qa'
        AND ce.question IS NOT NULL
        AND ce.answer IS NOT NULL
        AND ce.embedding IS NOT NULL
        AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT qa_count;
END;
$$;

-- Document statistics function
CREATE OR REPLACE FUNCTION get_customer_embedding_stats(
    filter_customer_id TEXT
)
RETURNS TABLE (
    total_embeddings BIGINT,
    document_chunks BIGINT,
    qa_pairs BIGINT,
    unique_documents BIGINT,
    avg_chunk_length FLOAT,
    latest_created TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_embeddings,
        COUNT(*) FILTER (WHERE kind = 'document') as document_chunks,
        COUNT(*) FILTER (WHERE kind = 'qa') as qa_pairs,
        COUNT(DISTINCT (metadata->>'documentId')) as unique_documents,
        AVG(LENGTH(text)) as avg_chunk_length,
        MAX(created_at) as latest_created
    FROM customer_embeding
    WHERE customer_id = filter_customer_id;
END;
$$;

-- Text-based search (for non-vector fallback)
CREATE OR REPLACE FUNCTION search_text_similarity(
    query_text TEXT,
    filter_customer_id TEXT,
    filter_kind TEXT DEFAULT 'document',
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id TEXT,
    kind TEXT,
    text TEXT,
    question TEXT,
    answer TEXT,
    text_similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.kind,
        ce.text,
        ce.question,
        ce.answer,
        CASE
            WHEN ce.kind = 'qa' THEN
                GREATEST(
                    similarity(query_text, COALESCE(ce.question, '')),
                    similarity(query_text, COALESCE(ce.answer, ''))
                )
            ELSE
                similarity(query_text, COALESCE(ce.text, ''))
        END as text_similarity,
        ce.metadata
    FROM customer_embeding ce
    WHERE
        ce.customer_id = filter_customer_id
        AND ce.kind = filter_kind
        AND (
            (ce.kind = 'qa' AND (ce.question % query_text OR ce.answer % query_text))
            OR (ce.kind != 'qa' AND ce.text % query_text)
        )
    ORDER BY text_similarity DESC
    LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_customer_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_qa_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_hybrid_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_customer_embedding_stats TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_text_similarity TO authenticated, service_role;

-- Comments for documentation
COMMENT ON FUNCTION search_customer_embeddings IS 'Vector similarity search for document chunks or Q&A in customer_embeding table';
COMMENT ON FUNCTION search_qa_embeddings IS 'Specialized search for Q&A pairs only';
COMMENT ON FUNCTION search_hybrid_embeddings IS 'Combined search across both documents and Q&A with separate limits';
COMMENT ON FUNCTION get_customer_embedding_stats IS 'Get statistics about customer embeddings';
COMMENT ON FUNCTION search_text_similarity IS 'Text-based similarity search as fallback when vector search is not available';