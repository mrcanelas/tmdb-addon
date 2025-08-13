#!/usr/bin/env node

/**
 * Test script to verify proxy configuration
 * Usage: node test-proxy.js
 */

require('dotenv').config();
const { testProxy, PROXY_CONFIG } = require('./addon/utils/httpClient');

async function runTests() {
  console.log('🔍 Testing proxy configuration for TMDB Addon\n');
  
  // Show current configuration
  console.log('📋 Current configuration:');
  console.log(`   Enabled: ${PROXY_CONFIG.enabled}`);
  console.log(`   Host: ${PROXY_CONFIG.host}`);
  console.log(`   Port: ${PROXY_CONFIG.port}`);
  console.log(`   Protocol: ${PROXY_CONFIG.protocol}`);
  console.log(`   Authentication: ${PROXY_CONFIG.auth ? 'Yes' : 'No'}`);
  console.log('');
  
  if (!PROXY_CONFIG.enabled) {
    console.log('⚠️  Proxy is not enabled');
    console.log('   To enable, configure TMDB_PROXY_ENABLED=true');
    return;
  }
  
  // Test connection
  console.log('🧪 Testing proxy connection...');
  try {
    const isWorking = await testProxy();
    
    if (isWorking) {
      console.log('✅ Proxy working correctly!');
      console.log('   The addon should be able to access TMDB through the proxy.');
    } else {
      console.log('❌ Proxy is not working');
      console.log('   Check:');
      console.log('   - If the proxy is running');
      console.log('   - If the settings are correct');
      console.log('   - If the proxy supports HTTPS');
    }
  } catch (error) {
    console.log('❌ Error testing proxy:', error.message);
  }
  
  console.log('\n📖 For more information, see PROXY_SETUP.md');
}

// Run tests
runTests().catch(console.error); 