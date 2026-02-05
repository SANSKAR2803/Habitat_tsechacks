#!/usr/bin/env node

/**
 * Quick Setup Script for Habitat Platform
 * Run: node quick-setup.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🌳 Habitat Adaptive Reforestation Platform - Quick Setup\n');
console.log('This script will help you create your .env file.\n');

const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('\n✅ Setup cancelled. Your existing .env file is safe.\n');
      rl.close();
      return;
    }
    startSetup();
  });
} else {
  startSetup();
}

function startSetup() {
  console.log('\n📝 Let\'s set up your API keys...\n');
  console.log('Press Enter to skip optional keys (app will use mock data)\n');

  const config = {};

  askQuestion('OpenAI API Key (REQUIRED): ', (value) => {
    config.OPENAI_API_KEY = value || '';
    
    askQuestion('OpenWeather API Key (optional): ', (value) => {
      config.OPENWEATHER_API_KEY = value || '';
      
      askQuestion('Sentinel Hub Client ID (optional): ', (value) => {
        config.SENTINELHUB_CLIENT_ID = value || '';
        
        askQuestion('Sentinel Hub Client Secret (optional): ', (value) => {
          config.SENTINELHUB_CLIENT_SECRET = value || '';
          
          askQuestion('Global Forest Watch API Key (optional): ', (value) => {
            config.GFW_API_KEY = value || '';
            
            askQuestion('Mapbox Access Token (optional): ', (value) => {
              config.MAPBOX_ACCESS_TOKEN = value || '';
              
              // Create .env file
              createEnvFile(config);
            });
          });
        });
      });
    });
  });
}

function askQuestion(question, callback) {
  rl.question(question, (answer) => {
    callback(answer.trim());
  });
}

function createEnvFile(config) {
  let envContent = `# Habitat Adaptive Reforestation Platform
# Generated: ${new Date().toISOString()}

# ============================================
# REQUIRED - AI Chat
# ============================================
OPENAI_API_KEY=${config.OPENAI_API_KEY}

# ============================================
# OPTIONAL - Real-time Data APIs
# ============================================
`;

  if (config.OPENWEATHER_API_KEY) {
    envContent += `\n# OpenWeather API
OPENWEATHER_API_KEY=${config.OPENWEATHER_API_KEY}
NEXT_PUBLIC_OPENWEATHER_API_KEY=${config.OPENWEATHER_API_KEY}
`;
  }

  if (config.SENTINELHUB_CLIENT_ID && config.SENTINELHUB_CLIENT_SECRET) {
    envContent += `\n# Sentinel Hub
SENTINELHUB_CLIENT_ID=${config.SENTINELHUB_CLIENT_ID}
SENTINELHUB_CLIENT_SECRET=${config.SENTINELHUB_CLIENT_SECRET}
`;
  }

  if (config.GFW_API_KEY) {
    envContent += `\n# Global Forest Watch
GFW_API_KEY=${config.GFW_API_KEY}
`;
  }

  if (config.MAPBOX_ACCESS_TOKEN) {
    envContent += `\n# Mapbox
MAPBOX_ACCESS_TOKEN=${config.MAPBOX_ACCESS_TOKEN}
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=${config.MAPBOX_ACCESS_TOKEN}
`;
  }

  envContent += `\n# ============================================
# Performance & Security
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_DURATION=3600
PORT=3000
NODE_ENV=development
`;

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env file created successfully!\n');
  
  if (!config.OPENAI_API_KEY) {
    console.log('⚠️  WARNING: No OpenAI API key provided!');
    console.log('   The AI chat will not work without it.');
    console.log('   Get one from: https://platform.openai.com/api-keys\n');
  }

  console.log('📋 Summary:');
  console.log(`   - OpenAI API Key: ${config.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - OpenWeather API Key: ${config.OPENWEATHER_API_KEY ? '✅ Set' : '⚠️  Optional (using mock data)'}`);
  console.log(`   - Sentinel Hub: ${config.SENTINELHUB_CLIENT_ID ? '✅ Set' : '⚠️  Optional (using mock data)'}`);
  console.log(`   - GFW API Key: ${config.GFW_API_KEY ? '✅ Set' : '⚠️  Optional (using mock data)'}`);
  console.log(`   - Mapbox Token: ${config.MAPBOX_ACCESS_TOKEN ? '✅ Set' : '⚠️  Optional (using fallback)'}`);

  console.log('\n🚀 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Run: npm run dev');
  console.log('   3. Open: http://localhost:3000\n');

  rl.close();
}

rl.on('close', () => {
  process.exit(0);
});
