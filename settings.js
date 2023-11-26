document.addEventListener('DOMContentLoaded', function() {
    const blacklistForm = document.getElementById('blacklist-form');
    const blacklistUrlInput = document.getElementById('blacklist-url');
    const blacklist = document.getElementById('blacklist');

    // Load the blacklist from storage and display it
    chrome.storage.local.get(['blacklistedWebsites'], function(result) {
        if (result.blacklistedWebsites) {
            result.blacklistedWebsites.forEach(function(website) {
                addWebsiteToBlacklistUI(website);
            });
        }
    });

    // Add website to blacklist
    blacklistForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const website = blacklistUrlInput.value.trim();
        if (website) {
            addWebsiteToBlacklist(website);
            blacklistUrlInput.value = ''; // Clear input
        }
    });

    // Function to add website to the UI list and save to storage
    function addWebsiteToBlacklist(website) {
        chrome.storage.local.get(['blacklistedWebsites'], function(result) {
            if (chrome.runtime.lastError) {
                console.error(`Error retrieving blacklistedWebsites: ${chrome.runtime.lastError}`);
                return;
            }
            const updatedBlacklist = result.blacklistedWebsites || [];
            if (!updatedBlacklist.includes(website)) {
                updatedBlacklist.push(website);
                chrome.storage.local.set({ 'blacklistedWebsites': updatedBlacklist }, function() {
                    if (chrome.runtime.lastError) {
                        console.error(`Error setting blacklistedWebsites: ${chrome.runtime.lastError}`);
                        return;
                    }
                    addWebsiteToBlacklistUI(website);
                });
            }
        });
    }

    // Add website to the UI list
    function addWebsiteToBlacklistUI(website) {
        const listItem = document.createElement('li');
        listItem.textContent = website;
        const removeButton = document.createElement('span');
        removeButton.textContent = '⌫';  // Use the backspace emoji as the button text
        removeButton.classList.add('remove-button');  // Add the .remove-button class
        removeButton.addEventListener('click', function() {
            listItem.remove();
            removeFromBlacklist(website);
        });
        listItem.appendChild(removeButton);
        blacklist.appendChild(listItem);
    }
    // Function to remove website from the blacklist in storage
    function removeFromBlacklist(website) {
        chrome.storage.local.get(['blacklistedWebsites'], function(result) {
            if (chrome.runtime.lastError) {
                console.error(`Error retrieving blacklistedWebsites: ${chrome.runtime.lastError}`);
                return;
            }
            const updatedBlacklist = result.blacklistedWebsites.filter(function(item) {
                return item !== website;
            });
            chrome.storage.local.set({ 'blacklistedWebsites': updatedBlacklist }, function() {
                if (chrome.runtime.lastError) {
                    console.error(`Error setting blacklistedWebsites: ${chrome.runtime.lastError}`);
                }
            });
        });
    }
});
