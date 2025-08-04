const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");

let playerId, playerName, avatarType, customAvatar = null;
let players = {};

const tileSize = 64;
const mapWidth = 10;
const mapHeight = 8;

document.getElementById("emojiBtn").onclick = () => {
  document.getElementById("emojiPicker").style.display ^= "block";
};
document.querySelectorAll(".emoji").forEach(el => {
  el.onclick = () => {
    const input = document.getElementById("chatInput");
    input.value += el.textContent;
    document.getElementById("emojiPicker").style.display = "none";
  };
});

function selectType(type) {
  avatarType = type;
  localStorage.setItem("avatarType", type);
}

function startGame() {
  playerName = document.getElementById("nameInput").value.trim() || "Anonim";
  localStorage.setItem("playerName", playerName);
  const file = document.getElementById("avatarUpload").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      customAvatar = reader.result;
      localStorage.setItem("customAvatar", customAvatar);
      initGame();
    };
    reader.readAsDataURL(file);
  } else {
    customAvatar = null;
    localStorage.removeItem("customAvatar");
    initGame();
  }
}

function initGame() {
  document.getElementById("setup").style.display = "none";

  const config = {
    type: Phaser.AUTO,
    width: tileSize * mapWidth,
    height: tileSize * mapHeight,
    backgroundColor: "#333",
    physics: { default: "arcade" },
    scene: { preload, create, update }
  };

  new Phaser.Game(config);
}

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
}

function create() {
  const self = this;
  this.cursors = this.input.keyboard.createCursorKeys();
  this.chatBubbles = {};

  playerId = socket.id;

  socket.emit("initPlayer", {
    name: localStorage.getItem("playerName"),
    avatarType: localStorage.getItem("avatarType"),
    customAvatar: localStorage.getItem("customAvatar")
  });

  socket.on("state", data => {
    for (const id in data) {
      if (!players[id]) {
        const p = data[id];
        let sprite;
        if (p.customAvatar) {
          this.textures.addBase64(id, p.customAvatar);
          sprite = this.add.sprite(p.x, p.y, id).setDisplaySize(48, 48);
        } else {
          sprite = this.add.sprite(p.x, p.y, p.avatarType).setScale(2);
        }
        const nameTag = this.add.text(p.x, p.y - 40, p.name, {
          fontSize: "14px", fill: "#fff"
        }).setOrigin(0.5);
        players[id] = { sprite, nameTag };
      } else {
        players[id].sprite.x = data[id].x;
        players[id].sprite.y = data[id].y;
        players[id].nameTag.x = data[id].x;
        players[id].nameTag.y = data[id].y - 40;
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const p = players[id];
    if (!p) return;
    if (this.chatBubbles[id]) this.chatBubbles[id].destroy();
    this.chatBubbles[id] = this.add.text(p.sprite.x, p.sprite.y - 60, msg, {
      fontSize: "14px", backgroundColor: "#000", color: "#fff", padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    this.time.delayedCall(3000, () => this.chatBubbles[id]?.destroy());
  });

  document.getElementById("chatSend").onclick = () => {
    const msg = document.getElementById("chatInput").value.trim();
    if (msg) {
      socket.emit("chat", msg);
      document.getElementById("chatInput").value = "";
    }
  };
}

function update() {
  const player = players[socket.id];
  if (!player) return;

  const speed = 2;
  const sprite = player.sprite;
  let moved = false;

  if (this.cursors.left.isDown && sprite.x > 0) {
    sprite.x -= speed; moved = true;
  }
  if (this.cursors.right.isDown && sprite.x < tileSize * mapWidth) {
    sprite.x += speed; moved = true;
  }
  if (this.cursors.up.isDown && sprite.y > 0) {
    sprite.y -= speed; moved = true;
  }
  if (this.cursors.down.isDown && sprite.y < tileSize * mapHeight) {
    sprite.y += speed; moved = true;
  }

  if (moved) {
    socket.emit("move", { x: sprite.x, y: sprite.y });
  }
}
