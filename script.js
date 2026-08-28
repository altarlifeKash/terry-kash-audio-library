(function () {
  "use strict";

  var PAGE_SIZE = 12;
  var statusTitle = document.getElementById("status-title");
  var statusMessage = document.getElementById("status-message");
  var statusPanel = document.getElementById("catalog-status");
  var categoryCards = document.querySelectorAll("[data-category]");
  var categoryView = document.getElementById("library-categories");
  var catalogView = document.getElementById("songs-catalog");
  var returnButton = document.getElementById("return-to-categories");
  var searchInput = document.getElementById("song-search-input");
  var catalogGrid = document.getElementById("song-grid");
  var catalogTotal = document.getElementById("song-total");
  var catalogFeedback = document.getElementById("catalog-feedback");
  var showMoreButton = document.getElementById("show-more");
  var languageFilterButtons = document.querySelectorAll("[data-language-filter]");
  var year = document.getElementById("current-year");

  var headingEyebrow = document.querySelector(".songs-heading .eyebrow");
  var headingTitle = document.getElementById("songs-title");
  var searchLabel = document.querySelector('label[for="song-search-input"]');

  var releases = [];
  var visibleCount = PAGE_SIZE;
  var catalogPromise = null;
  var activeLanguage = "all";
  var activeType = "song";

  var viewSettings = {
    song: {
      eyebrow: "Songs & Tracks",
      title: "Songs for the journey",
      searchLabel: "Search songs",
      placeholder: "Search song titles and descriptions",
      singular: "song",
      plural: "songs",
      button: "Listen on Bandcamp",
      hash: "#songs-catalog"
    },
    album: {
      eyebrow: "Albums",
      title: "Complete collections",
      searchLabel: "Search albums",
      placeholder: "Search album titles and descriptions",
      singular: "album",
      plural: "albums",
      button: "Open album on Bandcamp",
      hash: "#albums-catalog"
    },
    audiobook: {
      eyebrow: "Audiobooks",
      title: "Audiobooks for the journey",
      searchLabel: "Search audiobooks",
      placeholder: "Search audiobook titles and descriptions",
      singular: "audiobook",
      plural: "audiobooks",
      button: "Listen on Bandcamp",
      hash: "#audiobooks-catalog"
    }
  };

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  categoryCards.forEach(function (card) {
    card.addEventListener("click", function (event) {
      var category = card.getAttribute("data-category");
      var catalogChoice = card.getAttribute("data-catalog-view");

      if (catalogChoice === "songs") {
        event.preventDefault();
        showCatalogView("song");
        return;
      }

      if (catalogChoice === "albums") {
        event.preventDefault();
        showCatalogView("album");
        return;
      }

      if (catalogChoice === "audiobooks") {
        event.preventDefault();
        showCatalogView("audiobook");
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
      renderCatalog();
    });
  }

  if (showMoreButton) {
    showMoreButton.addEventListener("click", function () {
      visibleCount += PAGE_SIZE;
      renderCatalog();
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

      renderCatalog();
    });
  });

  function loadCatalog() {
    if (catalogPromise) {
      return catalogPromise;
    }

    catalogPromise = fetch("data/library.json", { cache: "no-store" })
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

        releases = catalog.releases.slice().sort(function (first, second) {
          return String(second.releaseDate || "").localeCompare(
            String(first.releaseDate || "")
          );
        });

        updateCategoryCounts();

        document.documentElement.setAttribute(
          "data-release-count",
          String(releases.length)
        );

        return releases;
      });

    return catalogPromise;
  }

  function updateCategoryCounts() {
    ["song", "album", "audiobook"].forEach(function (type) {
      var count = releases.filter(function (release) {
        return release.type === type;
      }).length;

      var countElement = document.querySelector(
        '[data-count-type="' + type + '"]'
      );

      if (countElement) {
        countElement.textContent =
          count + " " + (count === 1 ? type : type + "s");
      }
    });
  }

  function showCatalogView(type) {
    if (!categoryView || !catalogView || !viewSettings[type]) {
      return;
    }

    activeType = type;
    activeLanguage = "all";
    visibleCount = PAGE_SIZE;

    if (searchInput) {
      searchInput.value = "";
    }

    languageFilterButtons.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.getAttribute("data-language-filter") === "all")
      );
    });

    updateViewText();

    categoryView.classList.add("is-hidden");
    catalogView.classList.remove("is-hidden");

    window.history.replaceState(null, "", viewSettings[type].hash);
    catalogView.scrollIntoView({ behavior: "smooth", block: "start" });

    loadCatalog()
      .then(function () {
        renderCatalog();

        if (searchInput) {
          searchInput.focus({ preventScroll: true });
        }
      })
      .catch(function () {
        document.documentElement.setAttribute(
          "data-catalog-status",
          "unavailable"
        );

        if (catalogTotal) {
          catalogTotal.textContent = "Catalog unavailable";
        }

        if (catalogFeedback) {
          catalogFeedback.textContent =
            "The catalog could not be loaded. Please refresh the page and try again.";
          catalogFeedback.hidden = false;
        }
      });
  }

  function updateViewText() {
    var settings = viewSettings[activeType];

    if (headingEyebrow) {
      headingEyebrow.textContent = settings.eyebrow;
    }

    if (headingTitle) {
      headingTitle.textContent = settings.title;
    }

    if (searchLabel) {
      searchLabel.textContent = settings.searchLabel;
    }

    if (searchInput) {
      searchInput.placeholder = settings.placeholder;
    }
  }

  function showCategoryView() {
    if (!categoryView || !catalogView) {
      return;
    }

    catalogView.classList.add("is-hidden");
    categoryView.classList.remove("is-hidden");

    window.history.replaceState(null, "", "#library-categories");
    categoryView.scrollIntoView({ behavior: "smooth", block: "start" });

    var activeCard = document.querySelector(
      '[data-catalog-view="' +
        (
          activeType === "album"
            ? "albums"
            : activeType === "audiobook"
              ? "audiobooks"
              : "songs"
        ) +
        '"]'
    );

    if (activeCard) {
      activeCard.focus({ preventScroll: true });
    }
  }

  function getFilteredReleases() {
    var query = searchInput
      ? searchInput.value.trim().toLocaleLowerCase()
      : "";

    return releases.filter(function (release) {
      if (release.type !== activeType) {
        return false;
      }

      var language = String(release.language || "").trim();

      var languageMatches =
        activeLanguage === "all" || language === activeLanguage;

      var searchMatches =
        !query ||
        (
          String(release.title || "") +
          " " +
          String(release.description || "")
        )
          .toLocaleLowerCase()
          .includes(query);

      return languageMatches && searchMatches;
    });
  }

  function renderCatalog() {
    if (
      !catalogGrid ||
      !catalogTotal ||
      !catalogFeedback ||
      !showMoreButton
    ) {
      return;
    }

    var settings = viewSettings[activeType];
    var filteredReleases = getFilteredReleases();
    var releasesToShow = filteredReleases.slice(0, visibleCount);
    var queryActive = Boolean(searchInput && searchInput.value.trim());
    var languageFilterActive = activeLanguage !== "all";

    catalogGrid.replaceChildren();

    releasesToShow.forEach(function (release) {
      catalogGrid.appendChild(createReleaseCard(release));
    });

    catalogTotal.textContent =
      filteredReleases.length +
      " matching " +
      (filteredReleases.length === 1
        ? settings.singular
        : settings.plural);

    if (filteredReleases.length === 0) {
      catalogFeedback.textContent = queryActive
        ? "No " +
          settings.plural +
          " match this search and language filter."
        : "No " + settings.plural + " match this language filter.";

      catalogFeedback.hidden = false;
    } else {
      catalogFeedback.textContent =
        queryActive || languageFilterActive
          ? "Showing " +
            releasesToShow.length +
            " of " +
            filteredReleases.length +
            " matching " +
            settings.plural +
            "."
          : "Showing " +
            releasesToShow.length +
            " of " +
            filteredReleases.length +
            " " +
            settings.plural +
            ".";

      catalogFeedback.hidden = false;
    }

    var hasMore = releasesToShow.length < filteredReleases.length;
    showMoreButton.classList.toggle("is-hidden", !hasMore);

    if (hasMore) {
      showMoreButton.textContent =
        "Show More (" +
        Math.min(
          PAGE_SIZE,
          filteredReleases.length - releasesToShow.length
        ) +
        ")";
    }
  }

  function createReleaseCard(release) {
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
    image.src = release.artwork;
    image.alt = "Cover artwork for " + release.title;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 700;
    image.height = 700;

    content.className = "song-card-content";
    title.textContent = release.title;
    details.className = "song-details";

    date.dateTime = release.releaseDate;
    date.textContent = formatDate(release.releaseDate);
    details.appendChild(date);

    if (String(release.language || "").trim()) {
      var language = document.createElement("span");
      language.textContent = release.language;
      details.appendChild(language);
    }

    content.appendChild(title);
    content.appendChild(details);

    if (String(release.description || "").trim()) {
      var description = document.createElement("p");
      description.textContent = release.description;
      content.appendChild(description);
    }

    link.className = "bandcamp-button";
    link.href = release.bandcampUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = viewSettings[activeType].button;

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
    showCatalogView("song");
  } else if (window.location.hash === "#albums-catalog") {
    showCatalogView("album");
  } else if (window.location.hash === "#audiobooks-catalog") {
    showCatalogView("audiobook");
  } else {
    loadCatalog().catch(function () {
      document.documentElement.setAttribute(
        "data-catalog-status",
        "unavailable"
      );
    });
  }
})();
