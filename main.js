const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let coin = parseInt(localStorage.getItem("coin")) || 100;
let inventory = JSON.parse(localStorage.getItem("inventory")) || [];
let playerName = localStorage.getItem("playerName") || "";

if (!playerName) {
  playerName = prompt("Masukkan nama kamu:") || "Anonim";
  localStorage.setItem("playerName", playerName);
}

document.getElementById("coinCount").innerText = coin;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#222",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 } }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
  this.load.image("gachaBox", "https://i.imgur.com/lpIlr0E.png");
}

function create() {
  this.chatBubbles = {};
  this.nameTags = {};
  this.cursors = this.input.keyboard.createCursorKeys();

  socket.on("init", (id) => {
    playerId = id;
    if (inventory.includes("avatar_wanita")) {
      avatarType = "wanita";
      localStorage.setItem("avatarType", "wanita");
    }
    socket.emit("avatarType", avatarType);
    socket.emit("playerName", playerName);
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].avatar.destroy();
        players[id].bubble.destroy();
        this.nameTags[id]?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      const avatarImg = data.avatarType === "wanita" ? "wanita" : "pria";

      if (!players[id]) {
        const avatar = this.add.sprite(data.x, data.y, avatarImg).setScale(2);
        const bubble = this.add.text(data.x, data.y - 40, "", {
          font: "16px Arial",
          fill: "#fff",
          backgroundColor: "#000",
          padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setVisible(false);

        const nameTag = this.add.text(data.x, data.y - 60, data.name || "Anonim", {
          font: "14px Arial",
          fill: "#0f0"
        }).setOrigin(0.5);

        players[id] = { avatar, bubble };
        this.nameTags[id] = nameTag;
      } else {
        players[id].avatar.x = data.x;
        players[id].avatar.y = data.y;
        players[id].bubble.x = data.x;
        players[id].bubble.y = data.y - 40;
        this.nameTags[id].x = data.x;
        this.nameTags[id].y = data.y - 60;
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const player = players[id];
    if (player) {
      player.bubble.setText(msg).setVisible(true);
      this.time.delayedCall(3000, () => {
        player.bubble.setVisible(false);
      });
    }
  });

  // ✅ Chat input form
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  });

  // Emote keys
  this.input.keyboard.on("keydown", (event) => {
    const player = players[playerId];
    if (!player) return;

    if (event.key === "1") {
      player.avatar.y -= 50;
      setTimeout(() => player.avatar.y += 50, 300);
    }
    if (event.key === "2" && inventory.includes("emote_wave")) {
      player.avatar.setAngle(15);
      setTimeout(() => player.avatar.setAngle(0), 300);
    }
    if (event.key === "3" && inventory.includes("emote_dance")) {
      let i = 0;
      const interval = setInterval(() => {
        player.avatar.setFlipX(i % 2 === 0);
        i++;
        if (i > 5) {
          clearInterval(interval);
          player.avatar.setFlipX(false);
        }
      }, 100);
    }
  });

  const gacha = this.add.image(60, 550, "gachaBox").setInteractive().setScale(0.5);
  gacha.on("pointerdown", () => openBox(20));
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  if (this.cursors.left.isDown && player.avatar.x > 20) {
    player.avatar.x -= 3;
    moved = true;
  } else if (this.cursors.right.isDown && player.avatar.x < 780) {
    player.avatar.x += 3;
    moved = true;
  }

  if (this.cursors.up.isDown && player.avatar.y > 40) {
    player.avatar.y -= 3;
    moved = true;
  } else if (this.cursors.down.isDown && player.avatar.y < 560) {
    player.avatar.y += 3;
    moved = true;
  }

  if (moved) {
    socket.emit("move", {
      x: player.avatar.x,
      y: player.avatar.y
    });
  }
}

function openBox(cost) {
  if (coin < cost) {
    alert("Koin tidak cukup!");
    return;
  }

  coin -= cost;
  document.getElementById("coinCount").innerText = coin;
  localStorage.setItem("coin", coin);

  const rewards = ["emote_wave", "emote_dance", "avatar_wanita"];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  if (!inventory.includes(reward)) inventory.push(reward);
  localStorage.setItem("inventory", JSON.stringify(inventory));
  alert("Kamu mendapatkan: " + reward);
}
