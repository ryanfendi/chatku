const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let playerName = localStorage.getItem("playerName") || "";
let avatarCustom = localStorage.getItem("avatarCustom") || "";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#333",
  physics: { default: "arcade" },
  scene: { preload, create, update }
};

let game = new Phaser.Game(config);

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
  if (avatarCustom) {
    this.load.image("customAvatar", avatarCustom);
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
      avatarType: avatarCustom ? "customAvatar" : avatarType
    });
  });

  socket.on("state", (serverPlayers) => {
    for (let id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        this.nameTags[id].destroy();
        this.chatBubbles[id]?.destroy();
        delete players[id];
      }
    }

    for (let id in serverPlayers) {
      const p = serverPlayers[id];
      const avatarKey = ["pria", "wanita", "customAvatar"].includes(p.avatarType) ? p.avatarType : "pria";

      if (!players[id]) {
        const sprite = this.add.sprite(p.x, p.y, avatarKey).setScale(2);
        const nameText = this.add.text(p.x, p.y - 50, p.name || "Anon", {
          font: "14px Arial", fill: "#fff"
        }).setOrigin(0.5);
        players[id] = { sprite };
        this.nameTags[id] = nameText;
      } else {
        players[id].sprite.x = p.x;
        players[id].sprite.y = p.y;
        this.nameTags[id].x = p.x;
        this.nameTags[id].y = p.y - 50;
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const bubble = this.add.text(players[id].sprite.x, players[id].sprite.y - 70, msg, {
      font: "14px Arial", fill: "#fff", backgroundColor: "#000"
    }).setOrigin(0.5);
    if (this.chatBubbles[id]) this.chatBubbles[id].destroy();
    this.chatBubbles[id] = bubble;
    setTimeout(() => bubble.destroy(), 4000);
  });

  document.getElementById("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  });
}

function update() {
  const me = players[playerId];
  if (!me) return;

  const sprite = me.sprite;
  let moved = false;

  if (this.cursors.left.isDown) {
    sprite.x -= 3; moved = true;
  } else if (this.cursors.right.isDown) {
    sprite.x += 3; moved = true;
  }

  if (this.cursors.up.isDown) {
    sprite.y -= 3; moved = true;
  } else if (this.cursors.down.isDown) {
    sprite.y += 3; moved = true;
  }

  sprite.x = Phaser.Math.Clamp(sprite.x, 0, 800);
  sprite.y = Phaser.Math.Clamp(sprite.y, 0, 600);

  if (moved) {
    socket.emit("move", { x: sprite.x, y: sprite.y });
  }
}

// Avatar & nama handler
function selectAvatar(type) {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Isi nama dulu");
  playerName = name;
  localStorage.setItem("playerName", name);
  localStorage.setItem("avatarType", type);
  avatarType = type;

  const file = document.getElementById("avatarUpload").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("avatarCustom", reader.result);
      location.reload();
    };
    reader.readAsDataURL(file);
  } else {
    location.reload();
  }
}
