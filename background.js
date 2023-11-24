let isTaskMode = true;
let isRunning = false;
let timerDuration = 15 * 60; // 15 minutes in seconds for task mode
let timeRemaining = timerDuration;
let timerInterval;

function getRandomBreakLength() {
  const rand = Math.random();
  if (rand < 0.5) return 0; // 50% chance of no break
  if (rand < 0.7) return 5 * 60; // 20% chance of a 5-minute break
  if (rand < 0.95) return 15 * 60; // 25% chance of a 15-minute break
  return 60 * 60; // 5% chance of an hour break
}

function updateIcon() {
  if (isRunning) {
    const minutes = Math.floor(timeRemaining / 60);
    chrome.browserAction.setBadgeText({ text: minutes.toString() + 'm' });
  } else {
    chrome.browserAction.setBadgeText({ text: '-' });
  }
}

function toggleTimer() {
  if (!isRunning) {
    chrome.storage.local.get(['isTaskMode', 'timeRemaining'], function(data) {
      isTaskMode = data.isTaskMode !== undefined ? data.isTaskMode : isTaskMode;
      timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : timerDuration;
      if (timeRemaining === 0) {
        isTaskMode = !isTaskMode;
        timerDuration = isTaskMode ? 15 * 60 : getRandomBreakLength();
        timeRemaining = timerDuration;
      }
      timerInterval = setInterval(() => {
        timeRemaining--;
        updateIcon();
        chrome.storage.local.set({ 'timeRemaining': timeRemaining });
        if (timeRemaining === 0) {
          clearInterval(timerInterval);
          // Play sound or show notification
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
chrome.storage.local.get(['isRunning', 'timeRemaining'], function(data) {
  isRunning = data.isRunning !== undefined ? data.isRunning : isRunning;
  timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : timerDuration;
  if (isRunning) {
    toggleTimer();
  }
  updateIcon();
});
