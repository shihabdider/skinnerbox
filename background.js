let isTaskMode = true;
let isRunning = false;
let isPaused = false; // Track whether the timer is paused
// const TASK_DURATION = 15 * 60; // 15 minutes in seconds for task mode
// const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds for short break
// const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds for long break
// const VERY_LONG_BREAK_DURATION = 60 * 60; // 60 minutes in seconds for very long break
const TASK_DURATION = 5
const SHORT_BREAK_DURATION = 5
const LONG_BREAK_DURATION = 10
const VERY_LONG_BREAK_DURATION = 15
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
  let badgeText = isPaused ? '-' : isRunning ? Math.floor(timeRemaining / 60).toString() + 'm' : '';
  const badgeColor = isTaskMode ? '#0000FF' : '#008000'; // Blue for task, Green for break
  chrome.browserAction.setBadgeText({ text: badgeText });
  chrome.browserAction.setBadgeBackgroundColor({ color: badgeColor });
}

function toggleTimer() {
  if (isRunning && !isPaused) {
    clearInterval(timerInterval);
    isPaused = true;
    isRunning = false
    updateIcon();
  } else if (isPaused) {
    clearInterval(timerInterval); // Clear any existing interval
    timerInterval = setInterval(() => {
      if (timeRemaining > 0) {
        timeRemaining--;
        updateIcon();
        chrome.storage.local.set({ 'timeRemaining': timeRemaining });
        if (timeRemaining === 0) {
          clearInterval(timerInterval);
          isRunning = false;
          isTaskMode = !isTaskMode;
          try {
            const alarmSound = new Audio('audio/alarm.wav');
            alarmSound.play();
            updateIcon();
          } catch (error) {
            console.error('Failed to play alarm sound:', error);
          }
        }
      }
    }, 1000);
    isPaused = false;
    isRunning = true;
  } else {
    chrome.storage.local.get(['isTaskMode', 'timeRemaining'], function(data) {
      isTaskMode = data.isTaskMode !== undefined ? data.isTaskMode : isTaskMode;
      timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : timerDuration;
      if (timeRemaining === 0) {
        isTaskMode = !isTaskMode;
        timerDuration = isTaskMode ? TASK_DURATION : getRandomBreakLength();
        timeRemaining = timerDuration;
      }
      timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
          timeRemaining--;
          updateIcon();
          chrome.storage.local.set({ 'timeRemaining': timeRemaining });
          if (timeRemaining === 0) {
            clearInterval(timerInterval);
            isRunning = false;
            isTaskMode = !isTaskMode;
            const alarmSound = new Audio('audio/alarm.wav');
            alarmSound.play();
            updateIcon();
          }
        }
      }, 1000);
      isRunning = true;
      isPaused = false;
      updateIcon();
    });
  }
  chrome.storage.local.set({ 'isRunning': isRunning, 'isPaused': isPaused, 'isTaskMode': isTaskMode });
}

chrome.browserAction.onClicked.addListener(function() {
  if (!isRunning && timeRemaining === 0) {
    // Decide whether to start a task or a break based on a 50/50 probability
    isTaskMode = Math.random() < 0.5;
    timerDuration = isTaskMode ? TASK_DURATION : getRandomBreakLength();
    timeRemaining = timerDuration;
    chrome.storage.local.set({ 'isTaskMode': isTaskMode, 'timeRemaining': timeRemaining });
  }
  toggleTimer();
});
