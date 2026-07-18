(function () {
  "use strict";

  var entrance = document.querySelector(".entrance-hotspot");

  if (!entrance) {
    return;
  }

  entrance.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    window.location.assign(entrance.href);
  });
})();
