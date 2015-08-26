var stopWords  = ["the", "a", "an", "is", "he", "she"];

var SEARCH_ON = false;
var currentTabs = null;

function strip(text) {
  var htmlRemoved = text.replace(/<(?:.|\n)*?>/gm, '');
  var clean = htmlRemoved.replace(/[^A-Za-z0-9\-_ ]/g, ' ');
  return clean;
}

function getKeywords(text) {
  var words = text.split(/[ ,]+/);
  var keywords = {};

  words.forEach(function(elem, i, arr) {
    var word = stemmer(elem.toLowerCase());
    if (!stopWords.indexOf(word) >= 0) {
      if (!(word in keywords)) {
        keywords[word] = 0;
      }
      keywords[word] += 1;
    }
  });

  return keywords;
}


var strippedText = strip(document.body.textContent);
var keyWords = getKeywords(strippedText);

console.log(keyWords);

// Send message to the background page
chrome.runtime.sendMessage({ method: "updateIndex", args: keyWords}, function(response) {
    console.log(response);
});

function closeSearch() {
    searchOverlay.style.display = "none";
    SEARCH_ON = false;
}

function onKeyUp(evt) {
  // Ctrl+Enter
  if (evt.ctrlKey && evt.keyCode == 13) {
    searchOverlay.style.display = "block";
    searchBar.focus();
    SEARCH_ON = true;
  } else if (evt.keyCode == 27) {
    closeSearch();
  }
}

function onClick(evt) {
  if (evt.target.id.substring(0,7) != 'tabster') {
    closeSearch();
  }
}

var searchOverlay = document.createElement("div");
searchOverlay.id = "tabster-search-overlay";
searchOverlay.innerHTML = "<input type='text' id='tabster-search-bar' placeholder='Search...' /><span id='tabster-tip'>Tip: Go to tab with Ctrl + [tab #]</span>" + 
  "<hr /><ul id='tabster-search-items'></ul>";

document.body.appendChild(searchOverlay);

// Add keypress listened
if (window == top) {
  window.addEventListener('keyup', onKeyUp, false);
  window.addEventListener('click', onClick, false);
}

var searchBar = document.getElementById("tabster-search-bar");
var searchItems = document.getElementById("tabster-search-items");

searchBar.onkeyup = function(evt) {
  searchItems.innerHTML = '';

  if (SEARCH_ON && evt.ctrlKey && ((evt.keyCode >= 96 && evt.keyCode <= 105) || (evt.keyCode >=48 && evt.keyCode <= 57))) {
    var id = (evt.keyCode >= 96 && evt.keyCode <= 105 ? evt.keyCode - 96 : evt.keyCode - 48);
    chrome.runtime.sendMessage({ method: "switchToTab", args: currentTabs[id].id });
    return;
  }

  if (evt.keyCode == 27) {
    closeSearch();
    return;
  }

  var text = evt.target.value;
  // Send message to the background page
  chrome.runtime.sendMessage({ method: "search", args: text}, function(tabs) {
    if (text && searchBar.value == text) {
      // Clear list
      console.log("<tabster> Search results: ")
      console.log(tabs);

      // Set the global currentTabs to this result.
      currentTabs = tabs;

      tabs.forEach(function(tab, i, arr) {
        var li = document.createElement("li");
        li.innerHTML = "";

        url = tab.favIconUrl ? tab.favIconUrl : chrome.extension.getURL("img/favicon.png");

        li.innerHTML = "<img src='"  + url + "' />";
        li.innerHTML += "<div class='tabster-search-item-content'><h3>[" + i + "] " + tab.title + 
          "</h3><span>" + tab.url + "</span></div>";

        li.onclick = function(evt) {
          chrome.runtime.sendMessage({ method: "switchToTab", args: currentTabs[i].id });
        }

        searchItems.appendChild(li);
      });
    } else {
      console.log("<tabster> Rejecting old search request");
    }
  });
};
