var stopWords  = ["the", "a", "an", "is", "he", "she", "are", "and", "it", "its", "for", "was", "were", "of", "that"];

var SEARCH_OVERLAY_ID = "tabster-search-overlay";

var currentTabs = null;

function strip(text) {
  var htmlRemoved = text.replace(/<(?:.|\n)*?>/gm, '');
  var clean = htmlRemoved.replace(/[^A-Za-z0-9\-_ ]/g, ' ');
  return clean;
}

function getKeywords(text, title) {
  var words = text.split(/[ ,]+/);
  var keywords = {};

  words.forEach(function(elem, i, arr) {
    var word = stemmer(elem.toLowerCase());
    if (stopWords.indexOf(word) < 0) {
      if (!(word in keywords)) {
        keywords[word] = 0;
      }
      keywords[word] += 1;
    }
  });

  // Boost title rank
  var titleWords = title.split(/[ ,]+/);

  titleWords.forEach(function(titleWord, i, arr) {
      var word = stemmer(titleWord.toLowerCase());
      if (!(word in keywords)) {
        keywords[word] = 0;
      }
      keywords[word] += 100;
  });

  return keywords;
}

var strippedText = strip(document.body.textContent);
var keyWords = getKeywords(strippedText, document.title);

console.debug(keyWords);

// Send message to the background page
chrome.runtime.sendMessage({ method: "updateIndex", args: keyWords}, function(response) {
    console.log(response);
});

function onKeyUp(evt) {
  // Ctrl+Enter
  if (evt.ctrlKey && evt.keyCode == 13) {
    document.body.appendChild(searchOverlay);
    searchOverlay.style.display = "block";
  } else if (evt.keyCode == 27) {
    try {
      document.body.removeChild(searchOverlay);
    } catch (ex) {
      // ignore
    }
  }
}

function onClick(evt) {
  if (evt.target.id.substring(0,7) != 'tabster') {
    document.body.removeChild(searchOverlay);
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, response) {
  console.log("<tabster> content_script got message: " + request);

  var method = request.method;

  if (method === "closeSearchOverlay") {
    document.body.removeChild(searchOverlay);
  } else {
    console.error("<tabster> Unrecognized request");
  }
});

// Add keypress listened
if (window == top) {
  window.addEventListener('keyup', onKeyUp, false);
  window.addEventListener('click', onClick, false);
}

// Insert the search overlay iframe
// Remove any old searchOverlay
var oldOverlay = document.getElementById(SEARCH_OVERLAY_ID);

if (oldOverlay) {
    oldOverlay.parentNode.removeChild(oldOverlay);
}

var searchOverlay = document.createElement("iframe");
searchOverlay.src = chrome.runtime.getURL("html/search.html");
searchOverlay.id = SEARCH_OVERLAY_ID;
