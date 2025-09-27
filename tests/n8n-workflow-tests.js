/**
 * N8N Workflow Test Scripts
 * Bu dosya N8N workflow'larını test etmek için hazırlanmış test senaryolarını içerir.
 */

// Test Configuration
const TEST_CONFIG = {
  n8nBaseUrl: 'https://your-n8n-instance.com',
  testCustomerId: 'test-customer-001',
  testWidgetId: 'test-widget-001',
  testCompanyName: 'Test Company Ltd.',
  testBotName: 'TestBot'
};

// Utility Functions
function makeRequest(url, data, method = 'POST') {
  return fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
}

function logTestResult(testName, success, response, duration) {
  console.log(`\\n🧪 TEST: ${testName}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`${success ? '✅' : '❌'} Result: ${success ? 'PASS' : 'FAIL'}`);
  if (!success) {
    console.log(`❌ Error:`, response);
  } else {
    console.log(`✅ Response:`, JSON.stringify(response, null, 2));
  }
  console.log('─'.repeat(50));
}

// Test Scenarios

/**
 * Test 1: Basic Chat Greeting
 * Basit selamlama mesajı testi
 */
async function testBasicChatGreeting() {
  const startTime = Date.now();
  const testData = {
    chatInput: 'Merhaba',
    sessionId: 'test-session-001',
    metadata: {
      customerId: TEST_CONFIG.testCustomerId,
      widgetId: TEST_CONFIG.testWidgetId,
      companyName: TEST_CONFIG.testCompanyName,
      botName: TEST_CONFIG.testBotName,
      locale: 'tr',
      customerName: 'Ahmet Yılmaz',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await makeRequest(
      `${TEST_CONFIG.n8nBaseUrl}/webhook/chat/${TEST_CONFIG.testWidgetId}`,
      testData
    );

    const result = await response.json();
    const duration = Date.now() - startTime;

    const success = response.ok &&
                   result.output &&
                   result.output.includes('Merhaba') &&
                   result.followUpPrompts &&
                   Array.isArray(result.followUpPrompts);

    logTestResult('Basic Chat Greeting', success, result, duration);
    return { success, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('Basic Chat Greeting', false, error.message, duration);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Test 2: Information Query with Context
 * Bilgi sorgusu ve context arama testi
 */
async function testInformationQuery() {
  const startTime = Date.now();
  const testData = {
    chatInput: 'Çalışma saatleriniz nedir?',
    sessionId: 'test-session-002',
    metadata: {
      customerId: TEST_CONFIG.testCustomerId,
      widgetId: TEST_CONFIG.testWidgetId,
      companyName: TEST_CONFIG.testCompanyName,
      locale: 'tr',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await makeRequest(
      `${TEST_CONFIG.n8nBaseUrl}/webhook/chat/${TEST_CONFIG.testWidgetId}`,
      testData
    );

    const result = await response.json();
    const duration = Date.now() - startTime;

    const success = response.ok &&
                   result.output &&
                   result.metadata &&
                   typeof result.metadata.hasContext === 'boolean';

    logTestResult('Information Query with Context', success, result, duration);
    return { success, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('Information Query with Context', false, error.message, duration);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Test 3: Complex Problem Solving
 * Karmaşık problem çözme testi
 */
async function testComplexProblemSolving() {
  const startTime = Date.now();
  const testData = {
    chatInput: 'Siparişim kayboldu ve para iadesi almak istiyorum. Ne yapmalıyım?',
    sessionId: 'test-session-003',
    metadata: {
      customerId: TEST_CONFIG.testCustomerId,
      widgetId: TEST_CONFIG.testWidgetId,
      companyName: TEST_CONFIG.testCompanyName,
      locale: 'tr',
      userRole: 'customer',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await makeRequest(
      `${TEST_CONFIG.n8nBaseUrl}/webhook/chat/${TEST_CONFIG.testWidgetId}`,
      testData
    );

    const result = await response.json();
    const duration = Date.now() - startTime;

    const success = response.ok &&
                   result.output &&
                   result.followUpPrompts &&
                   result.followUpPrompts.length >= 2;

    logTestResult('Complex Problem Solving', success, result, duration);
    return { success, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('Complex Problem Solving', false, error.message, duration);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Test 4: English Language Support
 * İngilizce dil desteği testi
 */
async function testEnglishLanguageSupport() {
  const startTime = Date.now();
  const testData = {
    chatInput: 'What are your business hours?',
    sessionId: 'test-session-004',
    metadata: {
      customerId: TEST_CONFIG.testCustomerId,
      widgetId: TEST_CONFIG.testWidgetId,
      companyName: TEST_CONFIG.testCompanyName,
      locale: 'en',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await makeRequest(
      `${TEST_CONFIG.n8nBaseUrl}/webhook/chat/${TEST_CONFIG.testWidgetId}`,
      testData
    );

    const result = await response.json();
    const duration = Date.now() - startTime;

    const success = response.ok &&
                   result.output &&
                   result.metadata &&
                   result.metadata.locale === 'en';

    logTestResult('English Language Support', success, result, duration);
    return { success, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('English Language Support', false, error.message, duration);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Test 5: Document Processing
 * Döküman işleme workflow testi
 */
async function testDocumentProcessing() {
  const startTime = Date.now();
  const testData = {
    documentId: 'test-doc-001',
    filePath: 'documents/test-customer/test-document.pdf',
    customerId: TEST_CONFIG.testCustomerId,
    widgetId: TEST_CONFIG.testWidgetId,
    filename: 'test-document.pdf',
    fileType: 'application/pdf',
    fileSize: 1024000,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await makeRequest(
      `${TEST_CONFIG.n8nBaseUrl}/webhook/document-processing`,
      testData
    );

    const result = await response.json();
    const duration = Date.now() - startTime;

    const success = response.ok &&
                   (result.success || result.status === 'processing');

    logTestResult('Document Processing', success, result, duration);
    return { success, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('Document Processing', false, error.message, duration);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Test 6: Error Handling
 * Hata yönetimi testi
 */
async function testErrorHandling() {
  const startTime = Date.now();
  const testData = {
    chatInput: 'Test message',
    sessionId: 'test-session-error',
    metadata: {
      customerId: '', // Boş customer ID - hata tetikler
      widgetId: TEST_CONFIG.testWidgetId,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const response = await makeRequest(
      `${TEST_CONFIG.n8nBaseUrl}/webhook/chat/${TEST_CONFIG.testWidgetId}`,
      testData
    );

    const result = await response.json();
    const duration = Date.now() - startTime;

    // Hata durumunda graceful response bekliyoruz
    const success = result.output &&
                   result.output.includes('teknik') ||
                   result.output.includes('sorun');

    logTestResult('Error Handling', success, result, duration);
    return { success, result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTestResult('Error Handling', false, error.message, duration);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Performance Test: Multiple Concurrent Requests
 * Performans testi: Aynı anda birden fazla istek
 */
async function testPerformanceConcurrency() {
  console.log('\\n🚀 PERFORMANCE TEST: Concurrent Requests');
  const startTime = Date.now();

  const requests = [];
  const concurrentCount = 5;

  for (let i = 0; i < concurrentCount; i++) {
    const testData = {
      chatInput: `Test message ${i + 1}`,
      sessionId: `test-session-perf-${i}`,
      metadata: {
        customerId: TEST_CONFIG.testCustomerId,
        widgetId: TEST_CONFIG.testWidgetId,
        companyName: TEST_CONFIG.testCompanyName,
        locale: 'tr',
        timestamp: new Date().toISOString()
      }
    };

    requests.push(
      makeRequest(
        `${TEST_CONFIG.n8nBaseUrl}/webhook/chat/${TEST_CONFIG.testWidgetId}`,
        testData
      )
    );
  }

  try {
    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(r => r.json()));
    const duration = Date.now() - startTime;

    const successCount = results.filter(r => r.output).length;
    const success = successCount === concurrentCount;

    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`⏱️  Average per request: ${Math.round(duration / concurrentCount)}ms`);
    console.log(`${success ? '✅' : '❌'} Success Rate: ${successCount}/${concurrentCount}`);

    return { success, successCount, totalCount: concurrentCount, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Performance test failed: ${error.message}`);
    return { success: false, error: error.message, duration };
  }
}

/**
 * Main Test Runner
 * Ana test çalıştırıcı
 */
async function runAllTests() {
  console.log('🎯 N8N WORKFLOW TEST SUITE STARTING');
  console.log('=' .repeat(50));

  const results = [];

  // Sıralı testler
  results.push(await testBasicChatGreeting());
  results.push(await testInformationQuery());
  results.push(await testComplexProblemSolving());
  results.push(await testEnglishLanguageSupport());
  results.push(await testDocumentProcessing());
  results.push(await testErrorHandling());

  // Performans testi
  results.push(await testPerformanceConcurrency());

  // Test özeti
  console.log('\\n📊 TEST SUMMARY');
  console.log('=' .repeat(50));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const averageDuration = Math.round(
    results.reduce((sum, r) => sum + r.duration, 0) / totalCount
  );

  console.log(`✅ Passed: ${successCount}/${totalCount} tests`);
  console.log(`⏱️  Average Duration: ${averageDuration}ms`);
  console.log(`📈 Success Rate: ${Math.round((successCount / totalCount) * 100)}%`);

  if (successCount === totalCount) {
    console.log('\\n🎉 ALL TESTS PASSED! Workflow is ready for production.');
  } else {
    console.log('\\n⚠️  Some tests failed. Please check the workflow configuration.');
  }

  return {
    successCount,
    totalCount,
    successRate: (successCount / totalCount) * 100,
    averageDuration,
    results
  };
}

// Browser'da çalıştırmak için
if (typeof window !== 'undefined') {
  window.N8NWorkflowTests = {
    runAllTests,
    testBasicChatGreeting,
    testInformationQuery,
    testComplexProblemSolving,
    testEnglishLanguageSupport,
    testDocumentProcessing,
    testErrorHandling,
    testPerformanceConcurrency,
    TEST_CONFIG
  };
}

// Node.js'de çalıştırmak için
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testBasicChatGreeting,
    testInformationQuery,
    testComplexProblemSolving,
    testEnglishLanguageSupport,
    testDocumentProcessing,
    testErrorHandling,
    testPerformanceConcurrency,
    TEST_CONFIG
  };
}

// Direkt çalıştırma
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}