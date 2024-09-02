let VIDEO = null;
let CANVAS = null;
let CTX = null;
let COLOR_CANVAS = null;
let COLOR_CTX = null;
let SCALER = 0.6;
let SIZE = { x: 0, y: 0, width: 0, height: 0, rows: 3, columns: 3 };
let PIECES = [];
let SELECTED_PIECE = null;
let START_TIME = null;
let END_TIME = null;

let POP_SOUND = new Audio("pop.mp3");
POP_SOUND.volume = 0.3;

let AUDIO_CTX = new (AudioContext||webkitAudioContext||window.webkitAudioContext)();

let keys = {
  DO: 261.6,
  RE: 293.7,
  MI: 329.6
};

function main() {
  CANVAS = canvas;
  CTX = CANVAS.getContext("2d");

  COLOR_CANVAS = colorCanvas;
  COLOR_CTX = COLOR_CANVAS.getContext("2d");

  addEventListeners();

  let promise = navigator.mediaDevices.getUserMedia({
    video: true
  });
  promise.then((signal) => {
    VIDEO = document.createElement("video");
    VIDEO.srcObject = signal;
    VIDEO.play();

    VIDEO.onloadeddata = () => {
      handleResize();
      window.addEventListener("resize", handleResize);
      initializePieces(SIZE.rows, SIZE.columns);
      updateGame();
    }
  }).catch((err) => {
    alert("Camera error: " + err);
  });
}

function setDifficulty() {
  let diff = difficulty.value;
  switch (diff) {
    case "easy":
      initializePieces(3, 3);
      break;
    case "medium":
      initializePieces(5, 5);
      break;
    case "hard":
      initializePieces(10, 10);
      break;
    case "insane":
      initializePieces(40, 25);
      break;
  }
}

function restart() {
  START_TIME = new Date().getTime();
  END_TIME = null;
  randomizePieces();
  menuItems.style.display = "none";
}

function isComplete() {
  for (let i = 0; i < PIECES.length; i++) {
    if (!PIECES[i].correct) {
      return false;
    }
  }
  return true;
}

function updateTime() {
  const now = new Date().getTime();
  if (START_TIME) {
    if (END_TIME) {
      time.innerHTML = formatTime(END_TIME - START_TIME);
    } else {
      time.innerHTML = formatTime(now - START_TIME);
    }
  }
}

function formatTime(miliseconds) {
  const seconds = Math.floor(miliseconds / 1000);
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds % (60 * 60)) / 60);
  const h = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));

  let formattedTime = h.toString().padStart(2, "0");
  formattedTime += ":";
  formattedTime += m.toString().padStart(2, "0");
  formattedTime += ":";
  formattedTime += s.toString().padStart(2, "0");
  return formattedTime;
}

function addEventListeners() {
  CANVAS.addEventListener("mousedown", onMouseDown);
  CANVAS.addEventListener("mousemove", onMouseMove);
  CANVAS.addEventListener("mouseup", onMouseUp);

  CANVAS.addEventListener("touchstart", onTouchStart);
  CANVAS.addEventListener("touchmove", onTouchMove);
  CANVAS.addEventListener("touchend", onTouchEnd);
}

function onMouseDown(evt) {
  const imgData = COLOR_CTX.getImageData(evt.x, evt.y, 1, 1);
  if (imgData.data[3] === 0) {
    return;
  }
  const clickColor = `rgb(${imgData.data[0]}, ${imgData.data[1]}, ${imgData.data[2]})`;
  SELECTED_PIECE = getPressedPieceByColor(evt, clickColor);
  console.log(SELECTED_PIECE)

  //SELECTED_PIECE = getPressedPiece(evt);
  if (SELECTED_PIECE) {
    const idx = PIECES.indexOf(SELECTED_PIECE);
    if (idx > -1) {
      PIECES.splice(idx, 1);
      PIECES.push(SELECTED_PIECE);
    }
    SELECTED_PIECE.offset = {
      x: evt.x - SELECTED_PIECE.x,
      y: evt.y - SELECTED_PIECE.y
    }
    SELECTED_PIECE.correct = false;
  }
}

function onMouseMove(evt) {
  if (SELECTED_PIECE) {
    SELECTED_PIECE.x = evt.x - SELECTED_PIECE.offset.x;
    SELECTED_PIECE.y = evt.y - SELECTED_PIECE.offset.y;
  }
}

function onMouseUp() {
  if (SELECTED_PIECE && SELECTED_PIECE.isClose()) {
    SELECTED_PIECE.snap();
    if (isComplete() && END_TIME == null) {
      const now = new Date().getTime();
      END_TIME = now;
      setTimeout(playMelody, 500);
      showEndScreen();
    }
  }
  SELECTED_PIECE = null;
}

function onTouchStart(evt) {
  let loc = {x: evt.touches[0].clientX, y: evt.touches[0].clientY};
  onMouseDown(loc);
}

function onTouchMove(evt) {
  let loc = {x: evt.touches[0].clientX, y: evt.touches[0].clientY};
  onMouseMove(loc);
}

function onTouchEnd(evt) {
  onMouseUp();
}

function getPressedPiece(loc) {
  for (let i = PIECES.length - 1; i >= 0; i--) {
    if (loc.x > PIECES[i].x && loc.x < PIECES[i].x + PIECES[i].width &&
      loc.y > PIECES[i].y && loc.y < PIECES[i].y + PIECES[i].height) {
      return PIECES[i];
    }
  }
  return null;
}

function getPressedPieceByColor(loc, color) {
  for (let i = PIECES.length - 1; i >= 0; i--) {
    if (PIECES[i].color === color) {
      return PIECES[i];
    }
  }
  return null;
}

function handleResize() {
  CANVAS.width = window.innerWidth;
  CANVAS.height = window.innerHeight;

  COLOR_CANVAS.width = window.innerWidth;
  COLOR_CANVAS.height = window.innerHeight;

  let resizer = SCALER * Math.min(
    window.innerWidth / VIDEO.videoWidth,
    window.innerHeight / VIDEO.videoHeight
  );
  SIZE.width = resizer * VIDEO.videoWidth;
  SIZE.height = resizer * VIDEO.videoHeight;
  SIZE.x = window.innerWidth / 2 - SIZE.width / 2;
  SIZE.y = window.innerHeight / 2 - SIZE.height / 2;
}

function updateGame() {
  CTX.clearRect(0, 0, CANVAS.width, CANVAS.height)
  COLOR_CTX.clearRect(0, 0, COLOR_CANVAS.width, COLOR_CANVAS.height);

  CTX.globalAlpha = 0.5;
  CTX.drawImage(
    VIDEO,
    SIZE.x, SIZE.y,
    SIZE.width, SIZE.height
  );
  CTX.globalAlpha = 1;

  PIECES.forEach((p) => {
    p.draw(CTX);
    p.draw(COLOR_CTX, false);
  });

  updateTime();
  requestAnimationFrame(updateGame);
}

function getRandomColor() {
  const red = Math.floor(Math.random() * 255);
  const green = Math.floor(Math.random() * 255);
  const blue = Math.floor(Math.random() * 255);
  return `rgb(${red}, ${green}, ${blue})`;
}

function initializePieces(rows, columns) {
  SIZE.rows = rows;
  SIZE.columns = columns;
  PIECES = [];
  const uniqueRandomColors = [];
  for (let i = 0; i < SIZE.rows; i++) {
    for (let j = 0; j < SIZE.columns; j++) {
      let color = getRandomColor();
      while (uniqueRandomColors.includes(color)) {
        color = getRandomColor();
      }
      PIECES.push(new Piece(i, j, color));
    }
  }

  // calculate positions for complex puzzle tabs
  let idx = 0;
  for (let i = 0; i < SIZE.rows; i++) {
    for (let j = 0; j< SIZE.columns; j++) {
      const piece = PIECES[idx];

      // bottom tabs
      if (i == SIZE.rows - 1) {
        piece.bottom = null;
      } else {
        // assign a sign to each one of the "tabs" on each piece (-1 being "in", 1 being "out")
        const sign = (Math.random() - 0.5) < 0 ? -1 : 1;
        // allow the tab to be positioned randomly on the piece
        piece.bottom = sign * (Math.random() * 0.4 + 0.3);
      }

      // right tabs
      if (j == SIZE.columns - 1) {
        piece.right = null;
      } else {
        // assign a sign to each one of the "tabs" on each piece (-1 being "in", 1 being "out")
        const sign = (Math.random() - 0.5) < 0 ? -1 : 1;
        // allow the tab to be positioned randomly on the piece
        piece.right = sign * (Math.random() * 0.4 + 0.3);
      }

      // left tabs
      if (j == 0) {
        piece.left = null
      } else {
        piece.left = -PIECES[idx - 1].right;
      }

      // top tabs
      if (i == 0) {
        piece.top = null;
      } else {
        piece.top = -PIECES[idx - SIZE.columns].bottom;
      }

      idx++;
    }
  }
}

function randomizePieces() {
  for (let i = 0; i < PIECES.length; i++) {
    const loc = {
      x: Math.random() * (CANVAS.width - PIECES[i].width),
      y: Math.random() * (CANVAS.height - PIECES[i].height)
    };
    PIECES[i].x = loc.x;
    PIECES[i].y = loc.y;
    PIECES[i].correct = false;
  }
}

class Piece {
  constructor(row, column, color) {
    this.row = row;
    this.column = column;
    this.x = SIZE.x + SIZE.width * this.column / SIZE.columns; // starting x  + width of tile * column index / num of columns
    this.y = SIZE.y + SIZE.height * this.row / SIZE.rows; // starting y  + height of tile * column index / num of rows
    this.width = SIZE.width / SIZE.columns; // width of canvas / num of columns
    this.height = SIZE.height / SIZE.rows;  // height of canvas / num of rows
    this.xCorrect = this.x;
    this.yCorrect = this.y;
    this.correct = true;
    this.color = color;
  }

  draw(ctx, useCam = true) {
    ctx.beginPath();

    // smallest side
    const size = Math.min(this.width, this.height);
    // width of each tab at its base
    const neck = 0.075 * size;
    // width of tab at its widest point
    const tabWidth = 0.25 * size;
    // length of tab
    const tabLength = 0.25 * size;

    //ctx.rect(this.x, this.y, this.width, this.height);
    // from top left
    ctx.moveTo(this.x, this.y);
    // to top right
    if (this.top){
      ctx.lineTo(this.x + this.width * Math.abs(this.top) - neck, this.y);
      ctx.bezierCurveTo(
        this.x + this.width * Math.abs(this.top) - neck, 
        this.y - tabLength * Math.sign(this.top) * 0.2, 

        this.x + this.width * Math.abs(this.top) - tabWidth, 
        this.y - tabLength * Math.sign(this.top),

        this.x + this.width * Math.abs(this.top),
        this.y - tabLength * Math.sign(this.top)
      );
      ctx.bezierCurveTo(
        this.x + this.width * Math.abs(this.top) + tabWidth, 
        this.y - tabLength * Math.sign(this.top),

        this.x + this.width * Math.abs(this.top) + neck, 
        this.y - tabLength * Math.sign(this.top) * 0.2, 

        this.x + this.width * Math.abs(this.top) + neck, 
        this.y
      );
    }
    ctx.lineTo(this.x + this.width, this.y);

    // to bottom right
    if (this.right) {
      ctx.lineTo(this.x + this.width, this.y + this.height * Math.abs(this.right) - neck);
      ctx.bezierCurveTo(
        this.x + this.width - tabLength * Math.sign(this.right) * 0.2,
        this.y + this.height * Math.abs(this.right) - neck,

        this.x + this.width - tabLength * Math.sign(this.right),
        this.y + this.height * Math.abs(this.right) - tabWidth,

        this.x + this.width - tabLength * Math.sign(this.right),
        this.y + this.height * Math.abs(this.right)
      );
      ctx.bezierCurveTo(
        this.x + this.width - tabLength * Math.sign(this.right),
        this.y + this.height * Math.abs(this.right) + tabWidth,

        this.x + this.width - tabLength * Math.sign(this.right) * 0.2,
        this.y + this.height * Math.abs(this.right) + neck,

        this.x + this.width, 
        this.y + this.height * Math.abs(this.right) + neck
      );
    }
    ctx.lineTo(this.x + this.width, this.y + this.height);

    // to bottom left
    if (this.bottom) {
      ctx.lineTo(this.x + this.width * Math.abs(this.bottom) + neck, this.y + this.height);
      ctx.bezierCurveTo(
        this.x + this.width * Math.abs(this.bottom) + neck,
        this.y + this.height + tabLength * Math.sign(this.bottom) * 0.2,

        this.x + this.width * Math.abs(this.bottom) + tabWidth,
        this.y + this.height + tabLength * Math.sign(this.bottom),

        this.x + this.width * Math.abs(this.bottom),
        this.y + this.height + tabLength * Math.sign(this.bottom)
      );
      ctx.bezierCurveTo(
        this.x + this.width * Math.abs(this.bottom) - tabWidth,
        this.y + this.height + tabLength * Math.sign(this.bottom),

        this.x + this.width * Math.abs(this.bottom) - neck,
        this.y + this.height + tabLength * Math.sign(this.bottom) * 0.2,
        
        this.x + this.width * Math.abs(this.bottom) - neck, 
        this.y + this.height
      );
    }
    ctx.lineTo(this.x, this.y + this.height);

    // to top left
    if (this.left) {
      ctx.lineTo(this.x, this.y + this.height * Math.abs(this.left) + neck);
      ctx.bezierCurveTo(
        this.x + tabLength * Math.sign(this.left) * 0.2,
        this.y + this.height * Math.abs(this.left) + neck,

        this.x + tabLength * Math.sign(this.left),
        this.y + this.height * Math.abs(this.left) + tabWidth,

        this.x + tabLength * Math.sign(this.left),
        this.y + this.height * Math.abs(this.left)
      );
      ctx.bezierCurveTo(
        this.x + tabLength * Math.sign(this.left),
        this.y + this.height * Math.abs(this.left) - tabWidth,
        
        this.x + tabLength * Math.sign(this.left) * 0.2,
        this.y + this.height * Math.abs(this.left) - neck,

        this.x, 
        this.y + this.height * Math.abs(this.left) - neck
      );
    }
    ctx.lineTo(this.x, this.y);

    ctx.save();
    ctx.clip();

    const scaledTabHeight = Math.min(
      VIDEO.videoWidth / SIZE.columns,
      VIDEO.videoHeight / SIZE.rows
    ) * tabLength / size;

    if (useCam) {
      ctx.drawImage(
        VIDEO,
        this.column * VIDEO.videoWidth / SIZE.columns - scaledTabHeight,
        this.row * VIDEO.videoHeight / SIZE.rows - scaledTabHeight,
        VIDEO.videoWidth / SIZE.columns + scaledTabHeight * 2,
        VIDEO.videoHeight / SIZE.rows + scaledTabHeight * 2,
        this.x - tabLength, 
        this.y - tabLength,
        this.width + tabLength * 2, 
        this.height + tabLength * 2
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - tabLength, this.y - tabLength, this.width + tabLength * 2, this.height * tabLength * 2);
    }

    ctx.restore();

    ctx.stroke();
  }

  isClose() {
    if (distance({ x: this.x, y: this.y },
      { x: this.xCorrect, y: this.yCorrect }) < this.width / 3) {
      return true;
    }
    return false;
  }

  snap() {
    this.x = this.xCorrect;
    this.y = this.yCorrect;
    this.correct = true;
    POP_SOUND.play();
  }
}

function distance(p1, p2) {
  return Math.hypot((p1.x - p2.x), (p1.y - p2.y));
}

// function to play a note in a key (piano) for a given duration in miliseconds
function playNote(key, duration) {
  let osc = AUDIO_CTX.createOscillator();
  osc.frequency.value = key;
  osc.start(AUDIO_CTX.currentTime);
  osc.stop(AUDIO_CTX.currentTime + duration / 1000);

  let envelope = AUDIO_CTX.createGain();
  osc.connect(envelope);
  osc.type = "triangle";
  envelope.connect(AUDIO_CTX.destination);
  envelope.gain.setValueAtTime(0, AUDIO_CTX.currentTime);
  envelope.gain.linearRampToValueAtTime(0.5, AUDIO_CTX.currentTime + 0.1);
  envelope.gain.linearRampToValueAtTime(0, AUDIO_CTX.currentTime + duration / 1000); 

  setTimeout(() => {
    osc.disconnect();
  }, duration);
}

function playMelody() {
  playNote(keys.MI, 300);
  setTimeout(() => {
    playNote(keys.DO, 300)
  }, 300);
  setTimeout(() => {
    playNote(keys.RE, 150)
  }, 450);
  setTimeout(() => {
    playNote(keys.MI, 600)
  }, 600);
}

function showEndScreen() {
  const time = Math.floor((END_TIME - START_TIME) / 1000);
  scoreValue.innerHTML = `Score: ${time}`;
  endScreen.style.display = "block";
  saveBtn.innerHTML = "Save";
  saveBtn.disabled = false;
}

function showMenu() {
  endScreen.style.display = "none";
  menuItems.style.display = "block";
}

function showScores() {
  endScreen.style.display = "none";
  scoresScreen.style.display = "block";
  scoresContainer.innerHTML = "Loading...";
  getScores();
}

function closeScores() {
  endScreen.style.display = "block";
  scoresScreen.style.display = "none";
}

function getScores() {
  fetch("http://localhost/puzzle-cam/server.php").then((response) => {
    response.json().then((data) => {
      scoresContainer.innerHTML = formatScores(data);
    });
  });
}

function saveScore() {
  const time = END_TIME - START_TIME;
  const name = document.getElementById("name").value;
  if (name == "") {
    alert("Enter your name.");
    return;
  }

  const difficulty = document.getElementById("difficulty").value;
  fetch(`http://localhost/puzzle-cam/server.php?info={
          "name":"${name}",
          "time":"${time}",
          "difficulty":"${difficulty}"
        }`).then((response) => {
    saveBtn.innerHTML = "Saved!";
  });

  saveBtn.disabled = true;
}

function formatScores(data) {
  let html = "<table style='width:100%;text-align:center;'>";

  html += formatScoreTable(data["easy"], "Easy");
  html += formatScoreTable(data["medium"], "Medium");
  html += formatScoreTable(data["hard"], "Hard");
  html += formatScoreTable(data["insane"], "Insane");

  return html;
}

function formatScoreTable(data, header) {
  let html = "<tr style='background:rgb(123,146,196);color:white;'>";
  html += `<td></td><td><b>${header}</b></td><td><b>Time</b></td></tr>`;

  for (let i = 0; i < data.length; i++) {
    html += "<tr>";
    html += `<td>${i+1}.</td><td title='${data[i]["Name"]}'>
            ${data[i]["Name"]}</td><td>${Math.floor(data[i]["Time"] / 1000)}</td></tr>`
  }
  return html;
}