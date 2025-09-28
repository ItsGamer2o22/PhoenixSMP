// bot.js
const mineflayer = require("mineflayer");

const SERVER =
  process.env.MC_SERVERS?.split(",")[0] || "play.phoenixsmp.qzz.io:20722";
const [host, port] = SERVER.split(":");
const USERNAME = process.env.MC_USERNAME || "PhoenixSMPBot";
const AUTH = process.env.MC_AUTH || "offline";

let bot;
let afkInterval;
let chatInterval;
let retryCount = 0;
let realPlayersOnline = 0;

function timestamp() {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

function createBot() {
  console.log(
    `[${timestamp()}] 🤖 Connecting to ${host}:${port || 25565} as ${USERNAME} (${AUTH})...`
  );

  bot = mineflayer.createBot({
    host,
    port: port ? parseInt(port) : 25565,
    username: USERNAME,
    auth: AUTH,
    version: false,
  });

  bot.once("spawn", () => {
    console.log(`[${timestamp()}] ✅ Bot joined ${host}:${port || 25565}`);
    retryCount = 0;
    startAFK();
    startAFKChat();
  });

  // 🛑 Cancel resource pack requests
  bot.on("resourcePack", (url, hash) => {
    console.log(
      `[${timestamp()}] 🎒 Server sent resource pack (url=${url}, hash=${hash}). Declining...`
    );
    if (bot._client) {
      bot._client.write("resource_pack_receive", { result: "DECLINED" });
    }
  });

  bot.on("chat", (username, message) => {
    if (username === USERNAME) return;
    if (/hi bot/i.test(message)) bot.chat(`Hello ${username}! 👋`);
    if (/afk\??/i.test(message)) bot.chat(`Yes, I'm keeping the server alive ⛏️`);
    if (message === "!vanish on") safeChat("/vanish on");
    if (message === "!vanish off") safeChat("/vanish off");
    if (message === "!state") safeChat("✅ I am online and AFK.");
  });

  // Track real players
  bot.on("playerJoined", (player) => {
    if (player.username !== USERNAME) {
      realPlayersOnline++;
      console.log(
        `[${timestamp()}] 👀 Real player joined: ${player.username}, enabling vanish`
      );
      safeChat("/vanish on");
    }
  });

  bot.on("playerLeft", (player) => {
    if (player.username !== USERNAME) {
      realPlayersOnline = Math.max(0, realPlayersOnline - 1);
      console.log(`[${timestamp()}] 👋 Player left: ${player.username}`);
      if (realPlayersOnline === 0) {
        console.log(`[${timestamp()}] No real players online, disabling vanish`);
        safeChat("/vanish off");
      }
    }
  });

  bot.on("end", () => {
    console.log(`[${timestamp()}] ❌ Bot disconnected`);
    stopAFK();
    stopAFKChat();
    retryCount++;
    const delay = Math.min(120000, retryCount * 20000);
    console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay / 1000}s...`);
    setTimeout(createBot, delay);
  });

  bot.on("error", (err) => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`);
    if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") {
      console.log(`[${timestamp()}] 🔄 Network error, reconnecting...`);
      stopAFK();
      stopAFKChat();
      if (bot && bot._client && !bot._client.destroyed) bot.end();
      retryCount++;
      const delay = Math.min(120000, retryCount * 20000);
      setTimeout(createBot, delay);
    }
  });

  bot.on("kicked", (reason) => {
    console.log(`[${timestamp()}] ⚠️ Kicked: ${reason}`);
  });
}

// AFK movement
function startAFK() {
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
    bot.setControlState("forward", Math.random() < 0.7);
    bot.setControlState("left", Math.random() < 0.5);
    bot.setControlState("right", Math.random() < 0.5);
    bot.setControlState("jump", Math.random() < 0.3);
    bot.setControlState("sneak", Math.random() < 0.2);
    bot.look(Math.random() * 360, Math.random() * 180 - 90);
  }, 5000);
}

function stopAFK() {
  clearInterval(afkInterval);
  if (bot && bot._client && !bot._client.destroyed) {
    bot.setControlState("forward", false);
    bot.setControlState("back", false);
    bot.setControlState("left", false);
    bot.setControlState("right", false);
    bot.setControlState("jump", false);
    bot.setControlState("sneak", false);
  }
}

// AFK random chat
function startAFKChat() {
  const messages = [
    "Keeping the server alive!",
    "AFK but online 😎",
    "Hello everyone!",
    "I'm a bot 🤖",
    "Ping me if you need me!",
  ];
  chatInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
    const msg = messages[Math.floor(Math.random() * messages.length)];
    safeChat(msg);
  }, 10 * 60 * 1000);
}

function stopAFKChat() {
  clearInterval(chatInterval);
}

// Safe bot chat wrapper
function safeChat(msg) {
  if (bot && bot._client && !bot._client.destroyed) {
    bot.chat(msg);
  }
}

createBot();
