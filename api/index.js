const path = require('path');

// We use an async function to wrap the Express app
module.exports = async (req, res) => {
  try {
    // We use a dynamic import that is shielded from some static analysis
    const backendPath = path.resolve(__dirname, '../backend/app.js');
    const { default: app } = await import(backendPath);
    
    // Express app is a function (req, res) => { ... }
    return app(req, res);
  } catch (err) {
    console.error('SERVERLESS BRIDGE ERROR:', err);
    res.status(500).json({ 
      error: 'Failed to load backend', 
      message: err.message,
      stack: err.stack 
    });
  }
};
