(function () {
  "use strict";

  var statusTitle = document.getElementById("status-title");
  var statusMessage = document.getElementById("status-message");
  var statusPanel = document.getElementById("catalog-status");
  var categoryCards = document.querySelectorAll("[data-category]");
  var posterEntrance = document.querySelector(".poster-enter-link");
  var librarySection = document.getElementById("library-categories");
  var year = document.getElementById("current-year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  categoryCards.forEach(function (card) {
    card.addEventListener("click", function () {
      var category = card.getAttribute("data-category");

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

  if (posterEntrance && librarySection) {
    posterEntrance.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      librarySection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (window.location.protocol !== "file:") {
    fetch("data/library.json")
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

        document.documentElement.setAttribute(
          "data-release-count",
          String(catalog.releases.length)
        );
      })
      .catch(function () {
        document.documentElement.setAttribute("data-catalog-status", "unavailable");
      });
  } else {
    document.documentElement.setAttribute("data-catalog-status", "local-preview");
  }
})();
