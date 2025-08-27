/**
 * Test script for API Server
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3001';

async function testAPIServer() {
  console.log('🧪 Testing API Server...\n');
  
  try {
    // Test health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed:', health.data);
    
    // Test starting a conversation
    console.log('\n2️⃣ Starting new conversation...');
    const startResponse = await axios.post(`${API_URL}/api/conversation/start`, {
      // Don't include objective to avoid starting autonomous conversation
      // objective: 'Test conversation for API validation',
      // complexity: 5,
      // iterations: 3
    });
    console.log('✅ Conversation started:', startResponse.data);
    
    const conversationId = startResponse.data.conversationId;
    
    // Test getting conversation state
    console.log('\n3️⃣ Getting conversation state...');
    const stateResponse = await axios.get(`${API_URL}/api/conversation/${conversationId}/state`);
    console.log('✅ State retrieved:', {
      conversationId: stateResponse.data.conversationId,
      agents: stateResponse.data.state?.agents?.length || 0,
      uptime: stateResponse.data.uptime
    });
    
    // Test analytics endpoint
    console.log('\n4️⃣ Testing analytics dashboard...');
    const analyticsResponse = await axios.get(`${API_URL}/api/analytics/dashboard`);
    console.log('✅ Analytics retrieved:', {
      activeConversations: analyticsResponse.data.conversations?.active,
      cacheHitRate: analyticsResponse.data.cache?.hitRate
    });
    
    // Test cache stats
    console.log('\n5️⃣ Testing cache statistics...');
    const cacheResponse = await axios.get(`${API_URL}/api/cache/stats`);
    console.log('✅ Cache stats:', cacheResponse.data.stats);
    
    // Test WebSocket connection
    console.log('\n6️⃣ Testing WebSocket connection...');
    const socket = io(API_URL);
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected, ID:', socket.id);
        
        // Subscribe to conversation
        socket.emit('subscribe:conversation', conversationId);
        console.log('   Subscribed to conversation:', conversationId);
        
        // Request metrics
        socket.emit('request:metrics');
        
        socket.on('metrics:update', (metrics) => {
          console.log('   Received metrics update:', metrics);
          socket.disconnect();
          resolve();
        });
        
        setTimeout(() => {
          socket.disconnect();
          resolve();
        }, 2000);
      });
      
      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection failed:', error.message);
        reject(error);
      });
    });
    
    // Stop the test conversation
    console.log('\n7️⃣ Stopping conversation...');
    const stopResponse = await axios.post(`${API_URL}/api/conversation/${conversationId}/stop`);
    console.log('✅ Conversation stopped:', stopResponse.data);
    
    console.log('\n✅ All API tests passed!');
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAPIServer().then(() => {
  console.log('\n🎉 API Server is fully functional!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});