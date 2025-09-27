# Supabase Vector Search Entegrasyonu - Güncelleme

## 🎯 Prompt Spesifikasyonlarına Göre Vector Search RPC Çağrısı

Prompt dosyasında belirtilen Supabase direct RPC çağrısı formatına göre güncelleme.

### 1. Güncellenmiş Database Function

```sql
-- Prompt spesifikasyonuna göre güncellenmiş vector search function
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

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION search_documents TO authenticated, anon_key, service_role;
```

### 2. Backend API Endpoint Güncellesi

```typescript
// backend/src/controllers/searchController.ts - Güncelleme
import { Request, Response } from 'express'
import { supabaseAdmin } from '../services/supabase'
import { openaiService } from '../services/openai'

export const searchDocuments = async (req: Request, res: Response) => {
  try {
    const {
      query,
      customerId,
      widgetId,
      embedding,
      limit = 5,
      threshold = 0.7
    } = req.body

    // Validation
    if (!query && !embedding) {
      return res.status(400).json({
        error: 'Query text or embedding is required'
      })
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required'
      })
    }

    let queryEmbedding = embedding

    // Generate embedding if not provided
    if (!queryEmbedding) {
      try {
        const embeddingResponse = await openaiService.createEmbedding({
          model: 'text-embedding-ada-002',
          input: query
        })
        queryEmbedding = embeddingResponse.data[0].embedding
      } catch (embeddingError) {
        console.error('Embedding generation error:', embeddingError)
        return res.status(500).json({
          error: 'Failed to generate query embedding'
        })
      }
    }

    // Direct Supabase RPC call (as per prompt specs)
    const { data: searchResults, error } = await supabaseAdmin.rpc('search_documents', {
      query_embedding: queryEmbedding,
      filter_customer_id: customerId,
      filter_widget_id: widgetId || null,
      match_count: Math.min(limit, 10),
      similarity_threshold: Math.max(threshold, 0.1)
    })

    if (error) {
      console.error('Vector search error:', error)
      return res.status(500).json({
        error: 'Vector search failed',
        details: error.message
      })
    }

    // Enhanced response with prompt format
    const response = {
      query: query || '[embedding provided]',
      results: searchResults || [],
      metadata: {
        resultCount: searchResults?.length || 0,
        customerId,
        widgetId: widgetId || null,
        threshold,
        timestamp: new Date().toISOString(),
        searchType: 'vector_similarity'
      }
    }

    res.json(response)

  } catch (error) {
    console.error('Search documents error:', error)
    res.status(500).json({
      error: 'Internal server error during document search'
    })
  }
}

// Generate embeddings endpoint
export const generateEmbedding = async (req: Request, res: Response) => {
  try {
    const { text, customerId } = req.body

    if (!text) {
      return res.status(400).json({
        error: 'Text is required'
      })
    }

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required'
      })
    }

    const embeddingResponse = await openaiService.createEmbedding({
      model: 'text-embedding-ada-002',
      input: text
    })

    const response = {
      embedding: embeddingResponse.data[0].embedding,
      model: 'text-embedding-ada-002',
      usage: embeddingResponse.usage,
      metadata: {
        customerId,
        textLength: text.length,
        timestamp: new Date().toISOString()
      }
    }

    res.json(response)

  } catch (error) {
    console.error('Generate embedding error:', error)
    res.status(500).json({
      error: 'Failed to generate embedding'
    })
  }
}

// Search suggestions endpoint
export const getSearchSuggestions = async (req: Request, res: Response) => {
  try {
    const { customerId, widgetId, limit = 5 } = req.query

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required'
      })
    }

    // Get popular/recent document topics for suggestions
    const { data: suggestions, error } = await supabaseAdmin
      .from('document_chunks')
      .select(`
        content,
        metadata,
        documents!inner(filename)
      `)
      .eq('customer_id', customerId)
      .eq('widget_id', widgetId || null)
      .order('created_at', { ascending: false })
      .limit(Number(limit) * 2) // Get more to filter

    if (error) {
      console.error('Suggestions query error:', error)
      return res.status(500).json({
        error: 'Failed to get suggestions'
      })
    }

    // Extract meaningful suggestions from content
    const processedSuggestions = suggestions
      ?.map(item => {
        const sentences = item.content.split(/[.!?]+/).filter(s => s.trim().length > 20)
        return sentences.slice(0, 2).map(sentence => sentence.trim())
      })
      .flat()
      .filter(Boolean)
      .slice(0, Number(limit))

    res.json({
      suggestions: processedSuggestions || [],
      metadata: {
        customerId,
        widgetId: widgetId || null,
        count: processedSuggestions?.length || 0,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Get suggestions error:', error)
    res.status(500).json({
      error: 'Internal server error during suggestions retrieval'
    })
  }
}
```

### 3. N8N Workflow'da Vector Search Düzeltmesi

```json
{
  "name": "Vector Search Documents (Corrected)",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "POST",
    "url": "{{ $env.SUPABASE_URL }}/rest/v1/rpc/search_documents",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "apikey",
          "value": "{{ $env.SUPABASE_ANON_KEY }}"
        },
        {
          "name": "Authorization",
          "value": "Bearer {{ $env.SUPABASE_ANON_KEY }}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "query_embedding",
          "value": "={{ $('Generate Query Embedding').item(0).json.data[0].embedding }}"
        },
        {
          "name": "filter_customer_id",
          "value": "={{ $('Parse Chat Input').item(0).json.customerId }}"
        },
        {
          "name": "filter_widget_id",
          "value": "={{ $('Parse Chat Input').item(0).json.widgetId }}"
        },
        {
          "name": "match_count",
          "value": 5
        },
        {
          "name": "similarity_threshold",
          "value": 0.7
        }
      ]
    },
    "options": {
      "timeout": 15000,
      "retry": {
        "enabled": true,
        "maxRetries": 2
      }
    }
  }
}
```

### 4. Frontend Search Hook Güncellesi

```typescript
// frontend/src/hooks/useSearch.ts
import { useState } from 'react'
import { createClientSupabase } from '@/lib/supabase'

interface SearchResult {
  chunk_id: string
  document_id: string
  content: string
  document_filename: string
  similarity: number
  metadata: any
}

interface SearchResponse {
  query: string
  results: SearchResult[]
  metadata: {
    resultCount: number
    customerId: string
    widgetId?: string
    threshold: number
    timestamp: string
    searchType: string
  }
}

export const useSearch = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientSupabase()

  const searchDocuments = async (
    query: string,
    options: {
      widgetId?: string
      limit?: number
      threshold?: number
    } = {}
  ): Promise<SearchResponse | null> => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Authentication required')
      }

      // Direct RPC call to Supabase (as per prompt specs)
      const { data: embedding, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: query }
      })

      if (embeddingError) {
        throw new Error('Failed to generate embedding')
      }

      // Vector search using RPC
      const { data: searchResults, error: searchError } = await supabase.rpc('search_documents', {
        query_embedding: embedding.data[0].embedding,
        filter_customer_id: user.id,
        filter_widget_id: options.widgetId || null,
        match_count: options.limit || 5,
        similarity_threshold: options.threshold || 0.7
      })

      if (searchError) {
        throw new Error('Search failed: ' + searchError.message)
      }

      const response: SearchResponse = {
        query,
        results: searchResults || [],
        metadata: {
          resultCount: searchResults?.length || 0,
          customerId: user.id,
          widgetId: options.widgetId,
          threshold: options.threshold || 0.7,
          timestamp: new Date().toISOString(),
          searchType: 'vector_similarity'
        }
      }

      return response

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      console.error('Search error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const getSearchSuggestions = async (widgetId?: string): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get document chunks for suggestions
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select(`
          content,
          metadata,
          documents!inner(filename)
        `)
        .eq('customer_id', user.id)
        .eq('widget_id', widgetId || null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Suggestions error:', error)
        return []
      }

      // Extract meaningful suggestions
      const suggestions = chunks
        ?.map(chunk => {
          const sentences = chunk.content.split(/[.!?]+/).filter(s => s.trim().length > 20)
          return sentences.slice(0, 1).map(s => s.trim())
        })
        .flat()
        .filter(Boolean)
        .slice(0, 5)

      return suggestions || []

    } catch (error) {
      console.error('Get suggestions error:', error)
      return []
    }
  }

  return {
    searchDocuments,
    getSearchSuggestions,
    loading,
    error
  }
}
```

### 5. Chat Widget İçin Search Component

```typescript
// frontend/src/components/chat/SearchWidget.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, FileText, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSearch } from '@/hooks/useSearch'
import { Badge } from '@/components/ui/badge'

interface SearchWidgetProps {
  widgetId?: string
  onResultSelect?: (result: any) => void
  placeholder?: string
}

export function SearchWidget({ widgetId, onResultSelect, placeholder = "Dokümanlarda ara..." }: SearchWidgetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const { searchDocuments, getSearchSuggestions, loading, error } = useSearch()

  useEffect(() => {
    // Load initial suggestions
    loadSuggestions()
  }, [widgetId])

  const loadSuggestions = async () => {
    const suggestions = await getSearchSuggestions(widgetId)
    setSuggestions(suggestions)
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    const response = await searchDocuments(query, { widgetId })
    if (response) {
      setResults(response.results)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    // Auto search when suggestion is clicked
    searchDocuments(suggestion, { widgetId }).then(response => {
      if (response) {
        setResults(response.results)
      }
    })
  }

  const formatSimilarity = (similarity: number) => {
    return `${Math.round(similarity * 100)}%`
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          size="icon"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      {/* Suggestions */}
      {!results.length && suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">Önerilen aramalar:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.length > 50 ? suggestion.slice(0, 50) + '...' : suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">
            {results.length} sonuç bulundu
          </p>

          {results.map((result, index) => (
            <Card
              key={result.chunk_id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onResultSelect?.(result)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">
                      {result.document_filename}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {formatSimilarity(result.similarity)}
                  </Badge>
                </div>

                <p className="text-sm text-gray-700 line-clamp-3">
                  {result.content}
                </p>

                {result.metadata?.chunkType && (
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {result.metadata.chunkType}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Aranıyor...</p>
        </div>
      )}
    </div>
  )
}
```

### 6. Environment Variables Güncellemesi

```env
# .env.example güncellenmesi
# Vector Search için özel ayarlar
SUPABASE_URL=https://your-supabase-instance.com
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# OpenAI Embeddings
OPENAI_API_KEY=sk-your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Vector Search Settings
VECTOR_SEARCH_SIMILARITY_THRESHOLD=0.7
VECTOR_SEARCH_MAX_RESULTS=10
VECTOR_SEARCH_TIMEOUT=15000

# N8N Integration
N8N_WEBHOOK_BASE_URL=https://your-n8n.com/webhook
N8N_API_KEY=your-n8n-api-key
```

Bu güncelleme prompt dosyasında belirtilen spesifikasyonlara tam uyumlu olarak Supabase direct RPC çağrısı yapacak ve vector search'ün doğru çalışmasını sağlayacaktır.