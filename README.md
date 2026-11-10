# NEXUS Secret Code

A responsive, futuristic secret-code guessing game made with HTML, CSS, and vanilla JavaScript.

## Play

Open `index.html` in a modern browser. No build step, backend, or package installation is required.

## Install on your devices

Publish the site to an HTTPS web host (or run it from `localhost` while developing) to enable installation and offline play. Open the site in a supported browser and choose **INSTALL APP** when it appears; on iPhone or iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**. The installed game can also be opened from your desktop or tablet browser's install option. Opening the files directly with `file://` does not support web-app installation.

The app caches its game pages and assets for offline use after the first successful visit. Gameplay and saved codes are stored separately by each browser/device.

## How it works

- Crack the randomly generated code before your attempts or countdown run out.
- Each guess reports exact-position matches and matching characters in the wrong position.
- Use one hint per game to learn the character category at a code position.
- Crack a six-character code made from letters and numbers.
- Paste a code into any slot, type to advance, and use arrow keys or Backspace to navigate.
- Toggle synthesized sound effects from the top bar.
- Add codes in **Manage Codes**; every saved code is accepted as a correct answer in the game, including codes with different valid lengths.
- Add one code at a time or paste a list to add multiple codes together. Use **Delete All** to clear the saved list after confirmation.
- Repeated characters may appear in the secret code. The game checks guesses only after every input slot has a valid character.
