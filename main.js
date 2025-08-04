const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev");

let playerId, players = {}, avatarType = localStorage.getItem("avatarType") || "";

function selectAvatar(type) {
  avatarType = type;
  localStorage.setItem("avatarType", type);
  document.getElementById("avatarSelect").style.display = "none";
  initGame();
}

if (avatarType) {
  document.getElementById("avatarSelect").style.display = "none";
  initGame();
}

function initGame() {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#333",
    physics: { default: "arcade", arcade: { debug: false } },
    scene: { preload, create, update }
  };

  const game = new Phaser.Game(config);
  let cursors;

  function preload() {
    this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
    this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");
  }

  function create() {
    cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.physics.world.setBounds(0, 0, 1600, 1200);

    socket.emit("avatarType", avatarType);
    socket.emit("requestInit");

    socket.on("init", id => {
      playerId = id;
    });

    socket.on("state", data => {
      for (let id in data) {
        const p = data[id];
        if (!players[id]) {
          const avatar = this.physics.add.sprite(p.x, p.y, p.avatarType || "pria").setScale(2);
          avatar.setCollideWorldBounds(true);
          const bubble = this.add.text(p.x, p.y - 40, "", {
            font: "16px Arial",
            fill: "#fff",
            backgroundColor: "#000",
            padding: { x: 5, y: 2 }
          }).setOrigin(0.5).setVisible(false);
          players[id] = { avatar, bubble };
        } else {
          players[id].avatar.setPosition(p.x, p.y);
          players[id].bubble.setPosition(p.x, p.y - 40);
        }
      }

      // Remove disconnected players
      for (let id in players) {
        if (!data[id]) {
          players[id].avatar.destroy();
          players[id].bubble.destroy();
          delete players[id];
        }
      }
    });

    socket.on("chat", ({ id, msg }) => {
      const p = players[id];
      if (p) {
        p.bubble.setText(msg).setVisible(true);
        this.time.delayedCall(3000, () => p.bubble.setVisible(false));
      }
    });

    document.getElementById("chatSend").onclick = () => {
      const input = document.getElementById("chatInput");
      const msg = input.value.trim();
      if (msg !== "") {
        socket.emit("chat", msg);
        input.value = "";
      }
    };

    // Prevent movement when input focused
    document.getElementById("chatInput").addEventListener("keydown", (e) => {
      e.stopPropagation(); // so space works normally
    });
  }

  function update() {
    const player = players[playerId];
    if (!player) return;

    let moved = false;
    const input = document.getElementById("chatInput");
    if (document.activeElement !== input) {
      if (cursors.left.isDown) {
        player.avatar.x -= 3;
        moved = true;
      } else if (cursors.right.isDown) {
        player.avatar.x += 3;
        moved = true;
      }
      if (cursors.up.isDown) {
        player.avatar.y -= 3;
        moved = true;
      } else if (cursors.down.isDown) {
        player.avatar.y += 3;
        moved = true;
      }

      player.avatar.x = Phaser.Math.Clamp(player.avatar.x, 0, 800);
      player.avatar.y = Phaser.Math.Clamp(player.avatar.y, 0, 600);
    }

    if (moved) {
      socket.emit("move", {
        x: player.avatar.x,
        y: player.avatar.y
      });
    }
  }
}
