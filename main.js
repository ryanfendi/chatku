const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let playerName = localStorage.getItem("playerName") || "";

if (!playerName) {
  playerName = prompt("Masukkan nama kamu:");
  localStorage.setItem("playerName", playerName);
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1e1e1e",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.chatBubbles = {};
  this.nameTags = {};

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("avatarType", avatarType);
    socket.emit("playerName", playerName);
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].avatar.destroy();
        this.chatBubbles[id]?.destroy();
        this.nameTags[id]?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      const avatarImg = data.avatarType === "wanita" ? "wanita" : "pria";

      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, avatarImg).setScale(2);
        const name = this.add.text(data.x, data.y - 40, data.name || "Anonim", {
          font: "14px Arial",
          fill: "#0f0"
        }).setOrigin(0.5);

        const bubble = this.add.text(data.x, data.y - 60, "", {
          font: "14px Arial",
          fill: "#fff",
          backgroundColor: "#000",
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setVisible(false);

        players[id] = { avatar: sprite };
        this.nameTags[id] = name;
        this.chatBubbles[id] = bubble;
      }

      players[id].avatar.x = data.x;
      players[id].avatar.y = data.y;
      this.nameTags[id].x = data.x;
      this.nameTags[id].y = data.y - 40;
      this.chatBubbles[id].x = data.x;
      this.chatBubbles[id].y = data.y - 60;
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const bubble = this.chatBubbles[id];
    if (bubble) {
      bubble.setText(msg).setVisible(true);
      this.time.delayedCall(3000, () => bubble.setVisible(false));
    }
  });

  // Chat input
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  sendBtn.onclick = () => {
    const msg = input.value;
    if (msg.trim() !== "") {
      socket.emit("chat", msg);
      input.value = "";
    }
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  if (this.cursors.left.isDown) {
    player.avatar.x -= 3;
    moved = true;
  } else if (this.cursors.right.isDown) {
    player.avatar.x += 3;
    moved = true;
  }

  if (this.cursors.up.isDown) {
    player.avatar.y -= 3;
    moved = true;
  } else if (this.cursors.down.isDown) {
    player.avatar.y += 3;
    moved = true;
  }

  // Batas area layar
  player.avatar.x = Phaser.Math.Clamp(player.avatar.x, 0, 800);
  player.avatar.y = Phaser.Math.Clamp(player.avatar.y, 0, 600);

  if (moved) {
    socket.emit("move", {
      x: player.avatar.x,
      y: player.avatar.y
    });
  }
}
