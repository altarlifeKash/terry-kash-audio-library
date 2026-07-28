(function () {
  "use strict";

  var date = document.getElementById("sync-date");
  var catalogCount = document.getElementById("catalog-release-count");
  var libraryCount = document.getElementById("library-release-count");
  var newCount = document.getElementById("new-release-count");
  var importedPanel = document.getElementById("imported-release-panel");
  var importedList = document.getElementById("imported-release-list");
  var message = document.getElementById("sync-status-message");

  fetch("data/sync-status.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Sync report could not be loaded.");
      return response.json();
    })
    .then(function (status) {
      date.textContent = status.lastSync
        ? new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short"
          }).format(new Date(status.lastSync))
        : "Not run yet";
      catalogCount.textContent = String(status.catalogReleaseCount);
      libraryCount.textContent = String(status.libraryReleaseCount);
      newCount.textContent = String(status.newReleaseCount);

      if (Array.isArray(status.imported) && status.imported.length > 0) {
        status.imported.forEach(function (release) {
          var item = document.createElement("li");
          var link = document.createElement("a");
          link.href = release.bandcampUrl;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = release.title;
          item.appendChild(link);
          importedList.appendChild(item);
        });
        importedPanel.hidden = false;
        message.textContent =
          status.imported.length === 1
            ? "The library is current. One new release was imported."
            : "The library is current. " +
              status.imported.length +
              " new releases were imported.";
      } else {
        message.textContent =
          status.outcome === "success"
            ? "The library is current. No new releases were found."
            : "The automatic sync has not completed yet.";
      }
    })
    .catch(function () {
      date.textContent = "Status unavailable";
      message.textContent =
        "The latest sync report could not be loaded. Please try again later.";
    });
})();
