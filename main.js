const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId = null;
let playerName = "";
let avatarType = "pria";
let players = {};

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1e1e1e",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

let game = null;
let cursors;

function startGame(type) {
  playerName = document.getElementById("nameInput").value || "Anonim";
  avatarType = type;
  document.getElementById("nameForm").style.display = "none";
  document.getElementById("chatUI").style.display = "flex";
  game = new Phaser.Game(config);
}

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
}

function create() {
  this.otherPlayers = {};
  this.chatBubbles = {};

  socket.emit("newPlayer", { name: playerName, avatar: avatarType });

  socket.on("init", (id) => {
    playerId = id;
  });

  socket.on("state", (serverPlayers) => {
    for (const id in this.otherPlayers) {
      if (!serverPlayers[id]) {
        this.otherPlayers[id].avatar.destroy();
        this.otherPlayers[id].label.destroy();
        this.chatBubbles[id]?.destroy();
        delete this.otherPlayers[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      if (!this.otherPlayers[id]) {
        const avatar = this.add.sprite(data.x, data.y, data.avatar).setScale(1.5);
        const label = this.add.text(data.x, data.y - 40, data.name, { font: "14px Arial", fill: "#fff" }).setOrigin(0.5);
        this.otherPlayers[id] = { avatar, label };
      } else {
        this.otherPlayers[id].avatar.x = data.x;
        this.otherPlayers[id].avatar.y = data.y;
        this.otherPlayers[id].label.x = data.x;
        this.otherPlayers[id].label.y = data.y - 40;
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const player = this.otherPlayers[id];
    if (player) {
      const bubble = this.add.text(player.avatar.x, player.avatar.y - 60, msg, {
        font: "14px Arial", fill: "#fff", backgroundColor: "#000", padding: { x: 5, y: 2 }
      }).setOrigin(0.5);
      this.chatBubbles[id]?.destroy();
      this.chatBubbles[id] = bubble;
      setTimeout(() => bubble.destroy(), 3000);
    }
  });

  cursors = this.input.keyboard.createCursorKeys();

  const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.onclick = () => {
  const msg = chatInput.value;
  if (msg.trim() !== "") {
    socket.emit("chat", msg);
    chatInput.value = "";
  }
};

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Hindari submit form default
    sendBtn.click();
  }
});


  this.player = this.add.sprite(400, 300, avatarType).setScale(1.5);
}

function update() {
  if (!this.player) return;
  let moved = false;

  if (cursors.left.isDown) {
    this.player.x -= 3;
    moved = true;
  } else if (cursors.right.isDown) {
    this.player.x += 3;
    moved = true;
  }
  if (cursors.up.isDown) {
    this.player.y -= 3;
    moved = true;
  } else if (cursors.down.isDown) {
    this.player.y += 3;
    moved = true;
  }

  this.player.x = Phaser.Math.Clamp(this.player.x, 0, 800);
  this.player.y = Phaser.Math.Clamp(this.player.y, 0, 600);

  if (moved) {
    socket.emit("move", { x: this.player.x, y: this.player.y });
  }
}
