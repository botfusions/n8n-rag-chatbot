import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { documentId, filePath, customerId, widgetId } = await request.json();

    if (!documentId || !filePath || !customerId || !widgetId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Supabase client oluştur
    const supabase = createServerComponentClient({ cookies });

    // Dökümanın varlığını kontrol et
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('customer_id', customerId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // N8N webhook URL'ini oluştur
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N webhook URL not configured');
      return NextResponse.json(
        { error: 'N8N webhook URL not configured' },
        { status: 500 }
      );
    }

    // N8N workflow'unu tetikle
    const n8nResponse = await fetch(`${n8nWebhookUrl}/document-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId,
        filePath,
        customerId,
        widgetId,
        filename: document.filename,
        fileType: document.file_type,
        fileSize: document.file_size,
        timestamp: new Date().toISOString()
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('N8N workflow trigger failed:', errorText);

      // Döküman durumunu failed olarak güncelle
      await supabase
        .from('documents')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      return NextResponse.json(
        { error: 'Failed to trigger document processing workflow' },
        { status: 500 }
      );
    }

    // Döküman durumunu processing olarak güncelle
    await supabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    const n8nResult = await n8nResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Document processing workflow triggered successfully',
      workflowId: n8nResult.workflowId || 'unknown'
    });

  } catch (error) {
    console.error('Error triggering document processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}