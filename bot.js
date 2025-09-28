
Save New Duplicate & Edit Just Text Twitter
const mineflayer = require("mineflayer");
require("dotenv").config();

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

function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

function safeChat(msg) {
  if (bot && bot._client && !bot._client.destroyed) {
    try { bot.chat(msg); } catch {}
  }
}

function stopAFK() {
  clearInterval(afkInterval);
  if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
  ["forward","back","left","right","jump","sneak"].forEach(d => {
    try { bot.setControlState(d,false); } catch {}
  });
}

function startAFK() {
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
    ["forward","left","right","jump","sneak"].forEach(d => {
      try { bot.setControlState(d, Math.random() < 0.5); } catch {}
    });
    try { bot.look(Math.random() * 360, Math.random() * 180 - 90); } catch {}
  }, 5000);
}

function startAFKChat() {
  const messages = ["Keeping server alive!","AFK but online 😎","Hello!","I'm a bot 🤖"];
  chatInterval = setInterval(() => {
    const msg = messages[Math.floor(Math.random() * messages.length)];
    safeChat(msg);
  }, 10 * 60 * 1000);
}

function stopAFKChat() {
  clearInterval(chatInterval);
}

function createBot() {
  log(`🤖 Connecting to ${host}:${port || 25565} as ${USERNAME} (${AUTH})...`);

  bot = mineflayer.createBot({
    host,
    port: port ? parseInt(port) : 25565,
    username: USERNAME,
    auth: AUTH,
    version: false,
  });

  bot.once("spawn", () => {
    log(`✅ Bot joined ${host}:${port || 25565}`);
    retryCount = 0;
    startAFK();
    startAFKChat();
  });

  // AFK chat & commands
  bot.on("chat", (username, message) => {
    if (username === USERNAME) return;
    if (/hi bot/i.test(message)) safeChat(`Hello ${username}! 👋`);
    if (/afk\??/i.test(message)) safeChat("Yes, keeping server alive ⛏️");
    if (message === "!vanish on") safeChat("/vanish on");
    if (message === "!vanish off") safeChat("/vanish off");
    if (message === "!state") safeChat("✅ I am online and AFK.");
  });

  // Resource pack decline
  bot.on("resourcePack", (url, hash) => {
    log("⚠️ Resource pack requested, declining...");
    try { bot._client.write('resource_pack_response', {hash, result: 2}); } catch {}
  });

  // Real players tracking
  bot.on("playerJoined", (player) => {
    if (player.username !== USERNAME) {
      realPlayersOnline++;
      log(`👀 Real player joined: ${player.username}, enabling vanish`);
      safeChat("/vanish on");
    }
  });

  bot.on("playerLeft", (player) => {
    if (player.username !== USERNAME) {
      realPlayersOnline = Math.max(0, realPlayersOnline - 1);
      log(`👋 Player left: ${player.username}`);
      if (realPlayersOnline === 0) safeChat("/vanish off");
    }
  });

  bot.on("end", () => {
    stopAFK();
    stopAFKChat();
    retryCount++;
    const delay = Math.min(300000, 20000 * Math.pow(2, retryCount)); // exponential backoff
    log(`❌ Bot disconnected, reconnecting in ${Math.round(delay/1000)}s...`);
    setTimeout(createBot, delay);
  });

  bot.on("error", (err) => {
    log(`⚠️ Error: ${err.message}`);
    if (["ECONNRESET","ETIMEDOUT"].includes(err.code)) {
      stopAFK();
      stopAFKChat();
      if (bot && bot._client && !bot._client.destroyed) bot.end();
    }
  });

  bot.on("kicked", (reason) => {
    let msg;
    try { msg = typeof reason === "string" ? reason : JSON.stringify(reason); } catch { msg = "[unknown]"; }
    log(`⚠️ Kicked: ${msg}`);
  });
}

createBot();
