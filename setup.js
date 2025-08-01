#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Interview Registration App...\n');

// Check if Node.js is installed
try {
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js v14 or higher.');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  execSync('npm install', { cwd: './server', stdio: 'inherit' });
  console.log('✅ Backend dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Create .env file for server
const envPath = path.join(__dirname, 'server', '.env');
const envContent = `PORT=5000
MONGODB_URI=mongodb://localhost:27017/interview-app
NODE_ENV=development
`;

if (!fs.existsSync(envPath)) {
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file for server');
  } catch (error) {
    console.error('❌ Failed to create .env file');
  }
} else {
  console.log('ℹ️  .env file already exists');
}

// Create uploads directory
const uploadsPath = path.join(__dirname, 'server', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('✅ Created uploads directory');
  } catch (error) {
    console.error('❌ Failed to create uploads directory');
  }
} else {
  console.log('ℹ️  Uploads directory already exists');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Start MongoDB (local or Atlas)');
console.log('2. Update server/.env with your MongoDB connection string');
console.log('3. Start the backend: cd server && npm start');
console.log('4. Start the frontend: npm start');
console.log('5. Open http://localhost:3000 in your browser');
console.log('\n📚 For detailed instructions, see README.md'); 