const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let playerName = localStorage.getItem("playerName") || "Anonim";

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
  this.chatBubbles = {};

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
        players[id].nameTag.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      const imgKey = data.avatarType === "wanita" ? "wanita" : "pria";

      if (!players[id]) {
        const avatar = this.add.sprite(data.x, data.y, imgKey).setScale(2);
        const bubble = this.add.text(data.x, data.y - 40, "", {
          font: "16px Arial", fill: "#fff", backgroundColor: "#000",
          padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setVisible(false);
        const nameTag = this.add.text(data.x, data.y - 60, data.name || "Anonim", {
          font: "14px Arial", fill: "#0f0"
        }).setOrigin(0.5);

        players[id] = { avatar, bubble, nameTag };
      } else {
        players[id].avatar.x = data.x;
        players[id].avatar.y = data.y;
        players[id].bubble.x = data.x;
        players[id].bubble.y = data.y - 40;
        players[id].nameTag.x = data.x;
        players[id].nameTag.y = data.y - 60;
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

  const input = document.getElementById("chatInput");
  const button = document.getElementById("chatSend");

  button.addEventListener("click", () => {
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const msg = input.value.trim();
      if (msg) {
        socket.emit("chat", msg);
        input.value = "";
      }
    }
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;

  if (this.cursors.left.isDown && player.avatar.x > 0) {
    player.avatar.x -= 3; moved = true;
  }
  if (this.cursors.right.isDown && player.avatar.x < 800) {
    player.avatar.x += 3; moved = true;
  }
  if (this.cursors.up.isDown && player.avatar.y > 0) {
    player.avatar.y -= 3; moved = true;
  }
  if (this.cursors.down.isDown && player.avatar.y < 600) {
    player.avatar.y += 3; moved = true;
  }

  if (moved) {
    socket.emit("move", {
      x: player.avatar.x,
      y: player.avatar.y
    });
  }
}
