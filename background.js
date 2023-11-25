let isTaskMode = true;
let isRunning = false;
let isPaused = false; // Track whether the timer is paused
let TASK_DURATION = 15 * 60; // 15 minutes in seconds for task mode
let timerDuration = TASK_DURATION;
let timeRemaining = timerDuration;
let timerInterval;

// Create context menu for setting task duration
const taskDurations = [10, 15, 30, 90]; // Task durations in minutes
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    taskDurations.forEach((duration) => {
      chrome.contextMenus.create({
        id: `set-task-${duration}`,
        title: `Set Task Duration to ${duration} minutes`,
        contexts: ['browser_action'],
      });
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  const match = info.menuItemId.match(/^set-task-(\d+)$/);
  if (match) {
    const newDuration = parseInt(match[1], 10) * 60; // Convert minutes to seconds
    TASK_DURATION = newDuration;
    if (isTaskMode) {
      timerDuration = newDuration;
      timeRemaining = newDuration;
    }
    updateIcon();
    chrome.storage.local.set({ 'timerDuration': timerDuration, 'timeRemaining': timeRemaining });
  }
});

function getRandomBreakLength() {
  const rand = Math.random();
  let breakDuration;
  if (rand < 0.5) {
    breakDuration = Math.floor(TASK_DURATION / 3); // 50% chance of a short break
  } else if (rand < 0.9) {
    breakDuration = TASK_DURATION; // 40% chance of a long break
  } else {
    breakDuration = Math.min(TASK_DURATION * 2, 30 * 60); // 10% chance of a very long break, max 30 minutes
  }
  return breakDuration;
}

function updateIcon() {
  let badgeText = '';
  if (isPaused) {
    badgeText = '-';
  } else if (isRunning) {
    if (timeRemaining < 60) {
      badgeText = timeRemaining.toString() + 's'; // Display seconds when less than one minute left
    } else {
      badgeText = Math.floor(timeRemaining / 60).toString() + 'm'; // Display minutes otherwise
    }
  }
  const badgeColor = isTaskMode ? '#0000FF' : '#008000'; // Blue for task, Green for break
  chrome.browserAction.setBadgeText({ text: badgeText });
  chrome.browserAction.setBadgeBackgroundColor({ color: badgeColor });
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (timeRemaining > 1) {
      timeRemaining--;
      updateIcon();
      chrome.storage.local.set({ 'timeRemaining': timeRemaining });
    } else {
      timerExpired();
    }
  }, 1000);
}

function timerExpired() {
  clearInterval(timerInterval);
  isRunning = false;
  // Randomly decide whether to start a task or a break based on a 50/50 probability
  isTaskMode = Math.random() < 0.5;
  timerDuration = isTaskMode ? TASK_DURATION : getRandomBreakLength();
  timeRemaining = timerDuration;
  try {
    const alarmSound = new Audio('audio/alarm.wav');
    alarmSound.play();
  } catch (error) {
    console.error('Failed to play alarm sound:', error);
  }
  updateIcon();
  chrome.storage.local.set({ 'isTaskMode': isTaskMode, 'timeRemaining': timeRemaining });
}

function toggleTimer() {
  if (isRunning && !isPaused) {
    isPaused = true;
    isRunning = false
    clearInterval(timerInterval);
    updateIcon();
  } else if (isPaused) {
    isPaused = false;
    isRunning = true;
    clearInterval(timerInterval); // Clear any existing interval
    // Update the timer immediately before starting the interval
    if (timeRemaining > 0) {
      timeRemaining--;
      updateIcon();
      chrome.storage.local.set({ 'timeRemaining': timeRemaining });
    }
    startTimer();
  } else {
    isRunning = true;
    isPaused = false;
    updateIcon();
    chrome.storage.local.get(['isTaskMode', 'timeRemaining'], function(data) {
      isTaskMode = data.isTaskMode !== undefined ? data.isTaskMode : isTaskMode;
      timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : timerDuration;
      if (timeRemaining === 0) {
        isTaskMode = Math.random() < 0.5;
        timerDuration = !isTaskMode ? TASK_DURATION : getRandomBreakLength();
        timeRemaining = timerDuration;
      }
      startTimer();
    });
  }
  chrome.storage.local.set({ 'isRunning': isRunning, 'isPaused': isPaused, 'isTaskMode': isTaskMode });
}

chrome.browserAction.onClicked.addListener(function() {
  toggleTimer();
});
