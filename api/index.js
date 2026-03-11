// This is a CommonJS bridge to load the ESM backend in Vercel
module.exports = async (req, res) => {
  try {
    const { default: app } = await import('../backend/app.js');
    return app(req, res);
  } catch (err) {
    console.error('Bridge Error:', err);
    res.status(500).json({ error: 'Failed to load backend', details: err.message });
  }
};
