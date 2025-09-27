-- Vector search function for customer_embeding table
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