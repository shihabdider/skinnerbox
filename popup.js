function getRandomBreakLength() {
  const rand = Math.random();
  if (rand < 0.5) return 0; // 50% chance of no break
  if (rand < 0.7) return 5 * 60; // 20% chance of a 5-minute break
  if (rand < 0.95) return 15 * 60; // 25% chance of a 15-minute break
  return 60 * 60; // 5% chance of an hour break
}

let isTaskMode = true;
let isRunning = false;
let timerDuration = 15 * 60; // 15 minutes in seconds for task mode
let timeRemaining = timerDuration;
let timerInterval;

const timerDisplay = document.getElementById('timer-display');
const timerButton = document.getElementById('timer-button');
const timerSound = document.getElementById('timer-sound');

function updateDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function toggleTimer() {
  if (!isRunning) {
    if (timeRemaining === 0) {
      isTaskMode = !isTaskMode;
      timerDuration = isTaskMode ? 15 * 60 : getRandomBreakLength();
      timeRemaining = timerDuration;
    }
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateDisplay();
      if (timeRemaining === 0) {
        clearInterval(timerInterval);
        timerSound.play();
      }
    }, 1000);
  } else {
    clearInterval(timerInterval);
  }
  isRunning = !isRunning;
}

timerButton.addEventListener('click', toggleTimer);
updateDisplay();
