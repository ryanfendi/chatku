const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let playerName = localStorage.getItem("playerName") || prompt("Masukkan nama kamu:") || "Anonim";
localStorage.setItem("playerName", playerName);

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
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.input.keyboard.removeCapture([Phaser.Input.Keyboard.KeyCodes.SPACE]); // agar spasi bisa digunakan di input

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
        players[id].avatar?.destroy();
        players[id].bubble?.destroy();
        this.nameTags[id]?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      const avatarKey = data.avatarType === "wanita" ? "wanita" : "pria";

      if (!players[id]) {
        const avatar = this.add.sprite(data.x, data.y, avatarKey).setScale(2);

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

        players[id] = { avatar, bubble, avatarType: data.avatarType };
        this.nameTags[id] = nameTag;
      } else {
        players[id].avatar.setPosition(data.x, data.y);
        players[id].bubble.setPosition(data.x, data.y - 40);
        this.nameTags[id].setPosition(data.x, data.y - 60);
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const player = players[id];
    if (player) {
      player.bubble.setText(msg).setVisible(true);
      this.time.delayedCall(4000, () => {
        player.bubble.setVisible(false);
      });
    }
  });

  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  // Saat mengetik, jangan gerakkan karakter
  if (document.activeElement === document.getElementById("chatInput")) return;

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

  // Batasi agar tidak keluar layar
  player.avatar.x = Phaser.Math.Clamp(player.avatar.x, 20, 780);
  player.avatar.y = Phaser.Math.Clamp(player.avatar.y, 20, 580);

  if (moved) {
    socket.emit("move", {
      x: player.avatar.x,
      y: player.avatar.y
    });
  }
}
