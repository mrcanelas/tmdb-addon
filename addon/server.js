const addon = require('./index.js')
const PORT = process.env.PORT || 1337;

// Tratamento global de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Não encerra o processo, apenas loga o erro
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Não encerra o processo imediatamente, permite que o servidor continue
  // mas loga o erro para debug
});

addon.listen(PORT, function () {
  console.log(`Addon active on port ${PORT}.`);
  console.log(`http://127.0.0.1:${PORT}/`);
});