const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId, players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let avatarURL = localStorage.getItem("avatarURL") || "";
let playerName = localStorage.getItem("playerName") || prompt("Masukkan nama kamu:") || "Anonim";
localStorage.setItem("playerName", playerName);

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  backgroundColor: "#2d2d2d",
  physics: { default: "arcade", arcade: { debug: false } },
  scene: { preload, create, update }
};

let game = new Phaser.Game(config);

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
  if (avatarURL) this.load.image("custom", avatarURL);
}

function create() {
  const scene = this;
  this.cursors = this.input.keyboard.createCursorKeys();

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("avatarType", avatarType);
    socket.emit("playerName", playerName);
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].name.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      const texture = (data.avatarType === "custom") ? "custom" : data.avatarType;

      if (!players[id]) {
        const sprite = scene.add.sprite(data.x, data.y, texture).setScale(1.5);
        const name = scene.add.text(data.x, data.y - 30, data.name, {
          font: "16px Arial", fill: "#fff"
        }).setOrigin(0.5);
        players[id] = { sprite, name };
      } else {
        players[id].sprite.x = data.x;
        players[id].sprite.y = data.y;
        players[id].name.x = data.x;
        players[id].name.y = data.y - 30;
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    if (players[id]) {
      if (players[id].bubble) players[id].bubble.destroy();
      players[id].bubble = scene.add.text(players[id].sprite.x, players[id].sprite.y - 60, msg, {
        font: "14px Arial", fill: "#0f0", backgroundColor: "#000", padding: { x: 4, y: 2 }
      }).setOrigin(0.5);
      scene.time.delayedCall(3000, () => players[id].bubble?.destroy());
    }
  });

  document.getElementById("chatSend").onclick = () => {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  };

  document.getElementById("avatarUpload").addEventListener("change", function () {
    const file = this.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      avatarType = "custom";
      avatarURL = reader.result;
      localStorage.setItem("avatarType", avatarType);
      localStorage.setItem("avatarURL", avatarURL);
      location.reload();
    };
    if (file) reader.readAsDataURL(file);
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  const speed = 3;
  let moved = false;

  if (this.cursors.left.isDown && player.sprite.x > 20) {
    player.sprite.x -= speed; moved = true;
  }
  if (this.cursors.right.isDown && player.sprite.x < 780) {
    player.sprite.x += speed; moved = true;
  }
  if (this.cursors.up.isDown && player.sprite.y > 20) {
    player.sprite.y -= speed; moved = true;
  }
  if (this.cursors.down.isDown && player.sprite.y < 580) {
    player.sprite.y += speed; moved = true;
  }

  if (moved) {
    socket.emit("move", {
      x: player.sprite.x,
      y: player.sprite.y
    });
  }
}

function selectAvatar(type) {
  localStorage.setItem("avatarType", type);
  localStorage.removeItem("avatarURL");
  location.reload();
}
