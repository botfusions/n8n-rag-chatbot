import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Document, DocumentChunk, DocumentStatus, CreateEntity } from '../types';
import { appConfig } from '../utils/config';
import { FileUploadError, FileProcessingError, ValidationError } from '../utils/errors';
import supabaseService from './supabase';
import openaiService from './openai';
import logger from '../utils/logger';

class DocumentService {
  private static instance: DocumentService;

  private constructor() {
    this.ensureUploadDirectory();
  }

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(appConfig.upload.path, { recursive: true });
    } catch (error) {
      logger.error('Error creating upload directory:', error);
    }
  }

  public async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<Document> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(appConfig.upload.path, filename);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Create document record
      const documentData: CreateEntity<Document> = {
        user_id: userId,
        filename,
        original_name: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        status: DocumentStatus.UPLOADED,
        metadata,
      };

      const document = await supabaseService.create<Document>('documents', documentData);

      logger.info(`Document uploaded: ${document.id}`, {
        userId,
        filename: file.originalname,
        size: file.size,
      });

      return document;
    } catch (error) {
      logger.error('Error uploading document:', error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new FileUploadError('Failed to upload document');
    }
  }

  public async processDocument(documentId: string): Promise<Document> {
    try {
      const document = await supabaseService.findById<Document>('documents', documentId);

      if (!document) {
        throw new ValidationError('Document not found');
      }

      if (document.status !== DocumentStatus.UPLOADED) {
        throw new ValidationError('Document is not in uploadable state');
      }

      // Update status to processing
      await supabaseService.update<Document>('documents', documentId, {
        status: DocumentStatus.PROCESSING,
      });

      try {
        // Extract text content
        const textContent = await this.extractTextContent(document.file_path, document.mime_type);

        // Generate chunks
        const chunks = this.generateChunks(textContent);

        // Generate embeddings for chunks
        const embeddedChunks = await this.generateEmbeddings(chunks, documentId);

        // Save chunks to database
        await supabaseService.batchInsert<DocumentChunk>('document_chunks', embeddedChunks);

        // Update document status
        const updatedDocument = await supabaseService.update<Document>('documents', documentId, {
          status: DocumentStatus.PROCESSED,
          text_content: textContent,
          chunk_count: chunks.length,
        });

        logger.info(`Document processed successfully: ${documentId}`, {
          chunkCount: chunks.length,
          textLength: textContent.length,
        });

        return updatedDocument;
      } catch (processingError) {
        // Update document status to failed
        await supabaseService.update<Document>('documents', documentId, {
          status: DocumentStatus.FAILED,
          processing_error: processingError instanceof Error ? processingError.message : 'Unknown error',
        });

        throw processingError;
      }
    } catch (error) {
      logger.error(`Error processing document ${documentId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new FileProcessingError('Failed to process document');
    }
  }

  public async getDocuments(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: DocumentStatus;
      search?: string;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, search } = options;
      const offset = (page - 1) * limit;

      // Build filters
      const filters: Record<string, unknown> = { user_id: userId };
      if (status) {
        filters.status = status;
      }

      // Get documents
      const documents = await supabaseService.findMany<Document>('documents', {
        filters,
        orderBy: { column: 'created_at', ascending: false },
        limit,
        offset,
      });

      // Filter by search if provided
      let filteredDocuments = documents;
      if (search) {
        filteredDocuments = documents.filter(doc =>
          doc.original_name.toLowerCase().includes(search.toLowerCase()) ||
          (doc.text_content && doc.text_content.toLowerCase().includes(search.toLowerCase()))
        );
      }

      // Get total count
      const total = await supabaseService.count('documents', filters);

      return { documents: filteredDocuments, total };
    } catch (error) {
      logger.error('Error getting documents:', error);
      throw new FileProcessingError('Failed to retrieve documents');
    }
  }

  public async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await supabaseService.findById<Document>('documents', documentId);

      if (!document) {
        throw new ValidationError('Document not found');
      }

      if (document.user_id !== userId) {
        throw new ValidationError('Unauthorized to delete this document');
      }

      // Delete file from disk
      try {
        await fs.unlink(document.file_path);
      } catch (fileError) {
        logger.warn(`Failed to delete file ${document.file_path}:`, fileError);
      }

      // Delete chunks
      await this.deleteDocumentChunks(documentId);

      // Delete document record
      await supabaseService.delete('documents', documentId);

      logger.info(`Document deleted: ${documentId}`, { userId });
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new FileProcessingError('Failed to delete document');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > appConfig.upload.maxFileSize) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${appConfig.upload.maxFileSize} bytes`
      );
    }

    // Check file type
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    if (!appConfig.upload.allowedTypes.includes(fileExtension)) {
      throw new ValidationError(
        `File type not allowed. Allowed types: ${appConfig.upload.allowedTypes.join(', ')}`
      );
    }

    // Check if file has content
    if (file.size === 0) {
      throw new ValidationError('File is empty');
    }
  }

  private async extractTextContent(filePath: string, mimeType: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);

      switch (mimeType) {
        case 'application/pdf':
          return await this.extractPdfText(buffer);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractDocxText(buffer);

        case 'text/plain':
        case 'text/markdown':
          return buffer.toString('utf-8');

        default:
          throw new FileProcessingError(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      logger.error(`Error extracting text from ${filePath}:`, error);
      throw new FileProcessingError('Failed to extract text content');
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting PDF text:', error);
      throw new FileProcessingError('Failed to extract text from PDF');
    }
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Error extracting DOCX text:', error);
      throw new FileProcessingError('Failed to extract text from DOCX');
    }
  }

  private generateChunks(content: string): string[] {
    return openaiService.constructor.chunkText(content, {
      maxChunkSize: 1000,
      overlap: 100,
      splitOn: ['\n\n', '\n', '. ', '! ', '? ', ' '],
    });
  }

  private async generateEmbeddings(
    chunks: string[],
    documentId: string
  ): Promise<CreateEntity<DocumentChunk>[]> {
    try {
      const embeddings = await openaiService.generateBatchEmbeddings(chunks);

      return embeddings.map((embedding, index) => ({
        document_id: documentId,
        content: embedding.text,
        chunk_index: index,
        token_count: embedding.token_count,
        embedding: embedding.embedding,
        metadata: {
          original_length: embedding.text.length,
          processed_at: new Date().toISOString(),
        },
      }));
    } catch (error) {
      logger.error('Error generating embeddings for chunks:', error);
      throw new FileProcessingError('Failed to generate embeddings');
    }
  }

  private async deleteDocumentChunks(documentId: string): Promise<void> {
    try {
      // Get all chunks for the document
      const chunks = await supabaseService.findMany<DocumentChunk>('document_chunks', {
        filters: { document_id: documentId },
      });

      // Delete all chunks
      for (const chunk of chunks) {
        await supabaseService.delete('document_chunks', chunk.id);
      }

      logger.info(`Deleted ${chunks.length} chunks for document ${documentId}`);
    } catch (error) {
      logger.error(`Error deleting chunks for document ${documentId}:`, error);
      throw new FileProcessingError('Failed to delete document chunks');
    }
  }

  public async getDocumentChunks(
    documentId: string,
    userId: string
  ): Promise<DocumentChunk[]> {
    try {
      // Verify user owns the document
      const document = await supabaseService.findById<Document>('documents', documentId);

      if (!document || document.user_id !== userId) {
        throw new ValidationError('Document not found or unauthorized');
      }

      return await supabaseService.findMany<DocumentChunk>('document_chunks', {
        filters: { document_id: documentId },
        orderBy: { column: 'chunk_index', ascending: true },
      });
    } catch (error) {
      logger.error(`Error getting chunks for document ${documentId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new FileProcessingError('Failed to retrieve document chunks');
    }
  }

  public async reprocessDocument(documentId: string, userId: string): Promise<Document> {
    try {
      const document = await supabaseService.findById<Document>('documents', documentId);

      if (!document || document.user_id !== userId) {
        throw new ValidationError('Document not found or unauthorized');
      }

      // Delete existing chunks
      await this.deleteDocumentChunks(documentId);

      // Reset document status
      await supabaseService.update<Document>('documents', documentId, {
        status: DocumentStatus.UPLOADED,
        processing_error: null,
        text_content: null,
        chunk_count: null,
      });

      // Reprocess the document
      return await this.processDocument(documentId);
    } catch (error) {
      logger.error(`Error reprocessing document ${documentId}:`, error);

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new FileProcessingError('Failed to reprocess document');
    }
  }
}

export default DocumentService.getInstance();