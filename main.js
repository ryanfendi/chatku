const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId;
let players = {};
let playerName = localStorage.getItem("playerName") || prompt("Masukkan nama:") || "Anonim";
localStorage.setItem("playerName", playerName);
let avatarImg = localStorage.getItem("avatarImg") || "https://i.imgur.com/uQaaapA.png"; // default pria

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#333",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 } }
  },
  scene: { preload, create, update }
};

let joystick;
let move = { left: false, right: false, up: false, down: false };

const game = new Phaser.Game(config);

function preload() {
  this.load.image("avatar", avatarImg);
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();

  socket.emit("playerData", {
    name: playerName,
    avatarType: "custom",
    avatarImg: avatarImg
  });

  socket.on("init", (id) => {
    playerId = id;
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].nameText.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, "avatar").setScale(2);
        const nameText = this.add.text(data.x, data.y - 40, data.name, {
          font: "14px Arial",
          fill: "#fff"
        }).setOrigin(0.5);
        players[id] = { sprite, nameText };
      } else {
        players[id].sprite.x = data.x;
        players[id].sprite.y = data.y;
        players[id].nameText.x = data.x;
        players[id].nameText.y = data.y - 40;
      }
    }
  });

  socket.on("chat", ({ id, msg }) => {
    const player = players[id];
    if (player) {
      const text = this.add.text(player.sprite.x, player.sprite.y - 60, msg, {
        font: "14px Arial",
        fill: "#fff",
        backgroundColor: "#000",
        padding: { x: 5, y: 3 }
      }).setOrigin(0.5);
      this.time.delayedCall(3000, () => text.destroy());
    }
  });

  // chat
  document.getElementById("chatSend").onclick = () => {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      input.value = "";
    }
  };

  // joystick
  joystick = nipplejs.create({
    zone: document.getElementById('joystick-container'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'white'
  });

  joystick.on('dir', (evt, data) => {
    move.left = data.direction.x === 'left';
    move.right = data.direction.x === 'right';
    move.up = data.direction.y === 'up';
    move.down = data.direction.y === 'down';
  });

  joystick.on('end', () => {
    move = { left: false, right: false, up: false, down: false };
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  if (this.cursors.left.isDown || move.left) {
    player.sprite.x -= 3;
    moved = true;
  }
  if (this.cursors.right.isDown || move.right) {
    player.sprite.x += 3;
    moved = true;
  }
  if (this.cursors.up.isDown || move.up) {
    player.sprite.y -= 3;
    moved = true;
  }
  if (this.cursors.down.isDown || move.down) {
    player.sprite.y += 3;
    moved = true;
  }

  if (moved) {
    socket.emit("move", {
      x: player.sprite.x,
      y: player.sprite.y
    });
  }
}
