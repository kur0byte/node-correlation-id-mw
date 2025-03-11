const { server } = require('./server');

try {
  console.log('Starting server initialization...');
  const serverInstance = server();
  console.log('Server initialization completed');

  // Add proper shutdown handling
  process.on('SIGINT', () => {
      console.log('Shutting down server...');
      serverInstance.close(() => {
          console.log('Server shut down successfully');
          process.exit(0);
      });
  });
} catch (error) {
  console.error('Failed to initialize server:', error);
  process.exit(1);
}