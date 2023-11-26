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

    // Add website to the UI list and save to storage
    function addWebsiteToBlacklist(website) {
        addWebsiteToBlacklistUI(website);
        chrome.storage.local.get(['blacklistedWebsites'], function(result) {
            const updatedBlacklist = result.blacklistedWebsites || [];
            updatedBlacklist.push(website);
            chrome.storage.local.set({ 'blacklistedWebsites': updatedBlacklist });
        });
    }

    // Add website to the UI list
    function addWebsiteToBlacklistUI(website) {
        const listItem = document.createElement('li');
        listItem.textContent = website;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', function() {
            listItem.remove();
            removeFromBlacklist(website);
        });
        listItem.appendChild(removeButton);
        blacklist.appendChild(listItem);
    }

    // Remove website from the blacklist in storage
    function removeFromBlacklist(website) {
        chrome.storage.local.get(['blacklistedWebsites'], function(result) {
            const updatedBlacklist = result.blacklistedWebsites.filter(function(item) {
                return item !== website;
            });
            chrome.storage.local.set({ 'blacklistedWebsites': updatedBlacklist });
        });
    }
});
