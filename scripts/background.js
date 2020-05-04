let logMsg = {
    0: "--- 0 background running ---",
    "jquery": "--- j jquery-3.5.0 load ----",
    "p5": "--- p p5.js load -----------",
    "ml5": "--- m ml5.js load ----------",
    "bloom": "--- b bloom.js load --------",
    "lang": "--- l language send --------"
}

console.log(logMsg[0]);

let toggle = {}; // tabID: true/false

/* New tab created */
chrome.tabs.onCreated.addListener((tab) => {
    toggle[tab.id] = false;
    return false;
});
/* Old tab removed */
chrome.tabs.onRemoved.addListener((tab) => {
    if (tab.id in toggle)
        delete toggle[tab.id];
    return false;
});

/* --- Switch tabs --- */
chrome.tabs.onActivated.addListener((activeInfo) => {
    // Tab already opened -- debug --
    if (!(activeInfo.tabId in toggle))
        toggle[activeInfo.tabId] = false;

    TabSetIcon(activeInfo.tabId);
    return false;
});

/* --- Update tabs --- */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    toggle[tabId] = false;
    TabSetIcon(tabId);
    return false;
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
            file: "scripts/jquery-3.5.0.slim.min.js"
        });
        console.log(logMsg.jquery);

        chrome.tabs.insertCSS(tab.id, {
            file: "insert_style.css"
        });
        chrome.tabs.executeScript(tab.id, {
            file: "scripts/p5.min.js"
        }, (r) => {
            console.log(logMsg.p5);
            chrome.tabs.executeScript(tab.id, {
                file: "scripts/ml5.min.js"
            }, (r) => {
                console.log(logMsg.ml5);
                chrome.tabs.executeScript(tab.id, {
                    file: "scripts/bloom.js"
                }, (r) => {
                    console.log(logMsg.bloom);
                    chrome.tabs.detectLanguage(tab.id, (lang) => {
                        chrome.tabs.sendMessage(tab.id, {
                            task: "language",
                            id: tab.id,
                            data: lang
                        });
                        console.log(logMsg.lang);
                    });
                });
            });
        });
    } else if (!toggle[tab.id]) {
        // OFF
        TabSetIcon(tab.id);
        // TODO: a more elegant way to remove canvas and restore page
        chrome.tabs.reload(tab.id);
    }
    return false;
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
        // OFF
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