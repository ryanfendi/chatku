const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let playerName = localStorage.getItem("playerName") || "Anonim";
let avatarImg = localStorage.getItem("avatarImg");

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#222",
  physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.textures.addBase64('customAvatar', avatarImg);
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.chatBubbles = {};

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("avatarData", { avatarImg, playerName });
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].bubble?.destroy();
        players[id].nameTag?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, "customAvatar").setScale(0.5);
        const nameTag = this.add.text(data.x, data.y - 40, data.name || "Anonim", {
          font: "14px Arial", fill: "#0f0"
        }).setOrigin(0.5);

        const bubble = this.add.text(data.x, data.y - 60, "", {
          font: "14px Arial", fill: "#fff", backgroundColor: "#000",
          padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setVisible(false);

        players[id] = { sprite, nameTag, bubble };
      }

      players[id].sprite.x = data.x;
      players[id].sprite.y = data.y;
      players[id].nameTag.x = data.x;
      players[id].nameTag.y = data.y - 40;
      players[id].bubble.x = data.x;
      players[id].bubble.y = data.y - 60;
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const player = players[id];
    if (player) {
      player.bubble.setText(msg).setVisible(true);
      this.time.delayedCall(4000, () => player.bubble.setVisible(false));
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

  let moved = false;
  const speed = 3;

  if (this.cursors.left.isDown && player.sprite.x > 20) {
    player.sprite.x -= speed;
    moved = true;
  } else if (this.cursors.right.isDown && player.sprite.x < 780) {
    player.sprite.x += speed;
    moved = true;
  }

  if (this.cursors.up.isDown && player.sprite.y > 20) {
    player.sprite.y -= speed;
    moved = true;
  } else if (this.cursors.down.isDown && player.sprite.y < 580) {
    player.sprite.y += speed;
    moved = true;
  }

  if (moved) {
    socket.emit("move", {
      x: player.sprite.x,
      y: player.sprite.y
    });
  }
}
