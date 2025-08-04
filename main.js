const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let avatarImg = localStorage.getItem("avatarImg");
let playerName = localStorage.getItem("playerName");

if (!avatarImg || !playerName) {
  document.getElementById("uploadUI").style.display = "block";
}

function startGame() {
  const fileInput = document.getElementById("avatarFile");
  const nameInput = document.getElementById("nameInput");

  if (!fileInput.files[0] || !nameInput.value.trim()) {
    alert("Lengkapi semua isian!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    avatarImg = e.target.result;
    playerName = nameInput.value.trim();

    localStorage.setItem("avatarImg", avatarImg);
    localStorage.setItem("playerName", playerName);
    location.reload();
  };
  reader.readAsDataURL(fileInput.files[0]);
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1e1e1e",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 } }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("default", "https://i.imgur.com/uQaaapA.png");
  if (avatarImg) this.textures.addBase64("custom", avatarImg);
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.nameTags = {};
  this.chatBubbles = {};

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("playerData", {
      name: playerName,
      avatarType: "custom",
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
      if (!players[id]) {
        const avatarKey = data.avatarImg ? this.textures.addBase64(id, data.avatarImg) || id : "default";
        const sprite = this.add.sprite(data.x, data.y, data.avatarImg ? id : "default").setScale(1.5);

        const nameText = this.add.text(data.x, data.y - 40, data.name, {
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
        this.nameTags[id] = nameText;
        this.chatBubbles[id] = bubble;
      }

      const sprite = players[id].avatar;
      sprite.x = data.x;
      sprite.y = data.y;
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

  document.getElementById("chatSend").onclick = () => {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  };
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  const speed = 3;
  const sprite = player.avatar;

  if (this.cursors.left.isDown && sprite.x > 20) {
    sprite.x -= speed; moved = true;
  } else if (this.cursors.right.isDown && sprite.x < 780) {
    sprite.x += speed; moved = true;
  }

  if (this.cursors.up.isDown && sprite.y > 20) {
    sprite.y -= speed; moved = true;
  } else if (this.cursors.down.isDown && sprite.y < 580) {
    sprite.y += speed; moved = true;
  }

  if (moved) {
    socket.emit("move", { x: sprite.x, y: sprite.y });
  }
}
