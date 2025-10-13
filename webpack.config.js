const path = require('path');

module.exports = {
  devServer: {
    allowedHosts: 'all',  // This fixes the allowedHosts warning
    host: 'localhost',
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
};