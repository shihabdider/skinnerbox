let isTaskMode = true;
let isRunning = false;
let isPaused = false; // Track whether the timer is paused

const WIN_PROBABILITY = 0.45
let TASK_DURATION = 15 * 60; // 15 minutes in seconds for task mode
let timerDuration = TASK_DURATION;
let timeRemaining = timerDuration;
let timerInterval;

// Create context menu for setting task duration
const taskDurations = [10, 15, 30, 90]; // Task durations in minutes
// Function to determine if a URL is in the blacklist
function isUrlBlacklisted(url, blacklist) {
  return blacklist.some(blacklistedUrl => url.includes(blacklistedUrl));
}

// Redirect to blocked.html if the requested URL is blacklisted
// Named function for blocking requests
function blockRequest(details) {
  if (isRunning && !isPaused && isTaskMode) {
    return chrome.storage.local.get(['blacklistedWebsites'], function(result) {
      if (result.blacklistedWebsites && isUrlBlacklisted(details.url, result.blacklistedWebsites)) {
        return { redirectUrl: chrome.runtime.getURL('blocked.html') };
      }
    });
  }
}

// Use the named function when adding the listener
chrome.webRequest.onBeforeRequest.addListener(
  blockRequest,
  { urls: ["<all_urls>"] },
  ["blocking"]
);

chrome.runtime.onInstalled.addListener(() => {
  // ... existing code ...
});

chrome.contextMenus.onClicked.addListener((info) => {
  const match = info.menuItemId.match(/^set-task-(\d+)$/);
  if (match) {
    const newDuration = parseInt(match[1], 10); // Duration in minutes
    TASK_DURATION = newDuration * 60; // Convert minutes to seconds
    if (isTaskMode) {
      timerDuration = TASK_DURATION;
      timeRemaining = TASK_DURATION;
    }
    updateIcon();
    chrome.storage.local.set({ 'timerDuration': timerDuration, 'timeRemaining': timeRemaining });
    // Create a notification for the new task duration
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: 'Task Duration Updated',
      message: `Task duration set to ${newDuration} minutes.`,
      priority: 1
    });
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
  // ... existing code ...
  // No need to add the listener again if it's already there
}

function timerExpired() {
  clearInterval(timerInterval);
  isRunning = false;
  // Randomly decide whether to start a task or a break based on a win probability
  isTaskMode = Math.random() < (1 - WIN_PROBABILITY)
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
  // ... existing code ...
  if (!isRunning) {
    // Stop blocking web requests when the timer is not running
    chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
  }
}

chrome.browserAction.onClicked.addListener(function() {
  toggleTimer();
});
