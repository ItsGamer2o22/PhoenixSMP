const mineflayer = require("mineflayer");

const SERVER = process.env.MC_SERVERS?.split(",")[0] || "play.phoenixsmp.qzz.io:20722";
const [host, port] = SERVER.split(":");
const USERNAME = process.env.MC_USERNAME || "PhoenixBotSMP";

// FORCE offline mode for compatibility with SkinRestorer
const AUTH = "offline";

let bot;
let afkInterval;
let chatInterval;
let retryCount = 0;
let realPlayersOnline = 0;

function timestamp() {
  return new Date().toISOString().split("T")[1].split(".")[0];
}

function safeSetControl(state, value) {
  if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
  try {
    bot.setControlState(state, value);
  } catch {}
}

function safeChat(msg) {
  if (!bot || !bot._client || bot._client.destroyed) return;
  try {
    bot.chat(msg);
  } catch {}
}

function stopAFK() {
  clearInterval(afkInterval);
  if (!bot) return;
  ["forward", "back", "left", "right", "jump", "sneak"].forEach(dir => safeSetControl(dir, false));
}

function startAFK() {
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
    safeSetControl("forward", Math.random() < 0.7);
    safeSetControl("left", Math.random() < 0.5);
    safeSetControl("right", Math.random() < 0.5);
    safeSetControl("jump", Math.random() < 0.3);
    safeSetControl("sneak", Math.random() < 0.2);
    try {
      bot.look(Math.random() * 360, Math.random() * 180 - 90);
    } catch {}
  }, 5000);
}

function startAFKChat() {
  const messages = [
    "Keeping the server alive!",
    "AFK but online 😎",
    "Hello everyone!",
    "I'm a bot 🤖",
    "Ping me if you need me!"
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

function createBot() {
  console.log(`[${timestamp()}] 🤖 Connecting to ${host}:${port || 25565} as ${USERNAME} (${AUTH})...`);

  bot = mineflayer.createBot({
    host,
    port: port ? parseInt(port) : 25565,
    username: USERNAME,
    auth: AUTH,
    version: false
  });

  bot.once("spawn", () => {
    console.log(`[${timestamp()}] ✅ Bot joined ${host}:${port || 25565}`);
    retryCount = 0;
    startAFK();
    startAFKChat();
  });

  bot.on("chat", (username, message) => {
    if (username === USERNAME) return;
    if (/hi bot/i.test(message)) safeChat(`Hello ${username}! 👋`);
    if (/afk\??/i.test(message)) safeChat("Yes, I'm keeping the server alive ⛏️");
    if (message === "!vanish on") safeChat("/vanish on");
    if (message === "!vanish off") safeChat("/vanish off");
    if (message === "!state") safeChat("✅ I am online and AFK.");
  });

  bot.on("playerJoined", (player) => {
    if (!bot || player.username === USERNAME) return;
    realPlayersOnline++;
    console.log(`[${timestamp()}] 👀 Real player joined: ${player.username}, enabling vanish`);
    safeChat("/vanish on");
  });

  bot.on("playerLeft", (player) => {
    if (!bot || player.username === USERNAME) return;
    realPlayersOnline = Math.max(0, realPlayersOnline - 1);
    console.log(`[${timestamp()}] 👋 Player left: ${player.username}`);
    if (realPlayersOnline === 0) safeChat("/vanish off");
  });

  // Handle resource pack requests (always decline, but log them)
  bot.on("resourcePack", (url, hash) => {
    console.log(`[${timestamp()}] ⚠️ Server requested resource pack: ${url} (hash: ${hash || "none"})`);
    console.log(`[${timestamp()}] ❌ Declining resource pack...`);
    bot._client.write("resource_pack_receive", {
      result: 3 // 3 = declined
    });
  });

  bot.on("end", () => {
    stopAFK();
    stopAFKChat();
    retryCount++;
    const delay = Math.min(300000, retryCount * 20000); // max 5 min
    console.log(`[${timestamp()}] ❌ Bot disconnected, reconnecting in ${delay / 1000}s...`);
    setTimeout(createBot, delay);
  });

  bot.on("error", (err) => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`);
    if (["ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
      console.log(`[${timestamp()}] 🔄 Network error, reconnecting...`);
      stopAFK();
      stopAFKChat();
      if (bot && bot._client && !bot._client.destroyed) bot.end();
    }
  });

  bot.on("kicked", (reason) => {
    let msg;
    try {
      msg = typeof reason === "string" ? reason : JSON.stringify(reason);
    } catch {
      msg = "[unknown reason]";
    }
    console.log(`[${timestamp()}] ⚠️ Kicked: ${msg}`);
    stopAFK();
    stopAFKChat();
    const delay = 20000;
    console.log(`[${timestamp()}] ❌ Bot disconnected, reconnecting in ${delay / 1000}s...`);
    setTimeout(createBot, delay);
  });
}

createBot();
