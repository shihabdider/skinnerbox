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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 'blacklistedWebsites': [] }, function() {
    console.log("Initial blacklisted websites set up in storage.");
  });
  chrome.contextMenus.removeAll(() => {
    const parentMenuId = chrome.contextMenus.create({
      id: 'parent-task-duration',
      title: 'Set Task Duration',
      contexts: ['browser_action'],
    });
    taskDurations.forEach((duration) => {
      chrome.contextMenus.create({
        id: `set-task-${duration}`,
        parentId: parentMenuId,
        title: `${duration} minutes`,
        contexts: ['browser_action'],
      });
    });
  });
});

// Feedback for selecting task duration
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
  if (isTaskMode) {
    chrome.storage.local.get(['blacklistedWebsites'], function(result) {
      const blacklist = result.blacklistedWebsites || [];
      chrome.webRequest.onBeforeRequest.addListener(
        function(details) {
          if (isUrlBlacklisted(details.url, blacklist)) {
            return { redirectUrl: chrome.runtime.getURL('blocked.html') };
          }
        },
        { urls: blacklist.map(urlPattern => `*://*/*${urlPattern}*/*`) },
        ["blocking"]
      );
    });
  }
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
  chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
  chrome.storage.local.set({ 'isTaskMode': isTaskMode, 'timeRemaining': timeRemaining });
}

function toggleTimer() {
  if (isRunning && !isPaused) {
    isPaused = true;
    isRunning = false
    clearInterval(timerInterval);
    updateIcon();
    chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
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
        isTaskMode = Math.random() < (1 - WIN_PROBABILITY)
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
