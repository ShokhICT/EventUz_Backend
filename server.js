const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Simple Test API
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Eventuz backend API is working perfectly!',
    timestamp: new Date()
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Eventuz API is running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
});
