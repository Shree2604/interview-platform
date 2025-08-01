#!/usr/bin/env node

const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true); // Port is available
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // Port is in use
    });
  });
}

async function main() {
  console.log('🔍 Checking port availability...\n');
  
  const port3000 = await checkPort(3000);
  const port5000 = await checkPort(5000);
  
  console.log(`Port 3000 (Frontend): ${port3000 ? '✅ Available' : '❌ In Use'}`);
  console.log(`Port 5000 (Backend):  ${port5000 ? '✅ Available' : '❌ In Use'}`);
  
  console.log('\n📋 Starting Instructions:');
  console.log('1. Start Backend:  npm run server:dev');
  console.log('2. Start Frontend: npm start');
  console.log('3. Or start both:  npm run dev');
  
  console.log('\n🌐 Access URLs:');
  console.log('Frontend: http://localhost:3000');
  console.log('Backend:  http://localhost:5000');
  console.log('Health:   http://localhost:5000/api/health');
  
  if (!port3000 || !port5000) {
    console.log('\n⚠️  Warning: Some ports are already in use!');
    console.log('Please stop any existing services on these ports.');
  } else {
    console.log('\n✅ All ports are available! Ready to start.');
  }
}

main().catch(console.error); 