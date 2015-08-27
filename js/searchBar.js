window.onload = function(evt) {
  var SEARCH_ITEMS_ID = "tabster-search-items";
  var SEARCH_BAR_ID = "tabster-search-bar";

  var searchBar = document.getElementById(SEARCH_BAR_ID);
  var searchItems = document.getElementById(SEARCH_ITEMS_ID);

  searchBar.focus();

  var currentFocusTab = null;

  searchBar.onkeyup = function(evt) {
    // Arrow keys
    if (evt.keyCode == 40) {
      searchItems.firstChild.focus();
      return;
    }

    if (evt.ctrlKey && ((evt.keyCode >= 96 && evt.keyCode <= 105) || (evt.keyCode >=48 && evt.keyCode <= 57))) {
      var id = (evt.keyCode >= 96 && evt.keyCode <= 105 ? evt.keyCode - 96 : evt.keyCode - 48);
      chrome.runtime.sendMessage({ method: "switchToTab", args: currentTabs[id].id });
      return;
    }

    // Esc key
    // This is a hacky message passing because this iframe cannot access it's parent (cross origin)
    // and window.postMessage is not working. So we relay the message through the background script to the
    // current active tab to close this iframe.
    if (evt.keyCode == 27) {
      chrome.runtime.sendMessage({ method: "closeSearchOverlay"});
      return;
    }

    searchItems.innerHTML = "";
    
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
            "</h3><span>" + tab.url + "</span></div><div style='clear: both'></div>";

          li.id = "tabster-item-" + i;
          li.tabIndex = i;

          li.onclick = function(evt) {
            chrome.runtime.sendMessage({ method: "switchToTab", args: tabs[i].id });
          }

          li.onkeyup = function(liKeyUpEvent) {
            if (liKeyUpEvent.keyCode == 40) {
              liKeyUpEvent.target.nextSibling ? liKeyUpEvent.target.nextSibling.focus() : searchItems.firstChild.focus();
              liKeyUpEvent.preventDefault();
            } else if (liKeyUpEvent.keyCode == 38) {
              liKeyUpEvent.target.previousSibling ? liKeyUpEvent.target.previousSibling.focus() : searchBar.focus();
              liKeyUpEvent.preventDefault();
            } else if (liKeyUpEvent.keyCode == 13) {
              chrome.runtime.sendMessage({ method: "switchToTab", args: tabs[i].id });
            } else if (liKeyUpEvent.keyCode == 27) {
              chrome.runtime.sendMessage({ method: "closeSearchOverlay"});
            }
          }

          searchItems.appendChild(li);
        });
      } else {
        console.log("<tabster> Rejecting old search request");
      }
    });
  };
}


