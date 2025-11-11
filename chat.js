const fs = require('fs');
const path = require('path');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

let ws = null;
let tiktokConnection = null;
let tiktokReconnectAttempts = 0;
const MAX_TIKTOK_RECONNECT_ATTEMPTS = 10; // Attempts before increasing reconection delay 

// ====================== CONFIG ======================
let config = {
  direction: "topToBottom",
  autoRemove: true,
  removeAfter: 30,
  maxMessages: 100,
  blockedUsers: ["Nightbot", "NarioBot"],
  mutedUsers: ["NarioBot"],
  hideCommands: false,
  logging: false,
  msgVolume: 0.7,
  reconnectDelay: 5000,
  websocketUrl: "ws://127.0.0.1:8080/",
  emoteSize: 28,
  tiktok: {
    enabled: true,
    username: "narioshorts"
  },
  statistics: {
    enabled: true,
    position: "top-right",
    showViewers: true,
    showLikes: true,
    showDiamonds: true,
    showMessages: true
  },
  filters: {
    showJoins: false,
    showLikes: false,
    showShares: true,
    showFollows: true,
    showGifts: true,
    showChats: true,
    minDiamondsToShow: 0
  },
  sounds: {
    chat: {
      enabled: true,
      volume: 0.7
    },
    gift: {
      enabled: true,
      volume: 1.0,
      file: "message.wav"
    },
    superchat: {
      enabled: true,
      volume: 1.0,
      file: "message.wav"
    }
  }
};

// Try to read the external config.json
try {
  const raw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8');
  const externalConfig = JSON.parse(raw);
  config = { ...config, ...externalConfig.chat };
} catch (e) {
  console.warn("⚠️ Couldn't read config.json, using default values.", e);
}

// ====================== VARIABLES ======================
const chat = document.getElementById("chat");
const statusEl = document.getElementById("status");
const msgSound = document.getElementById("msgSound");
const userColors = {};
const seenUsers = new Set();

// System Cooldown
const cooldownTrackers = {
  joins: { lastShown: 0, pending: [] },
  likes: { lastShown: 0, pending: [] },
  userMessages: new Map()
};

// Conditional Login
function log(...args) {
  if (config.logging) {
    console.log(...args);
  }
}

function logWarn(...args) {
  if (config.logging) {
    console.warn(...args);
  }
}

function logError(...args) {
  // Errors always show
  console.error(...args);
}

// Check if the audio file exists
if (msgSound) {
  msgSound.volume = config.msgVolume;
  msgSound.addEventListener('error', () => {
    console.warn("⚠️ Couldn't load message.wav");
  });
}

// Direction of chat flow
chat.style.flexDirection = config.direction === "bottomToTop" ? "column-reverse" : "column";

// Put the status in the opposite side of the messages
// topToBottom = new messages ABOVE → status BOTTOM
// bottomToTop = new messaages BOTTOM → status ABOVE
if (config.direction === "topToBottom") {
  statusEl.style.top = "auto";
  statusEl.style.bottom = "8px";
} else {
  statusEl.style.top = "8px";
  statusEl.style.bottom = "auto";
}

// ====================== FUNCTIONS ======================
function setStatus(text, visible = true, timeout = null) {
  statusEl.textContent = text;
  if (visible) statusEl.classList.add('visible');
  else statusEl.classList.remove('visible');
  if (timeout) setTimeout(() => statusEl.classList.remove('visible'), timeout);
}

// ====================== COOLDOWN SYSTEM ======================
function canShowJoin() {
  if (!config.cooldown || !config.cooldown.enabled) return true;
  
  const now = Date.now();
  const timeSinceLastShown = now - cooldownTrackers.joins.lastShown;
  
  if (timeSinceLastShown >= config.cooldown.joinCooldown) {
    cooldownTrackers.joins.lastShown = now;
    return true;
  }
  return false;
}

function addPendingJoin(username) {
  if (!config.cooldown || !config.cooldown.enabled) return;
  
  cooldownTrackers.joins.pending.push({
    username,
    timestamp: Date.now()
  });
  
  // Group if there is enough pending
  if (cooldownTrackers.joins.pending.length >= 3) {
    flushPendingJoins();
  }
}

function flushPendingJoins() {
  if (cooldownTrackers.joins.pending.length === 0) return;
  
  const now = Date.now();
  const recentJoins = cooldownTrackers.joins.pending.filter(
    j => now - j.timestamp < config.cooldown.joinGroupWindow
  );
  
  if (recentJoins.length > 0) {
    const names = recentJoins.map(j => j.username).join(', ');
    const count = recentJoins.length;
    const message = count === 1 
      ? `${names} joined the stream! 👋`
      : `${count} users joined: ${names} 👋`;
    
    addMessageDirect({
      display: "System",
      name: "System"
    }, message, "normal", null, "youtube");
  }
  
  cooldownTrackers.joins.pending = [];
}

function canShowLike() {
  if (!config.cooldown || !config.cooldown.enabled) return true;
  
  const now = Date.now();
  const timeSinceLastShown = now - cooldownTrackers.likes.lastShown;
  
  if (timeSinceLastShown >= config.cooldown.likeCooldown) {
    cooldownTrackers.likes.lastShown = now;
    return true;
  }
  return false;
}

function checkUserSpam(username) {
  if (!config.cooldown || !config.cooldown.spamDetection || !config.cooldown.spamDetection.enabled) {
    return false; // If deactivated, there's no spam
  }
  
  const now = Date.now();
  const userKey = username.toLowerCase();
  
  if (!cooldownTrackers.userMessages.has(userKey)) {
    cooldownTrackers.userMessages.set(userKey, []);
  }
  
  const userMsgs = cooldownTrackers.userMessages.get(userKey);
  
  // Clear old messages
  const recentMsgs = userMsgs.filter(
    timestamp => now - timestamp < config.cooldown.spamDetection.timeWindow
  );
  
  // Add last message
  recentMsgs.push(now);
  cooldownTrackers.userMessages.set(userKey, recentMsgs);
  
  // Detect if its spam
  if (recentMsgs.length > config.cooldown.spamDetection.maxMessagesPerUser) {
    return true; // its spam
  }
  
  return false;
}

function getUserColor(user) {
  if (!userColors[user]) {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 20) + 80;
    const lightness = Math.floor(Math.random() * 15) + 50;
    userColors[user] = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  return userColors[user];
}

function getUserTag(userData, platform = "youtube") {
  const tags = [];
  
  // Platform Icon
  if (platform === "tiktok") {
    tags.push("🎵"); // TikTok Icon
  } else if (platform === "youtube") {
    tags.push("▶️"); // YouTube Icon
  }
  
  // User Badges
  if (userData.isOwner) tags.push("👑");
  if (userData.isModerator) tags.push("🛡️");
  if (userData.isVerified) tags.push("✅");
  if (userData.isSponsor) tags.push("⭐");
  
  return tags.length > 0 ? ` <span class="tag">${tags.join("")}</span>` : "";
}

// Sanitize XSS: escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Process YouTube emotes
function processEmotes(text, emotes) {
  if (!emotes || emotes.length === 0) {
    return escapeHtml(text);
  }

  const segments = [];
  let lastIndex = 0;

  const sortedEmotes = [...emotes].sort((a, b) => a.startIndex - b.startIndex);

  sortedEmotes.forEach(emote => {
    if (emote.startIndex !== undefined && emote.endIndex !== undefined) {
      // Add text before the emote
      if (emote.startIndex > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, emote.startIndex)
        });
      }

      // Add the emote
      segments.push({
        type: 'emote',
        imageUrl: emote.imageUrl,
        name: emote.name || ''
      });

      // Update Index
      lastIndex = emote.endIndex + 1;
    }
  });

  // Add remaining text agter the last emote
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  // Build final HTML
  let result = '';
  segments.forEach(segment => {
    if (segment.type === 'text') {
      result += escapeHtml(segment.content);
    } else if (segment.type === 'emote' && segment.imageUrl) {
      result += `<img src="${escapeHtml(segment.imageUrl)}" 
                      alt="${escapeHtml(segment.name)}" 
                      class="emote" 
                      style="height: ${config.emoteSize}px; vertical-align: middle; margin: 0 2px;">`;
    }
  });

  return result;
}

function addMessage(userData, text, eventType = "normal", emotes = null, platform = "youtube") {
  const user = userData.display || userData.name || userData.uniqueId || "Unknown";
  const userKey = user.toLowerCase();

  if (config.blockedUsers.includes(user)) return;
  if (config.hideCommands && text.startsWith("!")) return;

  // Detect spam
  if (eventType === "normal" && checkUserSpam(user)) {
    logWarn(`⚠️ Spam detected from ${user}`);
    return;
  }

  addMessageDirect(userData, text, eventType, emotes, platform);
}

function addMessageDirect(userData, text, eventType = "normal", emotes = null, platform = "youtube") {
  const user = userData.display || userData.name || userData.uniqueId || "Unknown";
  const userKey = user.toLowerCase();

  const div = document.createElement("div");
  div.className = "msg";
  
  // Add platform class
  if (platform === "tiktok") {
    div.classList.add("tiktok-msg");
  }

  const tagHtml = getUserTag(userData, platform);

  // Detect user's first message
  let isFirstMessage = false;
  if (!seenUsers.has(userKey)) {
    div.classList.add("first-message");
    seenUsers.add(userKey);
    isFirstMessage = true;
  }

  // Special events
  if (eventType === "superchat") div.classList.add("superchat");
  else if (eventType === "donation") div.classList.add("donation");
  else if (eventType === "gift") div.classList.add("gift");

  // Sanitize text and process emotes
  const sanitizedUser = escapeHtml(user);
  const processedText = processEmotes(text, emotes);
  
  div.innerHTML = `<span class="user" style="color:${getUserColor(user)}">${sanitizedUser}</span>${tagHtml}: ${processedText}`;

  // Color user first message
  if (isFirstMessage) {
    div.querySelector(".user").style.color = "gold";
  }

  // Insert menssage depending on the direction
  if (config.direction === "bottomToTop") {
    chat.prepend(div);
  } else {
    chat.insertBefore(div, chat.firstChild);
  }

  // Replay sound depending on the event
  let soundConfig = config.sounds?.chat;
  if (eventType === "gift" && config.sounds?.gift) {
    soundConfig = config.sounds.gift;
  } else if (eventType === "superchat" && config.sounds?.superchat) {
    soundConfig = config.sounds.superchat;
  }

  if (soundConfig && soundConfig.enabled && !config.mutedUsers.includes(user) && msgSound) {
    msgSound.volume = soundConfig.volume || 0.7;
    msgSound.currentTime = 0;
    msgSound.play().catch(() => {});
  }

  // Limit the number of messages
  while (chat.children.length > config.maxMessages) {
    const messageToRemove = chat.lastChild;
    if (messageToRemove) {
      messageToRemove.remove();
    }
  }

  // Auto delete messages
  if (config.autoRemove) {
    setTimeout(() => {
      div.style.opacity = "0";
      setTimeout(() => {
        if (div.parentNode) {
          div.remove();
        }
      }, 500);
    }, config.removeAfter * 1000);
  }
}

// ====================== TIKTOK CONNECTION ======================
function parseTikTokUser(data) {
  const nickname = data?.user?.nickname || data?.user?.uniqueId || "Unknown";
  const uniqueId = data?.user?.uniqueId || nickname;
  
  return {
    uniqueId,
    name: nickname,
    display: nickname,
    profilePicture: data?.user?.profilePicture?.url?.[0] || null,
    isModerator: data?.user?.isModerator || false,
    isVerified: data?.user?.verified || false,
    isOwner: data?.user?.isOwner || false
  };
}

async function connectTikTok() {
  if (!config.tiktok || !config.tiktok.enabled) {
    log("⏭️ TikTok disabled in config");
    return;
  }

  // if (isConnectingTikTok) {
  //   console.log("⏳ There's already a TikTok connection, ignoring...");
  //   return;
  // }

  isConnectingTikTok = true;
  log("✅ TikTok is ENABLED, trying to connect...");

  try {
    setStatus("Connecting to TikTok...", true);

    // Close the last connection if it exists
    if (tiktokConnection) {
      console.log("⚠️ Closing last connection...");
      try {
        tiktokConnection.removeAllListeners();
        tiktokConnection.disconnect();
      } catch (e) {
        console.warn("Error trying to clean last connection:", e);
      }
      tiktokConnection = null;
    }

    const tiktokOptions = {
      processInitialData: true,
      enableExtendedGiftInfo: true,
      fetchRoomInfoOnConnect: true
    };

    tiktokConnection = new TikTokLiveConnection(config.tiktok.username, tiktokOptions);

    // Error management
    tiktokConnection.on("error", err => {
      console.error("❌ TikTok error:", err);
    });

    // Main Connection
    tiktokConnection.connect().then(state => {
      console.log(`✅ Connected to TikTok Live (roomId: ${state.roomId})`);
      setStatus("TikTok Connected! 🎵", true, 2000);
      tiktokReconnectAttempts = 0;
    }).catch(err => {
      console.error("❌ Error connecting with TikTok:", err);
      handleTikTokReconnect(err);
    });

    // ========== Events ==========

    // tiktokClient.on('raw', (event) => {
    //     console.log('RAW EVENT:', event);
    // });


    // 🗨️ Chat
    if (config.filters.showChats) {
      tiktokConnection.on('chat', data => {
        const nickname = data?.user?.nickname || data?.user?.uniqueId || "Unknown";
        const uniqueId = data?.user?.uniqueId || nickname;

        const userData = {
          uniqueId: data?.user?.uniqueId || "unknown",
          name: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          display: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          profilePicture: data?.user?.profilePicture?.url?.[0] || null,
          isModerator: data?.user?.isModerator || false,
          isVerified: data?.user?.verified || false,
          isOwner: data?.user?.isOwner || false
        };

        addMessage(userData, data.comment, "normal", null, "tiktok");
      });
    }

    // 🎁 Gifts
    if (config.filters.showGifts) {
      tiktokConnection.on('gift', data => {
        // console.log("GIFT RAW DATA:", data); // <--- Check everything that comes

        // Don't show partial gifts
        if (data.giftType === 1 && !data.repeatEnd) return;

        // User Data
        const userData = {
          uniqueId: data?.user?.uniqueId || "unknown",
          name: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          display: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          profilePicture: data?.user?.profilePicture?.url?.[0] || null,
          isModerator: data?.user?.isModerator || false,
          isVerified: data?.user?.verified || false,
          isOwner: data?.user?.isOwner || false
        };

        // Real gift name
        const giftName = data?.giftDetails?.giftName 
                      || data?.extendedGiftInfo?.name 
                      || `Gift ID: ${data?.giftId || "?"}`;

        const repeatCount = data.repeatCount || 1;
        const diamonds = data.diamondCount || data?.giftDetails?.diamondCount || 0;

        // Filtro por cantidad mínima de diamantes
        if (diamonds < (config.filters.minDiamondsToShow || 0)) return;

        // Texto a mostrar
        const giftText = repeatCount > 1 
          ? `envió ${repeatCount}x ${giftName} 🎁` 
          : `envió ${giftName} 🎁`;

        addMessage(userData, giftText, "gift", null, "tiktok");
      });
    }


    // 🔁 Compartir stream
    if (config.filters.showShares) {
      tiktokConnection.on('share', data => {
        const userData = {
          uniqueId: data?.user?.uniqueId || "unknown",
          name: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          display: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          profilePicture: data?.user?.profilePicture?.url?.[0] || null,
          isModerator: data?.user?.isModerator || false,
          isVerified: data?.user?.verified || false,
          isOwner: data?.user?.isOwner || false
        };
        addMessage(userData, "compartió el stream! 📱", "normal", null, "tiktok");
      });
    }

    // ❤️ Follow
    if (config.filters.showFollows) {
      tiktokConnection.on('follow', data => {
        const nickname = data?.user?.nickname || data?.user?.uniqueId || "Unknown";
        const uniqueId = data?.user?.uniqueId || nickname;

        const userData = {
          uniqueId: data?.user?.uniqueId || "unknown",
          name: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          display: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          profilePicture: data?.user?.profilePicture?.url?.[0] || null,
          isModerator: data?.user?.isModerator || false,
          isVerified: data?.user?.verified || false,
          isOwner: data?.user?.isOwner || false
        };

        addMessage(userData, "está siguiendo! ❤️", "normal", null, "tiktok");
      });
    }



    // 👍 Likes
    if (config.filters.showLikes) {
      tiktokConnection.on('like', data => {
        const userData = {
          uniqueId: data?.user?.uniqueId || "unknown",
          name: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          display: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          profilePicture: data?.user?.profilePicture?.url?.[0] || null,
          isModerator: data?.user?.isModerator || false,
          isVerified: data?.user?.verified || false,
          isOwner: data?.user?.isOwner || false
        };

        const likeCount = data.likeCount || 1;
        if (likeCount > 10) {
          addMessage(userData, `envió ${likeCount} likes! 👍`, "normal", null, "tiktok");
        }
      });
    }

    // 👋 Nuevo miembro
    if (config.filters.showJoins) {
      tiktokConnection.on('member', data => {
        const userData = {
          uniqueId: data?.user?.uniqueId || "unknown",
          name: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          display: data?.user?.nickname || data?.user?.uniqueId || "unknown",
          profilePicture: data?.user?.profilePicture?.url?.[0] || null,
          isModerator: data?.user?.isModerator || false,
          isVerified: data?.user?.verified || false,
          isOwner: data?.user?.isOwner || false
        };
        addMessage(userData, "se unió al stream! 👋", "normal", null, "tiktok");
      });
    }

    // 🔴 Stream terminado
    tiktokConnection.on("streamEnd", () => {
      console.log("🔴 El stream de TikTok ha terminado");
      setStatus("TikTok: Stream terminado", true, 3000);
      tiktokReconnectAttempts = 0;
      console.log("🔄 Esperando 60s antes de reintentar...");
      setTimeout(connectTikTok, 60000);
    });

    // 🔌 Desconexión inesperada
    tiktokConnection.on("disconnected", () => {
      console.warn("🔌 TikTok desconectado inesperadamente. Reintentando...");
      setStatus("Reconectando TikTok...", true);
      setTimeout(connectTikTok, config.reconnectDelay);
    });

  } catch (err) {
    console.error("❌ Error al inicializar TikTok:", err);
    handleTikTokReconnect(err);
  } finally {
    isConnectingTikTok = false;
  }
}

// Helper: reconexión con lógica progresiva
function handleTikTokReconnect(err) {
  tiktokReconnectAttempts++;
  let reconnectDelay;

  if (tiktokReconnectAttempts <= MAX_TIKTOK_RECONNECT_ATTEMPTS) reconnectDelay = 10000;
  else if (tiktokReconnectAttempts <= MAX_TIKTOK_RECONNECT_ATTEMPTS * 2) reconnectDelay = 30000;
  else reconnectDelay = 60000;

  const msg = err?.message?.includes("LIVE has ended")
    ? "TikTok: Usuario no en vivo"
    : err?.message?.includes("Unable to retrieve room")
    ? "TikTok: Sala no disponible"
    : "Error TikTok";

  setStatus(msg, true, 3000);
  console.log(`🔄 Reintentando conexión TikTok en ${reconnectDelay / 1000}s...`);
  setTimeout(connectTikTok, reconnectDelay);
}

// ====================== YOUTUBE WEBSOCKET ======================
function connectWebSocket() {
  setStatus("Conectando YouTube...", true);

  try {
    ws = new WebSocket(config.websocketUrl);

    ws.onopen = () => {
      log("✅ Conectado al chat de YouTube (Streamer.bot)");
      setStatus("YouTube Conectado! ▶️", true, 2000);

      ws.send(JSON.stringify({
        request: "Subscribe",
        id: "sub1",
        events: {
          YouTube: ["Message", "SuperChat", "SuperSticker", "NewSponsor"]
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (msg.id === "sub1" || msg.request === "Hello") return;

        if (msg.data && msg.data.user) {
          const text = msg.data.message || msg.data.rawInput || "";
          const emotes = msg.data.emotes || null;
          
          let type = "normal";
          if (msg.data.triggerCategory === "YouTube/SuperChat") type = "superchat";
          if (msg.data.triggerCategory === "YouTube/Donation") type = "donation";
          
          addMessage(msg.data.user, text, type, emotes, "youtube");
        }
      } catch (err) {
        logWarn("⚠️ Error al parsear mensaje de YouTube", err);
      }
    };

    ws.onclose = () => {
      logWarn(`🔌 YouTube desconectado. Reintentando en ${config.reconnectDelay / 1000}s`);
      setStatus("Reconectando YouTube...", true);
      setTimeout(connectWebSocket, config.reconnectDelay);
    };

    ws.onerror = (err) => {
      logError("❌ Error WebSocket YouTube:", err);
      ws.close();
    };
  } catch (err) {
    logError("❌ No se pudo conectar a YouTube:", err);
    setTimeout(connectWebSocket, config.reconnectDelay);
  }
}

// Función para cambiar modo transparente
window.showModeChange = function(isTransparent) {
  setStatus(isTransparent ? "Modo Transparente 👻" : "Modo Sólido 🎨", true, 2000);
};

// Función para toggle de TikTok
window.toggleTikTok = function() {
  config.tiktok.enabled = !config.tiktok.enabled;
  
  if (config.tiktok.enabled) {
    setStatus("TikTok Habilitado 🎵", true, 2000);
    log("🎵 TikTok habilitado, iniciando conexión...");
    connectTikTok();
  } else {
    setStatus("TikTok Deshabilitado 🚫", true, 2000);
    log("⏭️ TikTok deshabilitado");
    
    // Desconectar si está conectado
    if (tiktokConnection) {
      console.log("⚠️ Cerrando conexión anterior de TikTok...");
      try {
        tiktokConnection.disconnect();
      } catch (e) {
        console.warn("Error al desconectar anterior conexión TikTok:", e);
      }
      tiktokConnection = null;
    }
  }
  
  // Guardar el cambio en config.json
  try {
    let configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const fullConfig = JSON.parse(raw);
      fullConfig.chat.tiktok.enabled = config.tiktok.enabled;
      fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2), 'utf-8');
      log("💾 Config guardado");
    }
  } catch (e) {
    logWarn("⚠️ No se pudo guardar el cambio en config.json:", e.message);
  }
};

// Exponer función de recarga al window
// window.reloadConfig = reloadConfig;

// Limpiar joins pendientes cada cierto tiempo
setInterval(() => {
  flushPendingJoins();
}, config.cooldown?.joinGroupWindow || 10000);

// ====================== INICIAR CONEXIONES ======================
connectWebSocket();

if (config.tiktok && config.tiktok.enabled) {
  log('🎵 Iniciando conexión a TikTok...');
  connectTikTok();
} else {
  log('⏭️ TikTok deshabilitado en configuración');
}