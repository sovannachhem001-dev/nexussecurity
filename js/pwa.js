(function () {
  "use strict";

  const installButton = document.getElementById("install-button");
  let installPrompt = null;
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js")
        .catch(function (error) {
          console.error("The app's offline support could not be enabled.", error);
        });
    });
  }

  if (!installButton || isStandalone) return;

  if (isIOS) {
    installButton.hidden = false;
    installButton.textContent = "HOW TO INSTALL";
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    installButton.hidden = true;
  });

  installButton.addEventListener("click", function () {
    if (!installPrompt) {
      if (isIOS) {
        window.alert("To install NEXUS Security, open this page in Safari, tap the Share button, then choose “Add to Home Screen”.");
      }
      return;
    }

    installPrompt.prompt();
    installPrompt.userChoice.then(function () {
      installPrompt = null;
    }).catch(function (error) {
      console.error("The app installation prompt could not be completed.", error);
      installPrompt = null;
    });
  });
}());
