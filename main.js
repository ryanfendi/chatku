const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let playerName = localStorage.getItem("playerName") || "Anonim";
let avatarCustom = localStorage.getItem("avatarCustom");

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#333",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");

  if (avatarCustom) {
    this.load.image("custom", avatarCustom);
  }
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.chatBubbles = {};
  this.nameTags = {};

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("playerData", {
      name: playerName,
      avatarType: avatarCustom ? "custom" : avatarType,
      avatarImg: avatarCustom || null
    });
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].bubble.destroy();
        players[id].nameTag.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      let tex = "pria";
      if (data.avatarType === "wanita") tex = "wanita";
      else if (data.avatarType === "custom") tex = "custom";

      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, tex).setScale(2).setOrigin(0.5);
        const bubble = this.add.text(data.x, data.y - 40, "", {
          font: "16px Arial",
          fill: "#fff",
          backgroundColor: "#000"
        }).setOrigin(0.5).setVisible(false);

        const nameTag = this.add.text(data.x, data.y - 60, data.name, {
          font: "14px Arial", fill: "#0f0"
        }).setOrigin(0.5);

        players[id] = { sprite, bubble, nameTag };
      } else {
        const p = players[id];
        p.sprite.setPosition(data.x, data.y);
        p.bubble.setPosition(data.x, data.y - 40);
        p.nameTag.setPosition(data.x, data.y - 60);
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const p = players[id];
    if (p) {
      p.bubble.setText(msg).setVisible(true);
      this.time.delayedCall(3000, () => p.bubble.setVisible(false));
    }
  });

  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      chatInput.value = "";
    }
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  const speed = 3;
  const sprite = player.sprite;

  if (this.cursors.left.isDown) {
    sprite.x -= speed;
    moved = true;
  } else if (this.cursors.right.isDown) {
    sprite.x += speed;
    moved = true;
  }

  if (this.cursors.up.isDown) {
    sprite.y -= speed;
    moved = true;
  } else if (this.cursors.down.isDown) {
    sprite.y += speed;
    moved = true;
  }

  // Batasi area dalam 800x600
  sprite.x = Phaser.Math.Clamp(sprite.x, 0, 800);
  sprite.y = Phaser.Math.Clamp(sprite.y, 0, 600);

  if (moved) {
    socket.emit("move", {
      x: sprite.x,
      y: sprite.y
    });
  }
}
