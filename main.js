const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");
let playerId, players = {}, playerName = localStorage.getItem("name") || "";
let avatarImg = localStorage.getItem("avatarImg");

if (!playerName) {
  document.getElementById("nameForm").style.display = "block";
}

function submitName() {
  const nameInput = document.getElementById("playerNameInput").value.trim();
  if (nameInput) {
    playerName = nameInput;
    localStorage.setItem("name", playerName);
    document.getElementById("nameForm").style.display = "none";
  }
}

document.getElementById("upload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    avatarImg = reader.result;
    localStorage.setItem("avatarImg", avatarImg);
  };
  reader.readAsDataURL(file);
});

document.getElementById("sendBtn").onclick = () => {
  const msg = document.getElementById("chatInput").value.trim();
  if (msg) {
    socket.emit("chat", msg);
    document.getElementById("chatInput").value = "";
  }
};

function addEmoji(emoji) {
  document.getElementById("chatInput").value += emoji;
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1d1d1d",
  physics: { default: "arcade", arcade: { debug: false } },
  scene: { preload, create, update }
};

let cursors;
const game = new Phaser.Game(config);

function preload() {
  this.load.image("tile", "https://i.imgur.com/y7M6zrc.png");
}

function create() {
  this.tileGroup = this.add.group();
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 19; j++) {
      this.add.image(i * 32, j * 32, "tile").setOrigin(0).setScale(2);
    }
  }

  cursors = this.input.keyboard.createCursorKeys();

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("avatarImg", avatarImg);
    socket.emit("playerName", playerName);
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].nameText.destroy();
        players[id].chatText?.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];

      if (!players[id]) {
        const texKey = `avatar-${id}`;
        this.textures.remove(texKey);
        this.textures.addBase64(texKey, data.avatarImg || "");
        const sprite = this.add.sprite(data.x, data.y, texKey).setScale(1);
        const nameText = this.add.text(data.x, data.y - 40, data.name, { font: "14px Arial", fill: "#fff" }).setOrigin(0.5);
        players[id] = { sprite, nameText };
      } else {
        players[id].sprite.setPosition(data.x, data.y);
        players[id].nameText.setPosition(data.x, data.y - 40);
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const p = players[id];
    if (!p) return;
    if (p.chatText) p.chatText.destroy();
    p.chatText = this.add.text(p.sprite.x, p.sprite.y - 60, msg, {
      font: "12px Arial",
      fill: "#fff",
      backgroundColor: "#000",
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.time.delayedCall(3000, () => p.chatText.destroy(), null, this);
  });
}

function update() {
  const p = players[playerId];
  if (!p) return;
  const sprite = p.sprite;
  const speed = 3;
  let moved = false;

  if (cursors.left.isDown && sprite.x > 0) {
    sprite.x -= speed;
    moved = true;
  }
  if (cursors.right.isDown && sprite.x < 800) {
    sprite.x += speed;
    moved = true;
  }
  if (cursors.up.isDown && sprite.y > 0) {
    sprite.y -= speed;
    moved = true;
  }
  if (cursors.down.isDown && sprite.y < 600) {
    sprite.y += speed;
    moved = true;
  }

  if (moved) {
    socket.emit("move", { x: sprite.x, y: sprite.y });
  }
}
