import config from '../config/config.js';

console.log('=== BACKEND CONFIGURATION ===');
console.log('PORT:', config.port);
console.log('CLIENT_URL:', config.clientURL);
console.log('MONGO_URI:', config.mongoURI);
console.log('JWT_SECRET:', config.jwtSecret ? '✅ Configured' : '❌ Missing');
console.log('===========================');

process.exit(0);

