const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const winnerMsg = document.getElementById("winner-message");

// Game constants
const PADDLE_WIDTH = 12, PADDLE_HEIGHT = 80;
const BALL_SIZE = 18;
const PLAYER_X = 25, AI_X = canvas.width - 25 - PADDLE_WIDTH;
let playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
let aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;
let ballX = canvas.width / 2 - BALL_SIZE / 2, ballY = canvas.height / 2 - BALL_SIZE / 2;
let ballSpeedX = 5, ballSpeedY = 3.5;
let ballSpeedBase = 5;
let ballPause = false;
let playerScore = 0, aiScore = 0;
let isPlaying = false;
let matchEnded = false;

// Track mouse for player paddle
canvas.addEventListener("mousemove", function (evt) {
  if (!isPlaying || matchEnded) return;
  const rect = canvas.getBoundingClientRect();
  const mouseY = evt.clientY - rect.top;
  playerY = mouseY - PADDLE_HEIGHT / 2;
  // Clamp paddle position
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, playerY));
});

// Draw everything
function draw() {
  // Clear background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw center line
  ctx.strokeStyle = "#333";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw modern paddles
  function drawPaddle(x, y) {
    const grad = ctx.createLinearGradient(x, y, x + PADDLE_WIDTH, y + PADDLE_HEIGHT);
    grad.addColorStop(0, '#f9c80e');
    grad.addColorStop(0.5, '#fff');
    grad.addColorStop(1, '#f86624');
    ctx.save();
    ctx.shadowColor = '#f9c80e';
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + PADDLE_WIDTH - 4, y);
    ctx.quadraticCurveTo(x + PADDLE_WIDTH, y, x + PADDLE_WIDTH, y + 8);
    ctx.lineTo(x + PADDLE_WIDTH, y + PADDLE_HEIGHT - 8);
    ctx.quadraticCurveTo(x + PADDLE_WIDTH, y + PADDLE_HEIGHT, x + PADDLE_WIDTH - 4, y + PADDLE_HEIGHT);
    ctx.lineTo(x + 4, y + PADDLE_HEIGHT);
    ctx.quadraticCurveTo(x, y + PADDLE_HEIGHT, x, y + PADDLE_HEIGHT - 8);
    ctx.lineTo(x, y + 8);
    ctx.quadraticCurveTo(x, y, x + 4, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawPaddle(PLAYER_X, playerY); // Left paddle
  drawPaddle(AI_X, aiY); // Right paddle

  // Draw ball as a circle
  ctx.beginPath();
  ctx.arc(ballX + BALL_SIZE / 2, ballY + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#f9c80e";
  ctx.shadowColor = "#f9c80e";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw score with enhanced style
  ctx.save();
  ctx.font = "bold 40px 'Segoe UI', Arial";
  ctx.textAlign = "center";
  ctx.shadowColor = "#f9c80e";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#fff";
  ctx.fillText(playerScore, canvas.width / 4, 54);
  ctx.fillText(aiScore, canvas.width * 3 / 4, 54);
  ctx.restore();
}

// Simple AI: move paddle towards ball

function moveAI() {
  if (!isPlaying || matchEnded) return;
  // ...existing code...
  // Predict where the ball will be when it reaches the AI paddle
  let predictedY = ballY + ballSpeedY * ((AI_X - ballX) / Math.abs(ballSpeedX));
  // Clamp prediction within canvas
  predictedY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, predictedY - PADDLE_HEIGHT / 2));

  // Add a little imperfection for realism
  const error = (Math.random() - 0.5) * 12;
  predictedY += error;

  // Smoothly move AI paddle toward predicted position
  let centerAI = aiY + PADDLE_HEIGHT / 2;
  let target = predictedY + PADDLE_HEIGHT / 2;
  let speed = 6;
  if (centerAI < target - 8) {
    aiY += speed;
  } else if (centerAI > target + 8) {
    aiY -= speed;
  }
  // Clamp AI paddle position
  aiY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, aiY));
}

// Ball movement and collision
function moveBall() {
  if (!isPlaying || matchEnded || ballPause) return;
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Prevent stuck ball (too slow vertical/horizontal)
  if (Math.abs(ballSpeedX) < 2) ballSpeedX = Math.sign(ballSpeedX) * 2.5;
  if (Math.abs(ballSpeedY) < 1) ballSpeedY = Math.sign(ballSpeedY) * 1.5;

  // Top/bottom wall collision
  if (ballY <= 0 || ballY + BALL_SIZE >= canvas.height) {
    ballSpeedY = -ballSpeedY;
    ballY = Math.max(0, Math.min(canvas.height - BALL_SIZE, ballY));
    playPaddleSound();
  }

  // Left paddle collision
  if (
    ballX <= PLAYER_X + PADDLE_WIDTH &&
    ballX >= PLAYER_X &&
    ballY + BALL_SIZE > playerY &&
    ballY < playerY + PADDLE_HEIGHT
  ) {
    ballSpeedX = -ballSpeedX;
    // Power shot: if hit near edge, increase speed
    let impact = ((ballY + BALL_SIZE / 2) - (playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    ballSpeedY += impact * 2.5;
    if (Math.abs(impact) > 0.7) ballSpeedX *= 1.15;
    ballX = PLAYER_X + PADDLE_WIDTH;
    playPaddleSound();
  }

  // Right paddle collision (AI)
  if (
    ballX + BALL_SIZE >= AI_X &&
    ballX + BALL_SIZE <= AI_X + PADDLE_WIDTH &&
    ballY + BALL_SIZE > aiY &&
    ballY < aiY + PADDLE_HEIGHT
  ) {
    ballSpeedX = -ballSpeedX;
    let impact = ((ballY + BALL_SIZE / 2) - (aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
    ballSpeedY += impact * 2.5;
    if (Math.abs(impact) > 0.7) ballSpeedX *= 1.15;
    ballX = AI_X - BALL_SIZE;
    playPaddleSound();
  }

  // Left/right wall: score
  if (ballX < 0) {
    aiScore++;
    increaseBallSpeed();
    pauseAfterScore();
    resetBall();
    checkWinner();
  } else if (ballX + BALL_SIZE > canvas.width) {
    playerScore++;
    increaseBallSpeed();
    pauseAfterScore();
    resetBall();
    checkWinner();
  }
}
function playPaddleSound() {
  // Short click for paddle hit
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 220;
  gain.gain.value = 0.12;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.08);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
  osc.stop(ctx.currentTime + 0.12);
  osc.onended = () => ctx.close();
}


function playGoalSound() {
  // Simple beep using Web Audio API
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 440;
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  osc.stop(ctx.currentTime + 0.3);
  osc.onended = () => ctx.close();
}

function resetBall() {
  playGoalSound();
  ballX = canvas.width / 2 - BALL_SIZE / 2;
  ballY = canvas.height / 2 - BALL_SIZE / 2;
  // Randomize direction
  ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (ballSpeedBase + Math.random() * 2);
  ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
}

function increaseBallSpeed() {
  ballSpeedBase += 0.7;
}

function pauseAfterScore() {
  ballPause = true;
  setTimeout(() => { ballPause = false; }, 700);
}

function checkWinner() {
  if (playerScore >= 3) {
    matchEnded = true;
    isPlaying = false;
    winnerMsg.textContent = "🏆 You Win!";
    winnerMsg.style.display = "block";
    winnerMsg.classList.add("winner-pop");
    setTimeout(() => winnerMsg.classList.remove("winner-pop"), 800);
  } else if (aiScore >= 3) {
    matchEnded = true;
    isPlaying = false;
    winnerMsg.textContent = "🤖 AI Wins!";
    winnerMsg.style.display = "block";
    winnerMsg.classList.add("winner-pop");
    setTimeout(() => winnerMsg.classList.remove("winner-pop"), 800);
  }
}

// Main game loop
function loop() {
  moveAI();
  moveBall();
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  if (matchEnded) return;
  isPlaying = true;
  winnerMsg.style.display = "none";
}

function resetGame() {
  playerScore = 0;
  aiScore = 0;
  matchEnded = false;
  isPlaying = false;
  winnerMsg.style.display = "none";
  ballSpeedBase = 5;
  resetBall();
  playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
  aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;
  draw();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

loop();