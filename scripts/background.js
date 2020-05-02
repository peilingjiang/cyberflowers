console.log("--- 0 background running ---");

let toggle = {};

/* New tab created */
chrome.tabs.onCreated.addListener((tab) => {
    toggle[tab.id] = false;
});
/* Old tab removed */
chrome.tabs.onRemoved.addListener((tab) => {
    delete toggle[tab.id];
});

/* --- Switch tabs --- */
chrome.tabs.onActivated.addListener((activeInfo) => {
    // Tab already opened -- debug --
    if (!(activeInfo.tabId in toggle))
        toggle[activeInfo.tabId] = false;
    
    TabSetIcon(activeInfo.tabId);
});

chrome.browserAction.onClicked.addListener((tab) => {
    // Tab already opened -- debug --
    if (!(tab.id in toggle))
        toggle[tab.id] = false;
    
    toggle[tab.id] = !toggle[tab.id];
    if (toggle[tab.id]) {
        // ON
        TabSetIcon(tab.id);
        chrome.tabs.executeScript(tab.id, {
            file: "scripts/p5.min.js"
        }, (results) => {
            chrome.tabs.executeScript(tab.id, {
                file: "scripts/bloom.js"
            });
            chrome.tabs.detectLanguage(tab.id, (lang) => {
                chrome.tabs.sendMessage(tab.id, {
                    task: "language",
                    id: tab.id,
                    data: lang
                });
            });
        });
    } else if (!toggle[tab.id]) {
        // OFF
        TabSetIcon(tab.id);
        // TODO: a more elegant way to remove canvas and restore page
        chrome.tabs.reload(tab.id);
    }
});

let TabSetIcon = (id) => {
    if (toggle[id]) {
        // ON
        chrome.browserAction.setIcon({
            path: {
                "16": "images/bloom16.png",
                "32": "images/bloom32.png",
                "48": "images/bloom48.png",
                "128": "images/bloom128.png"
            },
            tabId: id
        });
    } else if (!toggle[id]) {
        chrome.browserAction.setIcon({
            path: {
                "16": "images/off16.png",
                "32": "images/off32.png",
                "48": "images/off48.png",
                "128": "images/off128.png"
            },
            tabId: id
        });
    }
};