# 🔧 Supabase SQL Manual Restore Talimatları

## Sorun
RAG webhook çalışmıyor çünkü Supabase'de eksik fonksiyonlar var:
- ❌ search_customer_embeddings fonksiyonu yok
- ❌ vector extension kurulu değil
- ❌ customer_embeding tablosu boş

## ✅ Çözüm Adımları

### 1. Supabase Dashboard'a Git
1. https://supabase.turklawai.com adresine git
2. Admin hesabınla giriş yap
3. **SQL Editor** sekmesine tıkla

### 2. SQL Fonksiyonları Restore Et

**Dosya: `manual-sql-restore.sql`** - Bu dosyayı kopyala ve SQL Editor'da çalıştır:

```sql
-- 1. PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. customer_embeding tablosunun var olduğunu kontrol et
CREATE TABLE IF NOT EXISTS customer_embeding (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'document',
    text TEXT,
    question TEXT,
    answer TEXT,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER,
    chunk_total INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_customer_embeding_customer_id ON customer_embeding(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_embeding_kind ON customer_embeding(kind);
CREATE INDEX IF NOT EXISTS idx_customer_embeding_embedding ON customer_embeding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Main vector search function
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

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION search_customer_embeddings TO authenticated, service_role;

-- 6. Test query
SELECT 'Database restore completed successfully!' as status;
```

### 3. Test Verilerini Ekle

**Dosya: `test-data-insert.sql`** - Bu dosyayı da SQL Editor'da çalıştır:

```sql
-- Test data for customer_embeding table
INSERT INTO customer_embeding (
    id, customer_id, kind, text, question, answer,
    embedding, metadata, chunk_index, chunk_total
) VALUES
(
    'test-doc-1',
    'test-customer-rag',
    'document',
    'Bu şirket 2020 yılında kurulmuş bir teknoloji firmasıdır. Müşterilerimize yapay zeka ve otomasyon çözümleri sunuyoruz.',
    NULL, NULL, NULL,
    '{"documentId": "test-doc", "fileName": "company-info.pdf", "chunkNumber": 1}',
    1, 3
);

-- Test customer ekle
INSERT INTO customers (id, company_name, email, phone, industry, created_at)
VALUES (
    'test-customer-rag',
    'Test Company RAG',
    'test@testcompany.com',
    '+90 555 123 4567',
    'Technology',
    NOW()
) ON CONFLICT (id) DO NOTHING;
```

### 4. Doğrulama

SQL'ler çalıştıktan sonra bu sorguları çalıştır:

```sql
-- Fonksiyonları kontrol et
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%search%';

-- Test verilerini kontrol et
SELECT COUNT(*) as total_records,
       COUNT(*) FILTER (WHERE kind = 'document') as document_chunks,
       COUNT(*) FILTER (WHERE kind = 'qa') as qa_pairs
FROM customer_embeding
WHERE customer_id = 'test-customer-rag';
```

### 5. Test

SQL'ler tamamlandıktan sonra bu komutu çalıştıralım:

```bash
node test-supabase-connection.js
```

Beklenilen sonuç:
```
✅ search_customer_embeddings: Fonksiyon çalışıyor
✅ customer_embeding: X kayıt
```

## 💡 Notlar

- **Extensions**: vector extension pgvector için gerekli
- **Functions**: RAG workflow'un çalışması için search_customer_embeddings şart
- **Test Data**: Webhook'u test etmek için en az 1 kayıt gerekli
- **Permissions**: authenticated ve service_role rollerine execute izni verildi

## 🚨 Önemli

Bu SQL'leri çalıştırdıktan sonra RAG webhook tamamen çalışır hale gelecek!

```
❌ Öncesi: "Unexpected end of JSON input"
✅ Sonrası: Tam çalışan RAG chat response
```