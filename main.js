const socket = io("https://aaf75f2e-9363-42c5-8eb9-ebd84ca1bc09-00-1hgnqynbkqk8k.pike.replit.dev/");

let playerId;
let players = {};
let avatarType = localStorage.getItem("avatarType") || "pria";
let playerName = localStorage.getItem("playerName") || "Anonim";
let avatarCustom = localStorage.getItem("avatarCustom");

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#333",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("pria", "https://i.imgur.com/uQaaapA.png");
  this.load.image("wanita", "https://i.imgur.com/bMolfpy.png");

  if (avatarCustom) {
    this.load.image("custom", avatarCustom);
  }
}

function create() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.chatBubbles = {};
  this.nameTags = {};

  socket.on("init", (id) => {
    playerId = id;
    socket.emit("playerData", {
      name: playerName,
      avatarType: avatarCustom ? "custom" : avatarType,
      avatarImg: avatarCustom || null
    });
  });

  socket.on("state", (serverPlayers) => {
    for (const id in players) {
      if (!serverPlayers[id]) {
        players[id].sprite.destroy();
        players[id].bubble.destroy();
        players[id].nameTag.destroy();
        delete players[id];
      }
    }

    for (const id in serverPlayers) {
      const data = serverPlayers[id];
      let tex = "pria";
      if (data.avatarType === "wanita") tex = "wanita";
      else if (data.avatarType === "custom") tex = "custom";

      if (!players[id]) {
        const sprite = this.add.sprite(data.x, data.y, tex).setScale(2).setOrigin(0.5);
        const bubble = this.add.text(data.x, data.y - 40, "", {
          font: "16px Arial",
          fill: "#fff",
          backgroundColor: "#000"
        }).setOrigin(0.5).setVisible(false);

        const nameTag = this.add.text(data.x, data.y - 60, data.name, {
          font: "14px Arial", fill: "#0f0"
        }).setOrigin(0.5);

        players[id] = { sprite, bubble, nameTag };
      } else {
        const p = players[id];
        p.sprite.setPosition(data.x, data.y);
        p.bubble.setPosition(data.x, data.y - 40);
        p.nameTag.setPosition(data.x, data.y - 60);
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

  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg) {
      socket.emit("chat", msg);
      chatInput.value = "";
    }
  });
}

function update() {
  const player = players[playerId];
  if (!player) return;

  let moved = false;
  const speed = 3;
  const sprite = player.sprite;

  if (this.cursors.left.isDown) {
    sprite.x -= speed;
    moved = true;
  } else if (this.cursors.right.isDown) {
    sprite.x += speed;
    moved = true;
  }

  if (this.cursors.up.isDown) {
    sprite.y -= speed;
    moved = true;
  } else if (this.cursors.down.isDown) {
    sprite.y += speed;
    moved = true;
  }

  // Batasi area dalam 800x600
  sprite.x = Phaser.Math.Clamp(sprite.x, 0, 800);
  sprite.y = Phaser.Math.Clamp(sprite.y, 0, 600);

  if (moved) {
    socket.emit("move", {
      x: sprite.x,
      y: sprite.y
    });
  }
}
// Voice Note
let mediaRecorder, voiceChunks = [];

function startVoiceNote() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.ondataavailable = e => voiceChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(voiceChunks, { type: "audio/webm" });
      voiceChunks = [];
      const url = URL.createObjectURL(blob);
      document.getElementById("voiceNoteAudio").src = url;
      document.getElementById("voiceNoteAudio").style.display = "block";
      socket.emit("voiceNote", { blob: url }); // bisa ditingkatkan ke Blob pengiriman
    };

    setTimeout(() => mediaRecorder.stop(), 3000); // Rekam 3 detik
  });
}

// Call
let peerConnection;
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

function startCall(video = false) {
  navigator.mediaDevices.getUserMedia({ audio: true, video }).then(stream => {
    localVideo.srcObject = stream;
    localVideo.style.display = "block";

    peerConnection = new RTCPeerConnection();
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = event => {
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.style.display = "block";
    };

    peerConnection.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("iceCandidate", e.candidate);
      }
    };

    peerConnection.createOffer().then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.emit("call", offer);
    });
  });
}

function startVideoCall() {
  startCall(true);
}

// Handle incoming call
socket.on("call", offer => {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
    localVideo.srcObject = stream;
    localVideo.style.display = "block";

    peerConnection = new RTCPeerConnection();
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = event => {
      remoteVideo.srcObject = event.streams[0];
      remoteVideo.style.display = "block";
    };

    peerConnection.setRemoteDescription(offer);
    peerConnection.createAnswer().then(answer => {
      peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });
  });
});

socket.on("answer", answer => {
  peerConnection.setRemoteDescription(answer);
});

socket.on("iceCandidate", candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
