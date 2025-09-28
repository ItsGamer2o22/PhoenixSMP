const mineflayer = require('mineflayer');

let bot = null;
let reconnecting = false;

function createBot() {
  if (bot && bot.player) {
    console.log("⚠️ Bot already running, skipping new instance.");
    return;
  }

  bot = mineflayer.createBot({
    host: process.env.IP || "play.phoenixsmp.qzz.io",
    port: parseInt(process.env.PORT) || 20722,
    username: process.env.BOT_USERNAME || "PhoenixBotSMP",
    auth: "offline"
  });

  bot.on("login", () => {
    console.log(`✅ Logged in as ${bot.username}`);
  });

  bot.on("end", () => {
    if (!reconnecting) {
      reconnecting = true;
      console.log("❌ Bot disconnected, reconnecting in 20s...");
      setTimeout(() => {
        reconnecting = false;
        createBot();
      }, 20000);
    }
  });

  bot.on("kicked", (reason) => {
    console.log(`⚠️ Kicked: ${reason}`);
  });

  bot.on("error", (err) => {
    console.log(`⚠️ Error: ${err.message}`);
  });
}

createBot();
