# 🎬 Chat Overlay - Multi-Platform Stream Chat

Overlay de chat transparente y personalizable para streams, con soporte para **YouTube** (via Streamer.bot) y **TikTok Live**. Perfecto para OBS, Streamlabs y otros software de streaming.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey)

## ✨ Características

### 🎨 **Visual**
- Overlay transparente completamente personalizable
- Emoticonos de YouTube integrados
- Highlight de primer mensaje de cada usuario
- Animaciones suaves de entrada
- Estilos especiales para SuperChats, Donations y Gifts
- Identificación visual por plataforma (▶️ YouTube, 🎵 TikTok)

### 🔧 **Funcional**
- **Multi-plataforma**: YouTube + TikTok simultáneamente
- Sistema de cooldown para evitar spam
- Detección automática de spam
- Filtros avanzados (ocultar joins, likes, etc.)
- Sonidos personalizables por tipo de evento
- Recarga de configuración en caliente (sin reiniciar)
- 100% portable (no requiere instalación)

### ⚙️ **Configuración**
- Archivo JSON externo fácil de editar
- Atajos de teclado para control rápido
- Posición y tamaño guardados automáticamente
- Usuarios bloqueados y silenciados
- Control de volumen por tipo de evento

---

## 📦 Instalación

### **Opción 1: Usar el ejecutable (Recomendado)**

1. Descarga el `.exe` desde [Releases](../../releases)
2. Descomprime en cualquier carpeta
3. Ejecuta `ChatOverlay.exe`
4. ¡Listo! El archivo `config.json` se creará automáticamente

### **Opción 2: Desde código fuente**

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/chat-overlay.git
cd chat-overlay

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Compilar ejecutable
npm run build
```

---

## 🎮 Atajos de Teclado

| Atajo | Función |
|-------|---------|
| `Ctrl + T` | Toggle modo transparente/sólido |
| `Ctrl + O` | Abrir carpeta de configuración |
| `Ctrl + R` | Recargar configuración |
| `Ctrl + K` | Activar/Desactivar TikTok |
| `Ctrl + P` | Forzar ventana siempre visible |
| `Ctrl + ↑↓←→` | Mover ventana (20px por paso) |

---

## ⚙️ Configuración

El archivo `config.json` se crea automáticamente en la carpeta del ejecutable. Puedes editarlo con cualquier editor de texto.

### **Configuración Básica**

```json
{
  "window": {
    "width": 500,
    "height": 900,
    "alwaysOnTop": true,
    "transparent": true
  },
  "chat": {
    "direction": "topToBottom",
    "maxMessages": 100,
    "autoRemove": true,
    "removeAfter": 30,
    "websocketUrl": "ws://127.0.0.1:8080/",
    "emoteSize": 28
  }
}
```

### **Opciones Disponibles**

#### 🪟 **Window (Ventana)**
- `width`, `height` - Tamaño de la ventana
- `x`, `y` - Posición inicial
- `transparent` - Ventana transparente
- `alwaysOnTop` - Siempre visible sobre otras ventanas

#### 💬 **Chat**
- `direction` - `"topToBottom"` (nuevos arriba) o `"bottomToTop"` (nuevos abajo)
- `maxMessages` - Máximo de mensajes en pantalla
- `autoRemove` - Eliminar mensajes automáticamente
- `removeAfter` - Segundos antes de eliminar
- `msgVolume` - Volumen del sonido (0.0 - 1.0)
- `emoteSize` - Tamaño de emoticonos en píxeles
- `websocketUrl` - URL de Streamer.bot (YouTube)
- `logging` - Mostrar logs de debug en consola

#### 🎵 **TikTok**
```json
"tiktok": {
  "enabled": false,
  "username": "tu_usuario"
}
```

#### 🚫 **Filtros**
```json
"filters": {
  "showJoins": false,      // Mostrar "se unió"
  "showLikes": false,      // Mostrar likes
  "showShares": true,      // Mostrar shares
  "showFollows": true,     // Mostrar follows
  "showGifts": true,       // Mostrar regalos
  "showChats": true,       // Mostrar mensajes
  "minDiamondsToShow": 0   // Diamantes mínimos para mostrar gift
}
```

#### ⏱️ **Cooldown (Anti-Spam)**
```json
"cooldown": {
  "enabled": true,
  "joinCooldown": 5000,          // ms entre "se unió"
  "joinGroupWindow": 10000,      // Agrupar joins en ventana de tiempo
  "spamDetection": {
    "enabled": true,
    "maxMessagesPerUser": 5,     // Máx mensajes por usuario
    "timeWindow": 10000          // En X milisegundos
  }
}
```

#### 🔊 **Sonidos**
```json
"sounds": {
  "chat": { "enabled": true, "volume": 0.7 },
  "gift": { "enabled": true, "volume": 1.0 },
  "superchat": { "enabled": true, "volume": 1.0 }
}
```

#### 🚫 **Usuarios Bloqueados/Silenciados**
```json
"blockedUsers": ["Bot1", "Spammer"],  // No se muestran
"mutedUsers": ["Usuario1"]            // Se muestran sin sonido
```

---

## 🔌 Configuración de Streamer.bot (YouTube)

1. Abre **Streamer.bot**
2. Ve a **Servers/Clients** → **WebSocket Server**
3. Activa el servidor en el puerto `8080`
4. La URL por defecto es `ws://127.0.0.1:8080/`

Si usas otro puerto, actualiza `websocketUrl` en `config.json`.

---

## 🎵 Configuración de TikTok Live

1. Edita `config.json`:
```json
"tiktok": {
  "enabled": true,
  "username": "tu_usuario_tiktok"
}
```
2. Presiona `Ctrl+R` para recargar
3. O presiona `Ctrl+K` para activar/desactivar al vuelo

**Nota:** El usuario debe estar en VIVO para conectarse.

---

## 🎨 Uso en OBS/Streamlabs

### **Método 1: Captura de Ventana**
1. Abre OBS
2. Agregar fuente → **Captura de Ventana**
3. Selecciona `ChatOverlay.exe`
4. Activa: "Permitir transparencia"

### **Método 2: Captura de Pantalla (Específica)**
1. Posiciona el overlay donde quieras
2. Agregar fuente → **Captura de Pantalla**
3. Recorta solo el área del chat

---

## 📊 Eventos Soportados

### YouTube (via Streamer.bot)
- ✅ Mensajes de chat
- ✅ SuperChats
- ✅ Donaciones
- ✅ Emoticonos/Emotes

### TikTok Live
- ✅ Mensajes de chat
- ✅ Regalos (Gifts) con contador de diamantes
- ✅ Follows
- ✅ Shares
- ✅ Likes (solo si >10)
- ✅ Nuevos viewers

---

## 🛠️ Solución de Problemas

### **La ventana no se ve siempre encima**
- Presiona `Ctrl+P` para forzar alwaysOnTop
- Verifica que `"alwaysOnTop": true` en config.json

### **No se conecta a YouTube**
- Verifica que Streamer.bot esté ejecutándose
- Confirma que el WebSocket Server esté activo en puerto 8080
- Revisa la URL en `websocketUrl`

### **No se conecta a TikTok**
- El usuario debe estar EN VIVO
- Verifica que `"enabled": true`
- Revisa el username (sin @)
- Presiona `Ctrl+K` para reintentar

### **Los emoticonos no se ven**
- Verifica que Streamer.bot esté enviando los emotes
- Ajusta `emoteSize` en config.json si son muy grandes/pequeños

### **Se pierde la configuración**
- La configuración se guarda en la misma carpeta del .exe
- No muevas solo el .exe, mueve toda la carpeta

---

## 🔄 Actualizar Configuración Sin Reiniciar

1. Presiona `Ctrl+O` para abrir la carpeta
2. Edita `config.json`
3. Guarda los cambios
4. Presiona `Ctrl+R` en la app
5. ¡Cambios aplicados!

**Nota:** Algunos cambios (como la URL de WebSocket) requieren reiniciar las conexiones.

---

## 📝 Dependencias

- [Electron](https://www.electronjs.org/) - Framework de aplicación
- [Streamer.bot](https://streamer.bot/) - Para YouTube
- [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector) - Para TikTok

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

## 💡 Roadmap

- [ ] Soporte para Twitch
- [ ] Panel de configuración visual (GUI)
- [ ] Temas/skins predefinidos
- [ ] TTS (Text-to-Speech)
- [ ] Estadísticas de stream
- [ ] Comandos de chat personalizados
- [ ] Exportar historial de chat

---

## 🙏 Créditos

- Desarrollado por [Tu Nombre]
- Basado en [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector)
- Integración con [Streamer.bot](https://streamer.bot/)

---

## 📧 Contacto

- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Discord: tu-discord
- Email: tu@email.com

---

<div align="center">

**⭐ Si te gusta este proyecto, dale una estrella en GitHub ⭐**

</div>