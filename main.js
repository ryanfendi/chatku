const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

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
  this.chatBubbles = {};
  this.nameTags = {};
  this.cursors = this.input.keyboard.createCursorKeys();

  socket.on("init", (id) => {
    playerId = id;
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
      const avatarImg = ["pria", "wanita"].includes(data.avatarType) ? data.avatarType : "pria";

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

  document.getElementById("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = document.getElementById("chatInput").value;
    if (msg.trim() !== "") {
      socket.emit("chat", msg);
      document.getElementById("chatInput").value = "";
    }
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  const speed = 3;

  if (this.cursors.left.isDown && player.avatar.x > 20) {
    player.avatar.x -= speed;
    moved = true;
  } else if (this.cursors.right.isDown && player.avatar.x < 780) {
    player.avatar.x += speed;
    moved = true;
  }

  if (this.cursors.up.isDown && player.avatar.y > 40) {
    player.avatar.y -= speed;
    moved = true;
  } else if (this.cursors.down.isDown && player.avatar.y < 580) {
    player.avatar.y += speed;
    moved = true;
  }

  if (moved) {
    socket.emit("move", {
      x: player.avatar.x,
      y: player.avatar.y
    });
  }
}

function selectAvatar(type) {
  localStorage.setItem("avatarType", type);
  document.getElementById("avatarSelect").style.display = "none";
  location.reload();
}
