(function () {
  "use strict";

  var PAGE_SIZE = 24;
  var statusTitle = document.getElementById("status-title");
  var statusMessage = document.getElementById("status-message");
  var statusPanel = document.getElementById("catalog-status");
  var categoryCards = document.querySelectorAll("[data-category]");
  var categoryView = document.getElementById("library-categories");
  var songsView = document.getElementById("songs-catalog");
  var returnButton = document.getElementById("return-to-categories");
  var searchInput = document.getElementById("song-search-input");
  var songGrid = document.getElementById("song-grid");
  var songTotal = document.getElementById("song-total");
  var catalogFeedback = document.getElementById("catalog-feedback");
  var showMoreButton = document.getElementById("show-more");
  var songCategoryCount = document.getElementById("song-category-count");
  var languageFilterButtons = document.querySelectorAll("[data-language-filter]");
  var year = document.getElementById("current-year");
  var songs = [];
  var visibleCount = PAGE_SIZE;
  var catalogPromise = null;
  var activeLanguage = "all";

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  categoryCards.forEach(function (card) {
    card.addEventListener("click", function (event) {
      var category = card.getAttribute("data-category");

      if (card.getAttribute("data-catalog-view") === "songs") {
        event.preventDefault();
        showSongsView();
        return;
      }

      if (statusTitle && category) {
        statusTitle.textContent = category + " — Coming Soon";
      }

      if (statusMessage) {
        statusMessage.textContent =
          "Catalog entries are being prepared. Visit Bandcamp to hear Terry Kash’s available work today.";
      }

      window.setTimeout(function () {
        if (statusPanel) {
          statusPanel.focus({ preventScroll: true });
        }
      }, 450);
    });
  });

  if (returnButton) {
    returnButton.addEventListener("click", showCategoryView);
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      visibleCount = PAGE_SIZE;
      renderSongs();
    });
  }

  if (showMoreButton) {
    showMoreButton.addEventListener("click", function () {
      visibleCount += PAGE_SIZE;
      renderSongs();
    });
  }

  languageFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeLanguage = button.getAttribute("data-language-filter") || "all";
      visibleCount = PAGE_SIZE;

      languageFilterButtons.forEach(function (filterButton) {
        filterButton.setAttribute(
          "aria-pressed",
          String(filterButton === button)
        );
      });

      renderSongs();
    });
  });

  function loadCatalog() {
    if (catalogPromise) {
      return catalogPromise;
    }

    catalogPromise = fetch("data/library.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Catalog could not be loaded.");
        }

        return response.json();
      })
      .then(function (catalog) {
        if (!catalog || !Array.isArray(catalog.releases)) {
          throw new Error("Catalog format is invalid.");
        }

        songs = catalog.releases
          .filter(function (release) {
            return release.type === "song";
          })
          .sort(function (first, second) {
            return String(second.releaseDate || "").localeCompare(
              String(first.releaseDate || "")
            );
          });

        document.documentElement.setAttribute(
          "data-release-count",
          String(catalog.releases.length)
        );
        document.documentElement.setAttribute("data-song-count", String(songs.length));
        if (songCategoryCount) {
          songCategoryCount.textContent =
            songs.length + (songs.length === 1 ? " Song" : " Songs");
        }
        return songs;
      });

    return catalogPromise;
  }

  function showSongsView() {
    if (!categoryView || !songsView) {
      return;
    }

    categoryView.classList.add("is-hidden");
    songsView.classList.remove("is-hidden");
    visibleCount = PAGE_SIZE;
    window.history.replaceState(null, "", "#songs-catalog");
    songsView.scrollIntoView({ behavior: "smooth", block: "start" });

    loadCatalog()
      .then(function () {
        renderSongs();
        if (searchInput) {
          searchInput.focus({ preventScroll: true });
        }
      })
      .catch(function () {
        document.documentElement.setAttribute("data-catalog-status", "unavailable");
        if (songTotal) {
          songTotal.textContent = "Catalog unavailable";
        }
        if (catalogFeedback) {
          catalogFeedback.textContent =
            "The song catalog could not be loaded. Please refresh the page and try again.";
          catalogFeedback.hidden = false;
        }
      });
  }

  function showCategoryView() {
    if (!categoryView || !songsView) {
      return;
    }

    songsView.classList.add("is-hidden");
    categoryView.classList.remove("is-hidden");
    window.history.replaceState(null, "", "#library-categories");
    categoryView.scrollIntoView({ behavior: "smooth", block: "start" });

    var songsCard = document.querySelector('[data-catalog-view="songs"]');
    if (songsCard) {
      songsCard.focus({ preventScroll: true });
    }
  }

  function getFilteredSongs() {
    var query = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
    return songs.filter(function (song) {
      var language = String(song.language || "").trim();
      var languageMatches =
        activeLanguage === "all" ||
        language === activeLanguage;
      var searchMatches =
        !query ||
        (String(song.title || "") + " " + String(song.description || ""))
        .toLocaleLowerCase()
        .includes(query);

      return languageMatches && searchMatches;
    });
  }

  function renderSongs() {
    if (!songGrid || !songTotal || !catalogFeedback || !showMoreButton) {
      return;
    }

    var filteredSongs = getFilteredSongs();
    var songsToShow = filteredSongs.slice(0, visibleCount);
    var queryActive = Boolean(searchInput && searchInput.value.trim());
    var languageFilterActive = activeLanguage !== "all";

    songGrid.replaceChildren();
    songsToShow.forEach(function (song) {
      songGrid.appendChild(createSongCard(song));
    });

    songTotal.textContent =
      filteredSongs.length +
      (filteredSongs.length === 1 ? " matching song" : " matching songs");

    if (filteredSongs.length === 0) {
      catalogFeedback.textContent = queryActive
        ? "No songs match this search and language filter."
        : "No songs match this language filter.";
      catalogFeedback.hidden = false;
    } else {
      catalogFeedback.textContent = queryActive || languageFilterActive
        ? "Showing " + songsToShow.length + " of " + filteredSongs.length + " matching songs."
        : "Showing " + songsToShow.length + " of " + songs.length + " songs.";
      catalogFeedback.hidden = false;
    }

    var hasMore = songsToShow.length < filteredSongs.length;
    showMoreButton.classList.toggle("is-hidden", !hasMore);
    if (hasMore) {
      showMoreButton.textContent =
        "Show More (" + Math.min(PAGE_SIZE, filteredSongs.length - songsToShow.length) + ")";
    }
  }

  function createSongCard(song) {
    var article = document.createElement("article");
    var artworkFrame = document.createElement("div");
    var image = document.createElement("img");
    var content = document.createElement("div");
    var title = document.createElement("h3");
    var details = document.createElement("div");
    var date = document.createElement("time");
    var link = document.createElement("a");

    article.className = "song-card";
    artworkFrame.className = "song-artwork-frame";
    image.className = "song-artwork";
    image.src = song.artwork;
    image.alt = "Cover artwork for " + song.title;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 700;
    image.height = 700;

    content.className = "song-card-content";
    title.textContent = song.title;
    details.className = "song-details";

    date.dateTime = song.releaseDate;
    date.textContent = formatDate(song.releaseDate);
    details.appendChild(date);

    if (String(song.language || "").trim()) {
      var language = document.createElement("span");
      language.textContent = song.language;
      details.appendChild(language);
    }

    content.appendChild(title);
    content.appendChild(details);

    if (String(song.description || "").trim()) {
      var description = document.createElement("p");
      description.textContent = song.description;
      content.appendChild(description);
    }

    link.className = "bandcamp-button";
    link.href = song.bandcampUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Listen on Bandcamp";
    content.appendChild(link);

    artworkFrame.appendChild(image);
    article.appendChild(artworkFrame);
    article.appendChild(content);
    return article;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    var date = new Date(value + "T00:00:00Z");
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  if (window.location.hash === "#songs-catalog") {
    showSongsView();
  } else {
    loadCatalog().catch(function () {
      // Keep the generic category label when a local file preview cannot fetch JSON.
    });
  }
})();
