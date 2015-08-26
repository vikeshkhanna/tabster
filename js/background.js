console.log("<tabster> Background page loaded");

// Maps the tab ID to the latest revision number
var tabMap = {}
// The core index. Maps each word to a list of 
var index = {}

// Prune invalid pages in index on every 100th request
var pruneInterval = 10;
var indexUpdateRequestCnt = 0;

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

      if (obj.revision != latestRevision) {
        toDeleteIndices.push(i);
      }
    });

    toDeleteIndices.forEach(function(index, i, arr) {
      delete tabs[index];
    });
  }
}

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
          if (!(tabItem.tab.id in ranks)) {
            ranks[tabItem.tab.id] = {
              rank: 0,
              tab: tabItem.tab
          };
        }

        // Add rank contributed by this tab
        ranks[tabItem.tab.id].rank += tabItem.rank;
      }
    });
  }
});

var tabs = Object.keys(ranks).map(function(key) {
  return ranks[key].tab;
})
// Sort in the descending order of ranks.
return tabs.sort(function(tab1, tab2) { return ranks[tab2.id] - ranks[tab1.id] });
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
  } else {
      console.log("<tabster> invalid request");
      sendResponse("Error");
    }
  }
);
