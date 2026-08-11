// Temizlenmiş N8N Workflow Yükleme Scripti
const fs = require('fs');
const path = require('path');

console.log('📤 Temizlenmiş N8N Workflow Yükleme Scripti\n');

const API_KEY = process.env.N8N_API_KEY;
const N8N_API_URL = 'https://n8n.botfusions.com';

// Öncelikli workflow'lar
const priorityWorkflows = [
  {
    file: 'customer-embeding-chat-workflow.json',
    name: 'Customer Embedding RAG Chat',
    description: 'Ana chat sistemi - customer_embeding tablosu kullanır',
    priority: 1
  },
  {
    file: 'corrected-chat-rag-workflow.json',
    name: 'RAG Chat Main Workflow',
    description: 'Düzeltilmiş ana chat workflow',
    priority: 2
  },
  {
    file: 'document-processing-workflow.json',
    name: 'Document Processing',
    description: 'Doküman yükleme ve işleme sistemi',
    priority: 3
  },
  {
    file: 'supabase-only-chat-workflow.json',
    name: 'Supabase Only Chat',
    description: 'Basit chat sistemi (backend API olmadan)',
    priority: 4
  }
];

function cleanWorkflowForImport(workflow) {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      executionOrder: "v1",
      saveManualExecutions: true
    },
    staticData: workflow.staticData || {}
  };
}

async function uploadWorkflow(workflowInfo) {
  console.log(`\n📤 ${workflowInfo.name} yükleniyor...`);
  console.log(`   📝 ${workflowInfo.description}`);

  const filePath = path.join('./docs/n8n-workflows', workflowInfo.file);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dosya bulunamadı: ${filePath}`);
    }

    const rawWorkflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const cleanWorkflow = cleanWorkflowForImport(rawWorkflow);

    console.log(`  📋 Workflow: ${cleanWorkflow.name}`);
    console.log(`  🔧 Node Sayısı: ${cleanWorkflow.nodes.length}`);

    // Webhook node'ları tespit et
    const webhookNodes = cleanWorkflow.nodes.filter(node =>
      node.type === 'n8n-nodes-base.webhook' ||
      node.type === 'n8n-nodes-langchain.chatTrigger'
    );

    if (webhookNodes.length > 0) {
      console.log(`  🌐 Webhook Node'ları: ${webhookNodes.length} adet`);
    }

    // N8N API'ye workflow yükle
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanWorkflow)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`  ✅ Başarıyla yüklendi (ID: ${result.id})`);

      // Webhook URL'sini göster
      if (webhookNodes.length > 0) {
        console.log(`  🌐 Webhook URL: ${N8N_API_URL}/webhook/${result.id}`);
      }

      // Workflow'u aktif hale getir (eğer webhook varsa)
      if (webhookNodes.length > 0) {
        await activateWorkflow(result.id, cleanWorkflow.name);
      }

      return {
        success: true,
        workflowId: result.id,
        webhookUrl: webhookNodes.length > 0 ? `${N8N_API_URL}/webhook/${result.id}` : null,
        data: result
      };

    } else {
      const errorText = await response.text();
      console.log(`  ❌ Yükleme hatası: ${response.status} ${response.statusText}`);

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          console.log(`  📝 Detay: ${errorJson.message}`);
        }
      } catch (e) {
        console.log(`  📝 Detay: ${errorText.substring(0, 200)}...`);
      }

      return { success: false, error: `${response.status} ${response.statusText}` };
    }

  } catch (error) {
    console.log(`  ❌ Yükleme hatası: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function activateWorkflow(workflowId, workflowName) {
  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log(`  🟢 ${workflowName} aktif hale getirildi`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`  ⚠️ Aktivasyon hatası: ${response.status}`);
      console.log(`  📝 Aktivasyon detayı: ${errorText.substring(0, 100)}`);
      return false;
    }

  } catch (error) {
    console.log(`  ⚠️ Aktivasyon hatası: ${error.message}`);
    return false;
  }
}

// Ana işlem
async function main() {
  console.log('🚀 Temizlenmiş N8N Workflow Yükleme İşlemi\n');

  const results = {
    uploadedWorkflows: [],
    errors: [],
    webhookUrls: []
  };

  for (const workflowInfo of priorityWorkflows) {
    console.log(`\n🔄 Öncelik ${workflowInfo.priority}: ${workflowInfo.name}`);

    const uploadResult = await uploadWorkflow(workflowInfo);

    if (uploadResult.success) {
      results.uploadedWorkflows.push({
        ...workflowInfo,
        workflowId: uploadResult.workflowId,
        webhookUrl: uploadResult.webhookUrl,
        success: true
      });

      if (uploadResult.webhookUrl) {
        results.webhookUrls.push({
          name: workflowInfo.name,
          url: uploadResult.webhookUrl,
          id: uploadResult.workflowId
        });
      }

    } else {
      results.uploadedWorkflows.push({
        ...workflowInfo,
        success: false,
        error: uploadResult.error
      });
      results.errors.push(`${workflowInfo.name}: ${uploadResult.error}`);
    }

    // Rate limiting için kısa bekleme
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sonuç raporu
  console.log('\n📊 YÜKLEME SONUÇ RAPORU');
  console.log('=======================');
  console.log(`Yüklenen Workflow: ${results.uploadedWorkflows.filter(w => w.success).length}/${priorityWorkflows.length}`);
  console.log(`Aktif Webhook: ${results.webhookUrls.length}`);
  console.log(`Toplam Hata: ${results.errors.length}`);

  if (results.uploadedWorkflows.filter(w => w.success).length > 0) {
    console.log('\n✅ Başarıyla Yüklenen Workflow\'lar:');
    results.uploadedWorkflows.filter(w => w.success).forEach(w => {
      console.log(`  • ${w.name} (ID: ${w.workflowId})`);
      if (w.webhookUrl) {
        console.log(`    🌐 Webhook: ${w.webhookUrl}`);
      }
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Hatalar:');
    results.errors.forEach(error => console.log(`  • ${error}`));
  }

  // Sonuçları dosyaya kaydet
  fs.writeFileSync('./clean-workflow-upload-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Detaylı rapor: clean-workflow-upload-results.json');

  return results;
}

// Script'i çalıştır
main()
  .then((results) => {
    const successCount = results.uploadedWorkflows.filter(w => w.success).length;
    if (successCount > 0) {
      console.log('\n🎉 Workflow yükleme başarılı!');
      console.log(`📊 ${successCount}/${priorityWorkflows.length} workflow yüklendi`);
      console.log(`🌐 ${results.webhookUrls.length} webhook aktif`);
      process.exit(0);
    } else {
      console.log('\n⚠️ Yüklemede sorunlar var');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Kritik hata:', error);
    process.exit(1);
  });