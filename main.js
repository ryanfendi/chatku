const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");

let playerId;
let players = {};
let avatarImg = localStorage.getItem("avatarImg");
let playerName = localStorage.getItem("playerName");

if (!avatarImg || !playerName) {
  document.getElementById("avatarSelect").style.display = "block";
}

document.getElementById("uploadAvatar").onchange = function (e) {
  const reader = new FileReader();
  reader.onload = function (event) {
    localStorage.setItem("avatarImg", event.target.result);
    avatarImg = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
};

window.selectDefaultAvatar = function (type) {
  const imgUrl = type === "pria"
    ? "https://i.imgur.com/uQaaapA.png"
    : "https://i.imgur.com/bMolfpy.png";
  localStorage.setItem("avatarImg", imgUrl);
  avatarImg = imgUrl;
};

document.getElementById("nameInput").addEventListener("change", e => {
  localStorage.setItem("playerName", e.target.value);
  playerName = e.target.value;
});

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 } }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  if (avatarImg && avatarImg.startsWith("data")) {
    this.textures.addBase64("customAvatar", avatarImg);
  } else {
    this.load.image("customAvatar", avatarImg);
  }
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("avatar", { img: avatarImg, name: playerName });
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].bubble?.destroy();
        players[id].name?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];

      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, "customAvatar").setDisplaySize(40, 40);
        const name = this.add.text(data.x, data.y - 40, data.name, { font: "14px Arial", fill: "#fff" }).setOrigin(0.5);
        const bubble = this.add.text(data.x, data.y - 60, "", {
          font: "16px Arial", fill: "#fff", backgroundColor: "#000", padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setVisible(false);
        players[id] = { sprite, name, bubble };
      } else {
        players[id].sprite.setPosition(data.x, data.y);
        players[id].name.setPosition(data.x, data.y - 40);
        players[id].bubble.setPosition(data.x, data.y - 60);
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    if (players[id]) {
      players[id].bubble.setText(msg).setVisible(true);
      this.time.delayedCall(4000, () => players[id].bubble.setVisible(false));
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
  if (this.cursors.left.isDown) {
    player.sprite.x -= 2;
    moved = true;
  } else if (this.cursors.right.isDown) {
    player.sprite.x += 2;
    moved = true;
  }
  if (this.cursors.up.isDown) {
    player.sprite.y -= 2;
    moved = true;
  } else if (this.cursors.down.isDown) {
    player.sprite.y += 2;
    moved = true;
  }

  // Batasi area
  player.sprite.x = Phaser.Math.Clamp(player.sprite.x, 20, 780);
  player.sprite.y = Phaser.Math.Clamp(player.sprite.y, 20, 580);

  if (moved) {
    socket.emit("move", { x: player.sprite.x, y: player.sprite.y });
  }
}
