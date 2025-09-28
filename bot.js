const mineflayer = require("mineflayer");

const SERVER = process.env.MC_SERVERS?.split(",")[0] || "play.phoenixsmp.qzz.io:20722";
const [host, port] = SERVER.split(":");
const USERNAME = process.env.MC_USERNAME || "PhoenixBotSMP";
const AUTH = process.env.MC_AUTH || "offline";

let bot;
let afkInterval;
let chatInterval;
let retryCount = 0;
let realPlayersOnline = 0;

function timestamp() {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

// Safe wrapper for movement
function safeSetControl(state, value) {
  if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
  try {
    bot.setControlState(state, value);
  } catch (err) {
    console.log(`[${timestamp()}] ⚠️ setControlState error: ${err.message}`);
  }
}

// Safe wrapper for chat
function safeChat(msg) {
  if (!bot || !bot._client || bot._client.destroyed) return;
  try { bot.chat(msg); } catch {}
}

// Stop AFK movement
function stopAFK() {
  clearInterval(afkInterval);
  ["forward", "back", "left", "right", "jump", "sneak"].forEach(c => safeSetControl(c, false));
}

// Start AFK movement
function startAFK() {
  afkInterval = setInterval(() => {
    safeSetControl("forward", Math.random() < 0.7);
    safeSetControl("left", Math.random() < 0.5);
    safeSetControl("right", Math.random() < 0.5);
    safeSetControl("jump", Math.random() < 0.3);
    safeSetControl("sneak", Math.random() < 0.2);

    if (bot && bot.entity) {
      try { bot.look(Math.random() * 360, Math.random() * 180 - 90); } catch {}
    }
  }, 5000);
}

// Stop AFK chat
function stopAFKChat() { clearInterval(chatInterval); }

// Start AFK random chat
function startAFKChat() {
  const messages = [
    "Keeping the server alive!",
    "AFK but online 😎",
    "Hello everyone!",
    "I'm a bot 🤖",
    "Ping me if you need me!"
  ];
  chatInterval = setInterval(() => {
    const msg = messages[Math.floor(Math.random() * messages.length)];
    safeChat(msg);
  }, 10 * 60 * 1000);
}

// Create the bot
function createBot() {
  console.log(`[${timestamp()}] 🤖 Connecting to ${host}:${port || 25565} as ${USERNAME} (${AUTH})...`);

  bot = mineflayer.createBot({
    host,
    port: port ? parseInt(port) : 25565,
    username: USERNAME,
    auth: AUTH,
    version: false
  });

  // Decline resource packs
  bot.on("resourcePackSend", () => {
    if (bot && bot._client && !bot._client.destroyed) {
      try { bot.acceptResourcePack(false); } catch {}
      console.log(`[${timestamp()}] ⚠️ Resource pack requested, declining...`);
    }
  });

  // Bot successfully spawned
  bot.once("spawn", () => {
    console.log(`[${timestamp()}] ✅ Bot joined ${host}:${port || 25565}`);
    retryCount = 0;
    startAFK();
    startAFKChat();
  });

  // Chat responses
  bot.on("chat", (username, message) => {
    if (username === USERNAME) return;
    if (/hi bot/i.test(message)) safeChat(`Hello ${username}! 👋`);
    if (/afk\??/i.test(message)) safeChat("Yes, I'm keeping the server alive ⛏️");
    if (message === "!vanish on") safeChat("/vanish on");
    if (message === "!vanish off") safeChat("/vanish off");
    if (message === "!state") safeChat("✅ I am online and AFK.");
  });

  // Real player join/leave
  bot.on("playerJoined", (player) => {
    if (player.username !== USERNAME) {
      realPlayersOnline++;
      console.log(`[${timestamp()}] 👀 Real player joined: ${player.username}, enabling vanish`);
      safeChat("/vanish on");
    }
  });

  bot.on("playerLeft", (player) => {
    if (player.username !== USERNAME) {
      realPlayersOnline = Math.max(0, realPlayersOnline - 1);
      console.log(`[${timestamp()}] 👋 Player left: ${player.username}`);
      if (realPlayersOnline === 0) safeChat("/vanish off");
    }
  });

  // Network errors
  bot.on("error", (err) => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`);
    if (["ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
      console.log(`[${timestamp()}] 🔄 Network error, reconnecting...`);
      stopAFK();
      stopAFKChat();
      if (bot && bot._client && !bot._client.destroyed) bot.end();
      retryCount++;
      const delay = Math.min(120000, retryCount * 20000);
      setTimeout(createBot, delay);
    }
  });

  // Bot kicked
  bot.on("kicked", (reason) => {
    let msg;
    try { msg = typeof reason === "string" ? reason : JSON.stringify(reason); } catch { msg = "[unknown reason]"; }
    console.log(`[${timestamp()}] ⚠️ Kicked: ${msg}`);
    stopAFK();
    stopAFKChat();
    const delay = 20000;
    console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay / 1000}s...`);
    setTimeout(createBot, delay);
  });

  // Bot disconnected
  bot.on("end", () => {
    console.log(`[${timestamp()}] ❌ Bot disconnected`);
    stopAFK();
    stopAFKChat();
    retryCount++;
    const delay = Math.min(120000, retryCount * 20000);
    console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay / 1000}s...`);
    setTimeout(createBot, delay);
  });
}

// Start the bot
createBot();
