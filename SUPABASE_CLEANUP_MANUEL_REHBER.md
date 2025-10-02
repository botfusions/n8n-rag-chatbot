# 🧹 Supabase Duplicate Cleanup - Manuel Rehber

## ⚠️ Önemli Not

Supabase REST API üzerinden complex SQL işlemleri (DELETE, CREATE INDEX) çalıştırılamaz.
Bu işlemler **Supabase SQL Editor**'de manuel yapılmalıdır.

---

## 🚀 Adım Adım İşlemler

### ADIM 1: Supabase SQL Editor'ı Açın

1. https://supabase.turklawai.com adresine gidin
2. Giriş yapın
3. Sol menüden **"SQL Editor"** tıklayın
4. **"New Query"** ile yeni sorgu penceresi açın

---

### ADIM 2: Mevcut Durumu Kontrol Et

**Query 1 - İstatistikler**:

```sql
SELECT
  customer_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT md5(text)) as unique_chunks,
  COUNT(*) - COUNT(DISTINCT md5(text)) as duplicate_count
FROM customer_embeding
GROUP BY customer_id;
```

**Çalıştır** (Run) → F5 veya Ctrl+Enter

**Beklenen Çıktı**:
```
customer_id       | total_chunks | unique_chunks | duplicate_count
demo-customer-001 | 1936         | 22            | 1914
```

✅ **1914 duplicate var!**

---

**Query 2 - Top Duplicate'ler**:

```sql
SELECT
  md5(text) as text_hash,
  LEFT(text, 80) as text_preview,
  COUNT(*) as duplicate_count
FROM customer_embeding
GROUP BY md5(text), text
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
```

**Çalıştır** → Her chunk'ın kaç kez tekrar ettiğini görün.

---

### ADIM 3: Backup Oluştur (Güvenlik)

**Query 3 - Backup**:

```sql
CREATE TABLE customer_embeding_backup_20250930 AS
SELECT * FROM customer_embeding;
```

**Çalıştır** → Tüm data backup'landı!

**Verify Backup**:

```sql
SELECT COUNT(*) as backup_count
FROM customer_embeding_backup_20250930;
```

**Beklenen**: `1936` (veya mevcut total chunk sayısı)

✅ **Backup hazır!**

---

### ADIM 4: Duplicate'leri Temizle

**Query 4 - DELETE Duplicates** (⚠️ DİKKATLİ!):

```sql
WITH ranked_chunks AS (
  SELECT
    id,
    customer_id,
    text,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id, md5(text)
      ORDER BY created_at ASC
    ) as row_num
  FROM customer_embeding
)
DELETE FROM customer_embeding
WHERE id IN (
  SELECT id
  FROM ranked_chunks
  WHERE row_num > 1
);
```

**Bu SQL şunları yapar**:
1. Her (customer_id + text) kombinasyonunu gruplar
2. Her gruptaki en eski kaydı tutar (row_num = 1)
3. Diğerlerini siler (row_num > 1)

**Çalıştır** → F5

**Çıktı**:
```
DELETE 1914
```

✅ **1914 duplicate silindi!**

---

### ADIM 5: Temizlik Sonrası Kontrol

**Query 5 - Verify Cleanup**:

```sql
SELECT
  customer_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT md5(text)) as unique_chunks,
  COUNT(*) - COUNT(DISTINCT md5(text)) as remaining_duplicates
FROM customer_embeding
GROUP BY customer_id;
```

**Beklenen Çıktı**:
```
customer_id       | total_chunks | unique_chunks | remaining_duplicates
demo-customer-001 | 22           | 22            | 0
```

✅ **Duplicate kalmadı!**

---

### ADIM 6: Unique Constraint Ekle

**Query 6 - Create Unique Index**:

```sql
CREATE UNIQUE INDEX idx_customer_chunk_unique
ON customer_embeding (customer_id, md5(text));
```

**Çalıştır** → F5

**Beklenen Çıktı**:
```
Success. No rows returned
```

✅ **Unique constraint eklendi!**

**Bu index ne yapar?**
- Artık aynı customer_id + text kombinasyonu 2. kez INSERT edilemez
- Duplicate protection kalıcı olarak aktif

---

### ADIM 7: Unique Constraint Test

**Query 7 - Test Duplicate INSERT** (başarısız olmalı!):

```sql
INSERT INTO customer_embeding (
  id,
  customer_id,
  kind,
  text,
  embedding,
  embedding_model,
  embedding_dim,
  metadata
) VALUES (
  'test-duplicate-001',
  'demo-customer-001',
  'qa',
  'Do you provide 24/7 coverage?
A: We offer extended coverage across UK and Türkiye time zones.',
  ARRAY[0.1]::vector(1536),
  'text-embedding-3-small',
  1536,
  '{}'::jsonb
);
```

**Beklenen Hata**:
```
ERROR: duplicate key value violates unique constraint "idx_customer_chunk_unique"
```

✅ **Perfect! Duplicate protection çalışıyor!**

---

## 📊 Final İstatistikler

**Query 8 - System Stats**:

```sql
SELECT
  'Total Customers' as metric,
  COUNT(DISTINCT customer_id)::text as value
FROM customer_embeding

UNION ALL

SELECT
  'Total Chunks',
  COUNT(*)::text
FROM customer_embeding

UNION ALL

SELECT
  'Avg Chunks/Customer',
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT customer_id), 0), 2)::text
FROM customer_embeding

UNION ALL

SELECT
  'DB Size (MB)',
  ROUND(pg_total_relation_size('customer_embeding')::numeric / 1024 / 1024, 2)::text;
```

---

## 🧪 Postman Test

Şimdi aynı dosyayı **tekrar** yükleyin:

**Postman**:
```json
POST https://n8n.botfusions.com/webhook/embedding-upload

{
  "fileId": "1TmYYZridHwaF9H4jmPZeFnAxd4iVwVtn"
}
```

### Seçenek A: Workflow Hata Versin (Default)

**N8N Workflow Response**:
```json
{
  "error": "Failed to insert chunks",
  "details": "duplicate key value violates unique constraint"
}
```

Bu **NORMAL** ve **İSTENEN** davranış!

---

### Seçenek B: Duplicate'leri Ignore Et (Önerilen)

**N8N Workflow'da Fix**:

"Insert to customer_embeding" node'unda **Headers** ekleyin:

```javascript
"Prefer": "resolution=ignore-duplicates"
```

**Sonuç**: Duplicate chunk'lar sessizce ignore edilir, yeni chunk'lar eklenir.

**Response**:
```json
{
  "success": true,
  "chunks_created": 0,
  "chunks_ignored": 22,
  "message": "No new chunks (all duplicates)"
}
```

---

## ✅ Checklist

Tüm adımları tamamlayın:

- [ ] ADIM 1: Mevcut durum kontrol edildi (1936 → 22 expected)
- [ ] ADIM 2: Top duplicate'ler listelendi
- [ ] ADIM 3: Backup tablosu oluşturuldu (customer_embeding_backup_20250930)
- [ ] ADIM 4: Duplicate'ler silindi (DELETE 1914)
- [ ] ADIM 5: Temizlik verify edildi (remaining_duplicates = 0)
- [ ] ADIM 6: Unique constraint eklendi (idx_customer_chunk_unique)
- [ ] ADIM 7: Duplicate INSERT test edildi (hata aldı ✅)
- [ ] ADIM 8: Final istatistikler kontrol edildi
- [ ] ADIM 9: Postman'den tekrar test edildi

---

## 🔄 Rollback (Hata Durumunda)

Eğer bir şeyler ters giderse, backup'tan geri yükleyin:

```sql
-- Önce mevcut tabloyu sil
DROP TABLE customer_embeding;

-- Backup'tan restore et
CREATE TABLE customer_embeding AS
SELECT * FROM customer_embeding_backup_20250930;

-- Index'leri yeniden oluştur
CREATE INDEX idx_customer_embeding_customer_id
ON customer_embeding(customer_id);

CREATE INDEX idx_customer_embeding_kind
ON customer_embeding(kind);

-- Vector search için
CREATE INDEX idx_customer_embeding_embedding
ON customer_embeding USING ivfflat (embedding vector_cosine_ops);
```

---

## 📞 Sorun mu var?

### Sorun 1: Backup oluşturulamıyor
**Hata**: `out of memory`

**Çözüm**: Chunk'ları batch'ler halinde backup alın:
```sql
CREATE TABLE customer_embeding_backup_20250930 AS
SELECT * FROM customer_embeding
WHERE created_at > '2025-09-30';
```

---

### Sorun 2: DELETE çok yavaş
**Sebep**: 1914 row siliniyor

**Çözüm**: Normal! 10-30 saniye sürebilir. Bekleyin.

---

### Sorun 3: Unique constraint eklendikten sonra workflow çalışmıyor
**Sebep**: Duplicate chunk INSERT edilmeye çalışılıyor

**Çözüm**: Workflow'da `Prefer: resolution=ignore-duplicates` header'ı ekleyin.

---

**Hazırlayan**: Claude Code
**Tarih**: 30 Eylül 2025
**Amaç**: customer_embeding duplicate cleanup - Manuel SQL rehberi
**Durum**: Production-ready ✅