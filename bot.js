// PhoenixBotSMP - KeepAlive Bot
const mineflayer = require("mineflayer");

require("dotenv").config();

let bot;
let afkInterval;
let chatInterval;
let retryCount = 0;

function timestamp() {
  return new Date().toISOString().replace("T", " ").split(".")[0];
}

function createBot() {
  bot = mineflayer.createBot({
    host: process.env.IP || "play.phoenixsmp.qzz.io",
    port: process.env.PORT ? parseInt(process.env.PORT) : 20722,
    username: process.env.BOT_NAME || "PhoenixBotSMP",
    version: process.env.VERSION || false,
  });

  bot.on("login", () => {
    console.log(`[${timestamp()}] ✅ Bot logged in as ${bot.username}`);
    retryCount = 0;
    startAFK();
    startAFKChat();
  });

  bot.on("end", () => {
    console.log(`[${timestamp()}] ❌ Bot disconnected`);
    stopAFK();
    stopAFKChat();
    bot = null;
    retryReconnect();
  });

  bot.on("error", (err) => {
    console.log(`[${timestamp()}] ⚠️ Error: ${err.message}`);
    stopAFK();
    stopAFKChat();
  });

  bot.on("kicked", (reason) => {
    console.log(`[${timestamp()}] ⚠️ Kicked: ${reason}`);
    stopAFK();
    stopAFKChat();
    bot = null;
    retryReconnect();
  });

  // Player join/leave logs
  bot.on("playerJoined", (player) => {
    if (player.username !== bot.username) {
      console.log(`[${timestamp()}] 👀 Real player joined: ${player.username}`);
    }
  });

  bot.on("playerLeft", (player) => {
    console.log(`[${timestamp()}] 👋 Player left: ${player.username}`);
  });
}

function retryReconnect() {
  retryCount++;
  const delay = Math.min(120000, retryCount * 20000); // up to 120s
  console.log(`[${timestamp()}] 🔄 Reconnecting in ${delay / 1000}s...`);
  setTimeout(createBot, delay);
}

// ---- AFK Movement ----
function startAFK() {
  if (!bot || !bot.entity) return;
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity || !bot.setControlState) return;
    const actions = ["forward", "back", "left", "right", "jump", "sneak"];
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => {
      if (bot && bot.setControlState) bot.setControlState(action, false);
    }, 1000);
  }, 10000);
}

function stopAFK() {
  clearInterval(afkInterval);
  if (!bot || !bot.entity || !bot.setControlState) return; // ✅ Safe cleanup
  try {
    bot.setControlState("forward", false);
    bot.setControlState("back", false);
    bot.setControlState("left", false);
    bot.setControlState("right", false);
    bot.setControlState("jump", false);
    bot.setControlState("sneak", false);
  } catch (err) {
    console.log(`[${timestamp()}] ⚠️ stopAFK error: ${err.message}`);
  }
}

// ---- AFK Chat ----
function startAFKChat() {
  if (!bot) return;
  chatInterval = setInterval(() => {
    if (!bot) return;
    bot.chat("PhoenixBotSMP is keeping the server alive ✨");
  }, 60000); // every 60s
}

function stopAFKChat() {
  clearInterval(chatInterval);
}

// ---- Start bot ----
console.log(`[${timestamp()}] 🚀 Starting PhoenixSMP KeepAlive Bot...`);
createBot();
