const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
let configPath;

// Obtener ruta del config en la carpeta del ejecutable (portable)
function getConfigPath() {
  // En desarrollo usa __dirname, en producción usa la carpeta del .exe
  const exePath = app.isPackaged ? path.dirname(app.getPath('exe')) : __dirname;
  return path.join(exePath, 'config.json');
}

// Crear config por defecto si no existe
function ensureConfigExists() {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      window: {
        width: 500,
        height: 900,
        x: 300,
        y: 120,
        transparent: true,
        frame: false,
        alwaysOnTop: true
      },
      chat: {
        direction: "topToBottom",
        autoRemove: true,
        removeAfter: 30,
        maxMessages: 100,
        msgVolume: 0.7,
        reconnectDelay: 5000,
        websocketUrl: "ws://127.0.0.1:8080/",
        emoteSize: 28,
        blockedUsers: ["Nightbot", "Nariobot"],
        mutedUsers: [],
        hideCommands: false,
        logging: false,
        tiktok: {
          enabled: false,
          username: "narioshorts"
        },
        cooldown: {
          enabled: true,
          joinCooldown: 5000,
          joinGroupWindow: 10000,
          likeCooldown: 3000,
          likeGroupWindow: 5000,
          spamDetection: {
            enabled: true,
            maxMessagesPerUser: 5,
            timeWindow: 10000,
            action: "group"
          }
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
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log(`✅ Config creado en: ${configPath}`);
  }
  
  return configPath;
}

function createWindow() {
  configPath = ensureConfigExists();
  
  let config = {
    window: {
      width: 500,
      height: 900,
      x: 300,
      y: 120,
      transparent: true,
      frame: false,
      alwaysOnTop: true
    },
    chat: {}
  };

  // Leer la configuración
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const externalConfig = JSON.parse(raw);
    config = { ...config, ...externalConfig };
    console.log(`📁 Config cargado desde: ${configPath}`);
  } catch (err) {
    console.warn("⚠️ No se pudo leer config.json, usando valores por defecto.", err);
  }

  // Crear ventana con los valores del config.json
  win = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    x: config.window.x,
    y: config.window.y,
    transparent: config.window.transparent,
    frame: config.window.frame,
    alwaysOnTop: config.window.alwaysOnTop,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Cargar el chat.html
  win.loadFile(path.join(__dirname, 'chat.html'));

  // Estado inicial: modo transparente con click-through
  let isTransparent = true;
  win.setIgnoreMouseEvents(true);

  // Guardar posición al mover la ventana
  win.on('move', saveWindowBounds);
  win.on('resize', saveWindowBounds);

  // Registrar atajos
  registerMoveShortcuts(isTransparent);
}

// Función para guardar posición y tamaño de la ventana
function saveWindowBounds() {
  if (!win || !configPath) return;

  try {
    const bounds = win.getBounds();
    
    // Leer config actual
    let config = {};
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(raw);
    } catch (e) {
      config = { window: {}, chat: {} };
    }

    // Actualizar solo las coordenadas de la ventana
    config.window = {
      ...config.window,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };

    // Guardar
    fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => {
      if (err) console.warn("⚠️ No se pudo guardar la posición:", err);
    });
  } catch (err) {
    console.warn("⚠️ Error al guardar bounds:", err);
  }
}

// ====================== ATAJOS PARA MOVER LA VENTANA ======================
function registerMoveShortcuts(initialTransparentState) {
  const step = 20;
  let isTransparent = initialTransparentState !== undefined ? initialTransparentState : true;

  // Arriba
  globalShortcut.register('CommandOrControl+Up', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setPosition(bounds.x, bounds.y - step);
    }
  });

  // Abajo
  globalShortcut.register('CommandOrControl+Down', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setPosition(bounds.x, bounds.y + step);
    }
  });

  // Izquierda
  globalShortcut.register('CommandOrControl+Left', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setPosition(bounds.x - step, bounds.y);
    }
  });

  // Derecha
  globalShortcut.register('CommandOrControl+Right', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setPosition(bounds.x + step, bounds.y);
    }
  });

  // Toggle transparencia con Ctrl+T
  globalShortcut.register('CommandOrControl+T', () => {
    if (win) {
      isTransparent = !isTransparent;

      if (isTransparent) {
        win.setIgnoreMouseEvents(true);
        win.webContents.executeJavaScript(`
          document.body.style.backgroundColor = 'transparent';
          if (typeof showModeChange === 'function') showModeChange(true);
        `);
      } else {
        win.setIgnoreMouseEvents(false);
        win.webContents.executeJavaScript(`
          document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          if (typeof showModeChange === 'function') showModeChange(false);
        `);
      }
    }
  });

  // Abrir carpeta de configuración con Ctrl+O
  globalShortcut.register('CommandOrControl+O', () => {
    const { shell } = require('electron');
    const configDir = path.dirname(configPath);
    shell.openPath(configDir);
    
    // Mostrar notificación
    if (win) {
      win.webContents.executeJavaScript(`
        if (typeof showModeChange === 'function') {
          const tempFunc = window.showModeChange;
          window.showModeChange = null;
          setTimeout(() => {
            if (document.getElementById('status')) {
              document.getElementById('status').textContent = 'Carpeta de config abierta 📁';
              document.getElementById('status').classList.add('visible');
              setTimeout(() => document.getElementById('status').classList.remove('visible'), 2000);
            }
            window.showModeChange = tempFunc;
          }, 100);
        }
      `);
    }
  });

  // Recargar configuración con Ctrl+R
  globalShortcut.register('CommandOrControl+R', () => {
    if (win) {
      win.webContents.executeJavaScript(`
        if (typeof reloadConfig === 'function') reloadConfig();
      `);
    }
  });

  // Toggle TikTok con Ctrl+K
  globalShortcut.register('CommandOrControl+K', () => {
    if (win) {
      win.webContents.executeJavaScript(`
        if (typeof toggleTikTok === 'function') toggleTikTok();
      `);
    }
  });
}

// ==========================================================================
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir al cerrar todas las ventanas
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Limpiar atajos al salir
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});