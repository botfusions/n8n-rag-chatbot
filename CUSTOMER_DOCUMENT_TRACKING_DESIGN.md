# 🗂️ Customer Document Tracking System Design

## 🎯 Gereksinim

Her döküman için izlenecek bilgiler:
- ✅ Customer ID
- ✅ Customer Name
- ✅ Customer Email
- ✅ Customer Phone
- ✅ Document Filename
- ✅ Upload Date
- ✅ File Size
- ✅ File Type
- ✅ Chunk Count

---

## 📊 Database Schema Tasarımı

### 1. Customers Tablosu (MEVCUT)

```sql
CREATE TABLE customers (
    id TEXT PRIMARY KEY,                    -- 'demo-customer-001'
    email TEXT UNIQUE NOT NULL,
    company_name TEXT,
    full_name TEXT,
    phone TEXT,
    language TEXT DEFAULT 'tr',
    subscription_plan TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Durum**: ✅ Var (Supabase'de UUID ID kullanıyor, TEXT ID'ye adapt edeceğiz)

---

### 2. Documents Tablosu (YENİ)

```sql
CREATE TABLE customer_documents (
    id TEXT PRIMARY KEY,                    -- hash(customer_id + filename + timestamp)
    customer_id TEXT NOT NULL,              -- REFERENCES customers(id)

    -- File Info
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,                         -- 'application/pdf', 'docx', etc.
    file_url TEXT,                          -- Google Drive URL veya Supabase Storage
    file_source TEXT,                       -- 'google_drive', 'url', 'upload'

    -- Processing Info
    chunk_count INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,

    -- Embedding Info
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    embedding_dim INTEGER DEFAULT 1536,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Indexes
    CONSTRAINT fk_customer FOREIGN KEY (customer_id)
        REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_customer_documents_customer_id
    ON customer_documents(customer_id);

CREATE INDEX idx_customer_documents_status
    ON customer_documents(processing_status);

CREATE INDEX idx_customer_documents_created
    ON customer_documents(created_at DESC);
```

---

### 3. customer_embeding Tablosu (GÜNCELLEME)

Mevcut tablo + yeni kolonlar:

```sql
-- Mevcut: customer_embeding
ALTER TABLE customer_embeding
ADD COLUMN document_id TEXT;

ALTER TABLE customer_embeding
ADD CONSTRAINT fk_document
FOREIGN KEY (document_id)
REFERENCES customer_documents(id) ON DELETE CASCADE;

-- Index
CREATE INDEX idx_customer_embeding_document_id
    ON customer_embeding(document_id);
```

**Yeni yapı**:
```
customer_embeding (
    id,
    customer_id,
    document_id,        -- ← YENİ
    kind,
    text,
    embedding,
    metadata,
    ...
)
```

---

## 🔄 Workflow Güncellemesi

### Yeni Flow:

```
Webhook Trigger
    ↓
1. Parse Input (fileId, filename, customer info)
    ↓
2. Customer Lookup/Create
    ↓
3. Document Record Create (customer_documents)
    ↓
4. Google Drive Download
    ↓
5. Unstructured API (text extract)
    ↓
6. Chunk Generation
    ↓
7. OpenAI Embeddings
    ↓
8. Insert to customer_embeding (WITH document_id)
    ↓
9. Update Document Status (completed)
    ↓
10. Respond to Webhook
```

---

## 📥 Yeni Webhook Payload

### Input Format:

```json
{
  "fileId": "1TmYYZridHwaF9H4jmPZeFnAxd4iVwVtn",
  "filename": "company-catalog.pdf",
  "customer": {
    "id": "demo-customer-001",
    "email": "demo@company.com",
    "name": "Demo Company A.Ş.",
    "phone": "+90 555 123 4567"
  },
  "metadata": {
    "source": "google_drive",
    "tags": ["catalog", "products"],
    "language": "tr"
  }
}
```

### Output Format:

```json
{
  "success": true,
  "document_id": "doc-abc123def456",
  "customer_id": "demo-customer-001",
  "filename": "company-catalog.pdf",
  "chunks_created": 22,
  "processing_time_ms": 45000,
  "metadata": {
    "file_size": 2458624,
    "file_type": "application/pdf",
    "embedding_model": "text-embedding-3-small",
    "chunk_count": 22
  }
}
```

---

## 🔍 Query Examples

### 1. Customer'ın Tüm Dökümanları

```sql
SELECT
  d.id,
  d.filename,
  d.file_size,
  d.chunk_count,
  d.processing_status,
  d.created_at,
  c.company_name,
  c.email
FROM customer_documents d
JOIN customers c ON d.customer_id = c.id
WHERE d.customer_id = 'demo-customer-001'
ORDER BY d.created_at DESC;
```

---

### 2. Döküman ile İlişkili Chunk'lar

```sql
SELECT
  ce.id,
  ce.kind,
  LEFT(ce.text, 100) as text_preview,
  ce.chunk_index,
  ce.chunk_total,
  d.filename,
  c.company_name
FROM customer_embeding ce
JOIN customer_documents d ON ce.document_id = d.id
JOIN customers c ON ce.customer_id = c.id
WHERE d.id = 'doc-abc123def456'
ORDER BY ce.chunk_index;
```

---

### 3. Customer Analytics

```sql
SELECT
  c.id,
  c.company_name,
  c.email,
  COUNT(DISTINCT d.id) as total_documents,
  SUM(d.chunk_count) as total_chunks,
  SUM(d.file_size) as total_storage_bytes,
  MAX(d.created_at) as last_upload
FROM customers c
LEFT JOIN customer_documents d ON c.id = d.customer_id
GROUP BY c.id, c.company_name, c.email
ORDER BY total_documents DESC;
```

---

### 4. Processing Status Dashboard

```sql
SELECT
  processing_status,
  COUNT(*) as count,
  SUM(file_size) as total_size,
  AVG(chunk_count) as avg_chunks
FROM customer_documents
GROUP BY processing_status;
```

---

## 🛠️ Implementation Plan

### Phase 1: Database Setup (5 min)

1. Create `customer_documents` table
2. Alter `customer_embeding` (add `document_id` column)
3. Create indexes

**SQL File**: `CREATE_DOCUMENT_TRACKING_TABLES.sql`

---

### Phase 2: Workflow Update (15 min)

1. Add "Customer Lookup/Create" node
2. Add "Create Document Record" node
3. Update "Format for customer_embeding" (add document_id)
4. Add "Update Document Status" node

**Workflow**: Update "Document Embedding to customer_embeding v5"

---

### Phase 3: Testing (10 min)

1. Test with new payload format
2. Verify document record creation
3. Verify chunk-document relationship
4. Test queries

---

## 📋 Migration Strategy

### Existing Data Migration:

```sql
-- Create document records for existing chunks
INSERT INTO customer_documents (
  id,
  customer_id,
  filename,
  original_filename,
  chunk_count,
  processing_status,
  created_at,
  processed_at
)
SELECT
  md5(customer_id || '-' ||
      COALESCE(metadata->>'filename', 'unknown') || '-' ||
      MIN(created_at)::text
     ) as id,
  customer_id,
  COALESCE(metadata->>'filename', 'unknown.pdf') as filename,
  COALESCE(metadata->>'filename', 'unknown.pdf') as original_filename,
  COUNT(*) as chunk_count,
  'completed' as processing_status,
  MIN(created_at) as created_at,
  MIN(created_at) as processed_at
FROM customer_embeding
GROUP BY customer_id, metadata->>'filename';

-- Link chunks to documents
UPDATE customer_embeding ce
SET document_id = (
  SELECT d.id
  FROM customer_documents d
  WHERE d.customer_id = ce.customer_id
    AND d.filename = COALESCE(ce.metadata->>'filename', 'unknown.pdf')
  LIMIT 1
);
```

---

## 🎯 Benefits

### 1. Traceability
✅ Her chunk hangi dökümanın parçası belli
✅ Her döküman hangi customer'a ait belli
✅ Upload tarihi ve kaynak bilgisi

### 2. Management
✅ Döküman listesi yönetimi
✅ Tekrar yükleme kontrolü
✅ Storage optimization

### 3. Analytics
✅ Customer başına döküman sayısı
✅ Storage kullanımı
✅ Processing success rate

### 4. Debugging
✅ Hangi döküman processing'de hata verdi?
✅ Chunk'lar doğru mu oluşturuldu?
✅ Duplicate döküman var mı?

---

## 📁 Files to Create

1. **CREATE_DOCUMENT_TRACKING_TABLES.sql** - DB schema
2. **MIGRATE_EXISTING_DATA.sql** - Migration script
3. **embedding-workflow-v6-with-tracking.json** - Updated workflow
4. **DOCUMENT_TRACKING_API_GUIDE.md** - API documentation

---

## 🚀 Next Steps

### Immediate (30 min):
1. Create SQL schema
2. Run migration for existing data
3. Update workflow with new nodes
4. Test with new payload

### Optional Enhancements:
- Document versioning (v1, v2, v3)
- Document tags and categorization
- Document search by filename
- Bulk document processing
- Document deletion cascade

---

**Hazırlayan**: Claude Code
**Tarih**: 30 Eylül 2025
**Amaç**: Customer document tracking and metadata management
**Durum**: Design complete, ready for implementation