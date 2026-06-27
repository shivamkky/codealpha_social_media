const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🌐  Social Media Platform Running     ║
  ║   📍  http://localhost:${PORT}              ║
  ║   🚀  Press Ctrl+C to stop              ║
  ╚══════════════════════════════════════════╝
  `);
});
