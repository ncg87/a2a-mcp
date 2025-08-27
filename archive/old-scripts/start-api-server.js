/**
 * API Server Startup Script
 */

import APIServer from './src/api/server.js';
import logger from './src/utils/logger.js';

async function startServer() {
  console.log('🚀 Starting API Server...');
  
  const server = new APIServer({
    port: process.env.API_PORT || 3001,
    corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002']
  });
  
  try {
    await server.start();
    console.log(`✅ API Server running on http://localhost:${server.config.port}`);
    console.log(`   WebSocket available on same port`);
    console.log(`   CORS enabled for ${server.config.corsOrigin}`);
    console.log('   Press Ctrl+C to stop');
    
    // Keep the process alive
    process.stdin.resume();
    
    // Graceful shutdown handlers
    const shutdown = async () => {
      console.log('\n🛑 Shutting down server gracefully...');
      try {
        await server.stop();
        console.log('✅ Server stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping server:', error);
      }
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();