import app from '../backend/app.js';

export default async (req, res) => {
  // Ensure the app handles the request correctly
  return app(req, res);
};
