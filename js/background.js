console.log("<tabster> Background page loaded");

// Maps the tab ID to the latest revision number
var tabMap = {}
// The core index. Maps each word to a list of 
var index = {}

// Prune invalid pages in index on every 100th request
var pruneInterval = 50;
var indexUpdateRequestCnt = 0;

var initDone = false;

function updateIndex(tab, keyWords) {
  var tabId = tab.id;

  // Update revision
  if (!(tabId in tabMap)) {
    tabMap[tabId] = 0;
  }

  tabMap[tabId] += 1;
  indexUpdateRequestCnt += 1;

  for (word in keyWords) {
    // Discard empty string and such
    if (word) {
      var cnt = keyWords[word];
      
      try {
          // Initialize with empty list
          if (!(word in index)) {
            index[word] = [];
          }

          // Push the tab object
          index[word].push({
            tab : tab,
            revision : tabMap[tabId],
            rank : cnt
          });
      } catch (ex) {
        console.error("<tabster> exception while updating index: " + ex);
      }
    }
  }

  // console.log(index);
  if (indexUpdateRequestCnt % pruneInterval == 0) {
    pruneIndex();
  }
}

function pruneIndex() {
  console.log("<tabster> Pruning index");
  for (word in index) {
    var tabs = index[word];
    var toDeleteIndices = [];

    tabs.forEach(function(tabItem, i, arr) {
      var latestRevision = tabMap[tabItem.tab.id];

      if (tabItem.revision != latestRevision) {
        toDeleteIndices.push(i);
      }
    });

    toDeleteIndices.forEach(function(index, i, arr) {
      delete tabs[index];
    });
  }
}


// TODO: hacky algorithm / heuristics. Do better.
function search(text) {
  // Rank Ordered list of tab IDs
  var result = [];
  var ranks = {};
  var words = text.split(/[ ,]+/);

  // For each word in query
  words.forEach(function(elem, i, arr) {
        var word = stemmer(elem.toLowerCase());
        if (word in index) {
          console.log("<tabster> " + word + " found in index!");
          var tabs = index[word];

          tabs.forEach(function(tabItem, i, arr) {
            // tab is latest
            if (tabItem.revision == tabMap[tabItem.tab.id]) {
              // This tab is being added for the firs time
              if (!(tabItem.tab.id in ranks)) {
                ranks[tabItem.tab.id] = {
                  rank: tabItem.rank,
                  tab: tabItem.tab
              };
            } else {
                // Add rank contributed by this tab.
                // Every subsequent word gets a boost. Why 5, you ask? Good question.
                ranks[tabItem.tab.id].rank += 10*tabItem.rank;
            }
          }
        });
      }
  });

  console.debug("<tabster> ranks for term: " + text);
  console.debug(ranks);

  var tabs = Object.keys(ranks).map(function(key) {
    return ranks[key].tab;
  })
  // Sort in the descending order of ranks.
  return tabs.sort(function(tab1, tab2) { return ranks[tab2.id].rank - ranks[tab1.id].rank });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    var args = request.args;
    console.log("<tabster> method : " + request.method);
    console.log("<tabster> args : " + args);

    if (request.method === "updateIndex") {
        updateIndex(sender.tab, args);
        sendResponse("Updated index for Id : " + sender.tab.id);
    } else if (request.method === "search") {
        sendResponse(search(args));
    } else if (request.method === "switchToTab") {
        // chrome.tabs is unavailable in content scripts
        chrome.tabs.update(parseInt(args), { selected: true });
        sendResponse("Switched to tab: " + args);
    } else if (request.method === "closeSearchOverlay") {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, request);
      });
    }else {
        console.log("<tabster> invalid request");
        sendResponse("Error");
      }
    }
);

var scripts = [
    'js/porter.js',
    'js/content_script.js'
];

// Inject content script into pages in the beginning without refresh.
chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab, i, arr) {
        scripts.forEach(function(script, i, scriptArray) {
            chrome.tabs.executeScript(tab.id, { file: script }, function() {
            if (chrome.runtime.lastError) {
                console.error("<tabster> Cannot inject script: " + script + " to tabId: " + tab.id);
            } else {
                console.log("<tabster> Injected script: " + script + " to tabId: " + tab.id);
            }
        });
      });
   });
});

// Update revision for closed tab - This invalidates all existing index items.
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    console.log("<tabster> Removing tab from index: " + tabId);
    tabMap[tabId] += 1;
});
