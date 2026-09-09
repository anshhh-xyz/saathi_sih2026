(function () {
  "use strict";
  var tabSystem = document.getElementById("tabSystem");
  var tabCall = document.getElementById("tabCall");
  var viewSystem = document.getElementById("viewSystem");
  var viewCall = document.getElementById("viewCall");

  function showSystem() {
    viewSystem.hidden = false;
    viewCall.hidden = true;
    tabSystem.classList.add("active");
    tabCall.classList.remove("active");
    tabSystem.setAttribute("aria-selected", "true");
    tabCall.setAttribute("aria-selected", "false");
    // The system diagram's own resize handler recalculates stage scale from
    // clientWidth, which reads 0 while the section was display:none. Firing
    // a resize event lets its existing debounce path fix that on its own.
    window.dispatchEvent(new Event("resize"));
  }

  function showCall() {
    viewCall.hidden = false;
    viewSystem.hidden = true;
    tabCall.classList.add("active");
    tabSystem.classList.remove("active");
    tabCall.setAttribute("aria-selected", "true");
    tabSystem.setAttribute("aria-selected", "false");
  }

  tabSystem.addEventListener("click", showSystem);
  tabCall.addEventListener("click", showCall);
})();
