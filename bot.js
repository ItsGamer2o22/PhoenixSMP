const mineflayer = require("mineflayer");

const SERVER =
  process.env.MC_SERVERS?.split(",")[0] || "play.phoenixsmp.qzz.io:20722";
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

function safeChat(msg) {
  if (bot && bot._client && !bot._client.destroyed) {
    bot.chat(msg);
  }
}

function stopAFK() {
  clearInterval(afkInterval);
  if (!bot || !bot._client || bot._client.destroyed) return;
  ["forward", "back", "left", "right", "jump", "sneak"].forEach((c) =>
    bot.setControlState(c, false)
  );
}

function startAFK() {
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot._client || bot._client.destroyed) return;
    bot.setControlState("forward", Math.random() < 0.7);
    bot.setControlState("left", Math.random() < 0.5);
    bot.setControlState("right", Math.random() < 0.5);
    bot.setControlState("jump", Math.random() < 0.3);
    bot.setControlState("sneak", Math.random() < 0.2);
    try {
      bot.look(Math.random() * 360, Math.random() * 180 - 90);
    } catch {}
  }, 5000);
}

function stopAFKChat() {
  clearInterval(chatInterval);
}

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
    safeChat(messages[Math.floor(Math.random() * messages.length)]);
  }, 10 * 60 * 1000);
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

  bot.on("resourcePack", (url, hash, prompt) => {
    console.log(`[${timestamp()}] ⚠️ Resource pack requested, declining...`);
    if (bot.acceptResourcePack) bot.acceptResourcePack(false); // safe for older versions
  });

  bot.on("chat", (username, message) => {
    if (username === USERNAME) return;
    if (/hi bot/i.test(message)) safeChat(`Hello ${username}! 👋`);
    if (/afk\??/i.test(message))
      safeChat("Yes, I'm keeping the server alive ⛏️");
    if (message === "!vanish on") safeChat("/vanish on");
    if (message === "!vanish off") safeChat("/vanish off");
    if (message === "!state") safeChat("✅ I am online and AFK.");
  });

  bot.on("playerJoined", (player) => {
    if (!bot || player.username === USERNAME) return;
    realPlayersOnline++;
    console.log(`[${timestamp()}] 👀 Real player joined: ${player.username}`);
    setTimeout(() => safeChat("/vanish on"), 2000);
  });

  bot.on("playerLeft", (player) => {
    if (!bot || player.username === USERNAME) return;
    realPlayersOnline = Math.max(0, realPlayersOnline - 1);
    console.log(`[${timestamp()}] 👋 Player left: ${player.username}`);
    if (realPlayersOnline === 0) setTimeout(() => safeChat("/vanish off"), 2000);
  });

  bot.on("end", () => {
    stopAFK();
    stopAFKChat();
    retryCount++;
    const delay = Math.min(120000, retryCount * 20000);
    console.log(`[${timestamp()}] ❌ Bot disconnected, reconnecting in ${delay / 1000}s...`);
    setTimeout(createBot, delay);
  });

  bot.on("error", (err) => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`);
    if (["ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
      stopAFK();
      stopAFKChat();
      if (bot && bot._client && !bot._client.destroyed) bot.end();
      retryCount++;
      const delay = Math.min(120000, retryCount * 20000);
      console.log(`[${timestamp()}] 🔄 Network error, reconnecting in ${delay / 1000}s...`);
      setTimeout(createBot, delay);
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
  });
}

createBot();
