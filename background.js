let isTaskMode = true;
let isRunning = false;
const TASK_DURATION = 15 * 60; // 15 minutes in seconds for task mode
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds for short break
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds for long break
const VERY_LONG_BREAK_DURATION = 60 * 60; // 60 minutes in seconds for very long break
let timerDuration = TASK_DURATION;
let timeRemaining = timerDuration;
let timerInterval;

function getRandomBreakLength() {
  const rand = Math.random();
  if (rand < 0.5) return 0; // 50% chance of no break
  if (rand < 0.7) return SHORT_BREAK_DURATION; // 20% chance of a short break
  if (rand < 0.95) return LONG_BREAK_DURATION; // 25% chance of a long break
  return VERY_LONG_BREAK_DURATION; // 5% chance of a very long break
}

function updateIcon() {
  const badgeText = isRunning ? Math.floor(timeRemaining / 60).toString() + 'm' : '-';
  const badgeColor = isTaskMode ? '#0000FF' : '#008000'; // Blue for task, Green for break
  chrome.browserAction.setBadgeText({ text: badgeText });
  chrome.browserAction.setBadgeBackgroundColor({ color: badgeColor });
}

function toggleTimer() {
  if (!isRunning) {
    chrome.storage.local.get(['isTaskMode', 'timeRemaining'], function(data) {
      isTaskMode = data.isTaskMode !== undefined ? data.isTaskMode : isTaskMode;
      timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : timerDuration;
      if (timeRemaining === 0) {
        isTaskMode = !isTaskMode;
        timerDuration = isTaskMode ? TASK_DURATION : getRandomBreakLength();
        timeRemaining = timerDuration;
      }
      timerInterval = setInterval(() => {
        timeRemaining--;
        updateIcon();
        chrome.storage.local.set({ 'timeRemaining': timeRemaining });
        if (timeRemaining === 0) {
          clearInterval(timerInterval);
          const alarmSound = new Audio('audio/alarm.wav');
          alarmSound.play();
        }
      }, 1000);
      isRunning = true;
      updateIcon();
    });
  } else {
    clearInterval(timerInterval);
    isRunning = false;
    updateIcon();
  }
  chrome.storage.local.set({ 'isRunning': isRunning, 'isTaskMode': isTaskMode });
}

chrome.browserAction.onClicked.addListener(toggleTimer);
chrome.storage.local.get(['isRunning', 'timeRemaining', 'isTaskMode'], function(data) {
  isRunning = data.isRunning !== undefined ? data.isRunning : isRunning;
  timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : (data.isTaskMode ? TASK_DURATION : getRandomBreakLength());
  if (isRunning) {
    toggleTimer();
  }
  updateIcon();
});
