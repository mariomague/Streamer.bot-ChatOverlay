# 🎥 Streamer.bot and Tiktok Live Chat Overlay (Electron App)

A lightweight **Electron-based desktop app** that connects to Streamer.bot and TikTok Live and displays real-time chat messages, gifts, likes, shares, and follows — perfect for people that multistream and want to see all the chats in the same place (and also only have one display).

---

## 🚀 Features

- 🔗 Connects to Streamer.bot locally ( Twitch, YouTube, Trovo and Kick chats are handled this way )
- 🔗 Connects directly to any TikTok live stream using the username.
- 💬 Displays real-time chat messages.
- 🎁 Shows gifts with proper names and counts.
- ❤️ Displays likes, follows, and shares (optional filters). 
- ⚙️ Electron front-end for desktop with automatic reconnection.

---

## 📦 Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/tiktok-live-overlay.git
cd tiktok-live-overlay
npm install
```

### ⚙️ Configuration
All settings are stored in the config.json file.
Example configuration:

```json
{
  "window": {
    "width": 500,
    "height": 900,
    "x": 300,
    "y": 120,
    "transparent": true,
    "frame": false,
    "alwaysOnTop": true
  },
  "chat": {
    "direction": "topToBottom",
    "autoRemove": true,
    "removeAfter": 50,
    "maxMessages": 900,
    "msgVolume": 0.7,
    "reconnectDelay": 5000,
    "websocketUrl": "ws://127.0.0.1:8080/",
    "emoteSize": 28,
    "blockedUsers": [
      "Nightbot",
      "StreamElements"
    ],
    "mutedUsers": [
      "Nightbot",
      "narioshorts"
    ],
    "hideCommands": true,
    "logging": false,
    "tiktok": {
      "enabled": false,
      "username": "YOUR_TIKTOK_USERNAME"
    },
    "cooldown": {
      "enabled": true,
      "joinCooldown": 5000,
      "joinGroupWindow": 10000,
      "likeCooldown": 3000,
      "likeGroupWindow": 5000,
      "spamDetection": {
        "enabled": true,
        "maxMessagesPerUser": 5,
        "timeWindow": 10000,
        "action": "group"
      }
    },
    "filters": {
      "showJoins": false,
      "showLikes": false,
      "showShares": true,
      "showFollows": true,
      "showGifts": true,
      "showChats": true,
      "minDiamondsToShow": 0
    },
    "sounds": {
      "chat": {
        "enabled": true,
        "volume": 0.7
      },
      "gift": {
        "enabled": true,
        "volume": 1,
        "file": "message.wav"
      },
      "superchat": {
        "enabled": true,
        "volume": 1,
        "file": "message.wav"
      }
    }
  }
}
```


### ▶️ Running in Development

---

## 🧰 Installation Notes

This repository does **not** include the Electron binaries or compiled builds you have to run npm install to get them.

To run the project locally:

```bash
git clone https://github.com/mariomague/Streamer.bot-ChatOverlay.git
cd Streamer.bot-ChatOverlay
npm install
npm start

```

This will start the Electron app in development mode.
You’ll see logs in the console if it's enabled in the config.json.

### 🏗️ Building for Distribution
To package the app into an executable:

``` bash
npm run build
```

Depending on your platform, this will create:

dist/*.exe on Windows

dist/*.AppImage on Linux

dist/*.dmg on macOS

🔍 Logs and Debugging
Check the console (Ctrl+Shift+I) to view debug logs.

If you see "Failed to retrieve Room ID from main page", it means the app is falling back to the API (normal behavior).

Use console.log() calls inside chat.js to inspect raw TikTok event data.

## 🧠 Known Issues

YouTube Superchats and Gifts may not render properly.

TikTok "Connecting" popup will show when Tiktok is disabled. Pressing Ctrl + k will disable this.

The app may randomly update the config.json with a simpler version without all the settings.

Some configs seem to be overriding inside the app.

Duplicate messages may occur if the connection isn’t properly closed before reconnecting to TikTok.

Some rare gifts may show as Gift ID: #### if TikTok doesn’t provide metadata.

The Electron security warning (Insecure Content-Security-Policy) is normal during development and disappears once the app is packaged.


💡 Example Outputs:

Without Background:
[Overlay without a background](nobackgroundpic.png)

With Background:
[Overlay with a background](withbackgroundpic.png)
