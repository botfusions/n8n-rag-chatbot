import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../utils/config';
import { SupabaseError } from '../utils/errors';
import logger from '../utils/logger';

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  private constructor() {
    // Client for authenticated operations
    this.client = createClient(appConfig.supabase.url, appConfig.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    // Admin client for service operations
    this.adminClient = createClient(appConfig.supabase.url, appConfig.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('Supabase clients initialized');
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }

  public getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.adminClient.from('users').select('count').limit(1);
      if (error) {
        logger.error('Supabase health check failed:', error);
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Supabase health check error:', error);
      return false;
    }
  }

  // Generic CRUD operations
  public async create<T>(table: string, data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await this.adminClient
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error(`Error creating ${table}:`, error);
        throw new SupabaseError(`Failed to create ${table}`, { error: error.message });
      }

      return result as T;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error creating ${table}:`, error);
      throw new SupabaseError(`Unexpected error creating ${table}`);
    }
  }

  public async findById<T>(table: string, id: string): Promise<T | null> {
    try {
      const { data, error } = await this.adminClient
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        logger.error(`Error finding ${table} by ID:`, error);
        throw new SupabaseError(`Failed to find ${table}`, { error: error.message });
      }

      return data as T || null;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error finding ${table}:`, error);
      throw new SupabaseError(`Unexpected error finding ${table}`);
    }
  }

  public async findMany<T>(
    table: string,
    options: {
      filters?: Record<string, unknown>;
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    try {
      let query = this.adminClient.from(table).select(options.select || '*');

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`Error finding ${table}:`, error);
        throw new SupabaseError(`Failed to find ${table}`, { error: error.message });
      }

      return data as T[];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error finding ${table}:`, error);
      throw new SupabaseError(`Unexpected error finding ${table}`);
    }
  }

  public async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await this.adminClient
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`Error updating ${table}:`, error);
        throw new SupabaseError(`Failed to update ${table}`, { error: error.message });
      }

      return result as T;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error updating ${table}:`, error);
      throw new SupabaseError(`Unexpected error updating ${table}`);
    }
  }

  public async delete(table: string, id: string): Promise<void> {
    try {
      const { error } = await this.adminClient
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(`Error deleting ${table}:`, error);
        throw new SupabaseError(`Failed to delete ${table}`, { error: error.message });
      }
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error deleting ${table}:`, error);
      throw new SupabaseError(`Unexpected error deleting ${table}`);
    }
  }

  public async count(table: string, filters?: Record<string, unknown>): Promise<number> {
    try {
      let query = this.adminClient.from(table).select('*', { count: 'exact', head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { count, error } = await query;

      if (error) {
        logger.error(`Error counting ${table}:`, error);
        throw new SupabaseError(`Failed to count ${table}`, { error: error.message });
      }

      return count || 0;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error counting ${table}:`, error);
      throw new SupabaseError(`Unexpected error counting ${table}`);
    }
  }

  // Vector search operations
  public async vectorSearch(
    table: string,
    embedding: number[],
    options: {
      similarityThreshold?: number;
      limit?: number;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<unknown[]> {
    try {
      const { similarityThreshold = 0.7, limit = 10, filters } = options;

      let query = this.adminClient
        .from(table)
        .select('*, similarity')
        .lt('similarity', 1 - similarityThreshold)
        .order('similarity', { ascending: true })
        .limit(limit);

      // Apply additional filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Note: This is a placeholder for vector similarity search
      // You'll need to implement the actual RPC call based on your Supabase setup
      const { data, error } = await this.adminClient.rpc('match_documents', {
        query_embedding: embedding,
        similarity_threshold: similarityThreshold,
        match_count: limit,
      });

      if (error) {
        logger.error('Error performing vector search:', error);
        throw new SupabaseError('Vector search failed', { error: error.message });
      }

      return data;
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error('Unexpected error in vector search:', error);
      throw new SupabaseError('Unexpected error in vector search');
    }
  }

  // Batch operations
  public async batchInsert<T>(table: string, data: Partial<T>[]): Promise<T[]> {
    try {
      const { data: result, error } = await this.adminClient
        .from(table)
        .insert(data)
        .select();

      if (error) {
        logger.error(`Error batch inserting ${table}:`, error);
        throw new SupabaseError(`Failed to batch insert ${table}`, { error: error.message });
      }

      return result as T[];
    } catch (error) {
      if (error instanceof SupabaseError) {
        throw error;
      }
      logger.error(`Unexpected error batch inserting ${table}:`, error);
      throw new SupabaseError(`Unexpected error batch inserting ${table}`);
    }
  }

  public async batchUpdate<T>(table: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    try {
      const results: T[] = [];

      // Supabase doesn't support batch updates directly, so we'll do them individually
      // In a production environment, you might want to use a stored procedure for this
      for (const update of updates) {
        const result = await this.update<T>(table, update.id, update.data);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error(`Error batch updating ${table}:`, error);
      throw new SupabaseError(`Failed to batch update ${table}`);
    }
  }

  // Transaction wrapper
  public async transaction<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
    // Supabase doesn't have explicit transaction support in the client
    // This is a placeholder for future implementation or wrapper around RPC calls
    try {
      return await callback(this.adminClient);
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }
}

export default SupabaseService.getInstance();