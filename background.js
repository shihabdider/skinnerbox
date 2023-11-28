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

var blacklist = [];

// Update the blacklist when the storage changes
chrome.storage.onChanged.addListener(function(changes, areaName) {
  if ('blacklistedWebsites' in changes) {
    blacklist = changes.blacklistedWebsites.newValue;
    // Remove previous listeners
    chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
    // Re-add listener with new list
    blocksiteListener();
  }
});

// Function to determine if a URL is in the blacklist
function isUrlBlacklisted(url, blacklist) {
  return blacklist.some(blacklistedUrl => url.includes(blacklistedUrl) || blacklistedUrl.includes(url));
}

// Redirect to blocked.html if the requested URL is blacklisted
// Named function for blocking requests
function blockRequest(details) {
  if (isRunning && !isPaused && isTaskMode) {
    if (isUrlBlacklisted(details.url, blacklist)) {
      return { redirectUrl: chrome.runtime.getURL('blocked.html') };
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ 'blacklistedWebsites': [] }, function() {
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
    // Load blacklisted websites from storage at startup
  chrome.storage.sync.get(['blacklistedWebsites'], function(result) {
    blacklist = result.blacklistedWebsites || [];
    blocksiteListener();  // Setup listener after the blacklist is initialized
  });
});

function blocksiteListener() {
  // Add onRequest listener
  chrome.webRequest.onBeforeRequest.addListener(
    blockRequest,
    { 
      urls: ["<all_urls>"], 
      types: ['main_frame', 'sub_frame'] 
    },
    ["blocking"]);
}

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
  chrome.browserAction.setBadgeBackgroundColor({ color: badgeColor });
  chrome.browserAction.setBadgeText({ text: badgeText });
}

function startTimer() {
  if (isTaskMode) {
    blocksiteListener()
  };
  timerInterval = setInterval(() => {
    if (timeRemaining > 1) {
      timeRemaining--;
      chrome.storage.local.set({ 'timeRemaining': timeRemaining });
      updateIcon();
    } else {
      timerExpired();
    }
  }, 1000);
}

function timerExpired() {
  clearInterval(timerInterval);
  isRunning = false;
  const wasTaskMode = isTaskMode; // Store the mode before it potentially changes
  // Randomly decide whether to start a task or a break based on a win probability
  isTaskMode = Math.random() < (1 - WIN_PROBABILITY);
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
  updateActivityData(wasTaskMode); // Update the activity data with the mode that just ended
}

function toggleTimer() {
  if (isRunning && !isPaused) {
    clearInterval(timerInterval);
    isPaused = true;
    isRunning = false
    updateIcon();
    chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
  } else if (isPaused) {
    isPaused = false;
    isRunning = true;
    clearInterval(timerInterval); // Clear any existing interval
    // Update the timer immediately before starting the interval
    if (timeRemaining > 0) {
      timeRemaining--;
      chrome.storage.local.set({ 'timeRemaining': timeRemaining });
    }
    startTimer();
    updateIcon();
  } else {
    isRunning = true;
    isPaused = false;
    chrome.storage.local.get(['isTaskMode', 'timeRemaining'], function(data) {
      isTaskMode = data.isTaskMode !== undefined ? data.isTaskMode : isTaskMode;
      timeRemaining = data.timeRemaining !== undefined ? data.timeRemaining : timerDuration;
      if (timeRemaining === 0) {
        isTaskMode = Math.random() < (1 - WIN_PROBABILITY)
        timerDuration = isTaskMode ? TASK_DURATION : getRandomBreakLength();
        timeRemaining = timerDuration;
      }
      startTimer();
      updateIcon();
    });
  }
  chrome.storage.local.set({ 'isRunning': isRunning, 'isPaused': isPaused, 'isTaskMode': isTaskMode });
}

chrome.browserAction.onClicked.addListener(function() {
  toggleTimer();
});

// Function to update the activity data for task and break timers
function updateActivityData(isTask) {
  const today = new Date().toISOString().split('T')[0]; // Get current date as YYYY-MM-DD
  chrome.storage.sync.get(['activityData'], function(result) {
    const activityData = result.activityData || {}; // Use existing data or initialize an empty object
    if (!activityData[today]) {
      activityData[today] = { tasks: 0, breaks: 0 };
    }
    if (isTask) {
      activityData[today].tasks += 1; // Increment task count for today
    } else {
      activityData[today].breaks += 1; // Increment break count for today
    }
    chrome.storage.sync.set({ 'activityData': activityData }); // Save the updated data
  });
}
