const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");

let playerId;
let players = {};
let playerName = localStorage.getItem("playerName") || prompt("Masukkan nama kamu:") || "Anonim";
let avatarImg = localStorage.getItem("customAvatar") || null;

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
  this.load.image("default", "https://i.imgur.com/uQaaapA.png");
  if (avatarImg) {
    this.textures.addBase64("customAvatar", avatarImg);
  }
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.nameTags = {};
  this.chatBubbles = {};

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("playerData", {
      name: playerName,
      avatarType: avatarImg ? "custom" : "default",
      avatarImg
    });
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].avatar.destroy();
        this.nameTags[id]?.destroy();
        this.chatBubbles[id]?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      const texture = data.avatarImg ? "customAvatar" : "default";

      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, texture).setDisplaySize(40, 40);
        const nameTag = this.add.text(data.x, data.y - 30, data.name || "Anonim", {
          font: "14px Arial",
          fill: "#0f0"
        }).setOrigin(0.5);

        const bubble = this.add.text(data.x, data.y - 50, "", {
          font: "14px Arial",
          fill: "#fff",
          backgroundColor: "#000",
          padding: { x: 6, y: 3 }
        }).setOrigin(0.5).setVisible(false);

        players[id] = { avatar: sprite };
        this.nameTags[id] = nameTag;
        this.chatBubbles[id] = bubble;
      } else {
        players[id].avatar.setPosition(data.x, data.y);
        this.nameTags[id].setPosition(data.x, data.y - 30);
        this.chatBubbles[id].setPosition(data.x, data.y - 50);
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const bubble = this.chatBubbles[id];
    if (bubble) {
      bubble.setText(msg).setVisible(true);
      this.time.delayedCall(3000, () => bubble.setVisible(false));
    }
  });

  // Chat box
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = input.value;
    if (msg.trim()) {
      socket.emit("chat", msg);
      input.value = "";
    }
  });

  // FIX: Izinkan spasi di input chat
  input.addEventListener("keydown", (e) => {
    e.stopPropagation(); // cegah Phaser tangkap space
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  if (this.cursors.left.isDown) {
    player.avatar.x -= 2;
    moved = true;
  }
  if (this.cursors.right.isDown) {
    player.avatar.x += 2;
    moved = true;
  }
  if (this.cursors.up.isDown) {
    player.avatar.y -= 2;
    moved = true;
  }
  if (this.cursors.down.isDown) {
    player.avatar.y += 2;
    moved = true;
  }

  // Batas map
  player.avatar.x = Phaser.Math.Clamp(player.avatar.x, 0, 800);
  player.avatar.y = Phaser.Math.Clamp(player.avatar.y, 0, 600);

  if (moved) {
    socket.emit("move", {
      x: player.avatar.x,
      y: player.avatar.y
    });
  }
}
