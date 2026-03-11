const path = require('path');

module.exports = async (req, res) => {
  try {
    // eval() prevents the Vercel bundler from seeing the import() and trying to turn it into require()
    // We use path.resolve to get the absolute path
    // Using a relative path string literal inside eval is often more reliable on Vercel
    const { default: app } = await eval('import("../backend/app.js")');
    
    return app(req, res);
  } catch (err) {
    console.error('VERCEL BRIDGE CRITICAL ERROR:', err);
    res.status(500).json({ 
      error: 'Serverless Bridge Failure',
      details: err.message,
      path: path.resolve(__dirname, '../backend/app.js')
    });
  }
};
