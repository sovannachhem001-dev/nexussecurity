(function () {
  "use strict";

  const Game = window.SecretCodeGame;
  const VAULT_KEY = "nexus-secret-code-vault-v1";
  const CODE_PATTERN = /^[A-Z0-9!@#$%^&*]{4,6}$/;
  const elements = {
    panel: document.getElementById("game-panel"),
    form: document.getElementById("guess-form"),
    inputs: document.getElementById("code-inputs"),
    enter: document.getElementById("enter-button"),
    feedback: document.getElementById("feedback"),
    feedbackMessage: document.getElementById("feedback-message"),
    attempts: document.getElementById("attempts-list"),
    logCount: document.getElementById("log-count"),
    codeLengthLabel: document.getElementById("code-length-label"),
    hintButton: document.getElementById("hint-button"),
    hintCount: document.getElementById("hint-count"),
    restartButton: document.getElementById("restart-button"),
    soundToggle: document.getElementById("sound-toggle"),
    soundState: document.getElementById("sound-state"),
    status: document.getElementById("system-status"),
    overlay: document.getElementById("victory-overlay"),
    victoryCode: document.getElementById("victory-code"),
    victoryScore: document.getElementById("victory-score"),
    victoryRestart: document.getElementById("victory-restart"),
    toast: document.getElementById("toast")
  };

  let state;
  let timerInterval = null;
  let toastTimeout = null;
  let soundEnabled = false;
  let audioContext = null;
  let matrixAnimation = null;

  function loadSavedCodes() {
    let saved;
    try {
      saved = JSON.parse(window.localStorage.getItem(VAULT_KEY) || "[]");
    } catch (error) {
      console.warn("Could not read the saved code list.", error);
      return [];
    }

    if (!Array.isArray(saved)) {
      console.warn("The saved code list has an invalid format.");
      return [];
    }
    return saved.filter(function (code) {
      return typeof code === "string" && CODE_PATTERN.test(code.toUpperCase());
    }).map(function (code) {
      return code.toUpperCase();
    });
  }

  function getSettings(savedCodes) {
    const enabledSets = savedCodes.length
      ? ["letters", "numbers", "symbols"].filter(function (setName) {
        const pattern = setName === "letters" ? /[A-Z]/ :
          setName === "numbers" ? /[0-9]/ : /[!@#$%^&*]/;
        return savedCodes.some(function (code) { return pattern.test(code); });
      })
      : ["letters", "numbers"];
    return {
      length: 6,
      difficulty: "medium",
      enabledSets: enabledSets,
      characters: Game.getCharacterPool(enabledSets),
      timerEnabled: true
    };
  }

  function setFeedback(message, type) {
    elements.feedback.className = "feedback" + (type ? " " + type : "");
    elements.feedbackMessage.textContent = message;
  }

  function createInputs() {
    elements.inputs.replaceChildren();
    for (let index = 0; index < 6; index += 1) {
      const input = document.createElement("input");
      input.className = "code-slot";
      input.type = "text";
      input.inputMode = "text";
      input.maxLength = 1;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.autocapitalize = "characters";
      input.setAttribute("aria-label", "Code character " + (index + 1) + " of " + state.settings.length);
      input.setAttribute("placeholder", "—");
      input.dataset.index = String(index);
      input.addEventListener("input", onSlotInput);
      input.addEventListener("keydown", onSlotKeydown);
      input.addEventListener("paste", onSlotPaste);
      elements.inputs.appendChild(input);
    }
    elements.codeLengthLabel.textContent = state.savedCodes.length
      ? "SAVED CODE · 4–6 CHARACTERS"
      : state.settings.length + " CHARACTERS";
  }

  function startGame() {
    const savedCodes = loadSavedCodes();
    const settings = getSettings(savedCodes);
    stopTimer();
    const difficulty = Game.DIFFICULTIES[settings.difficulty];
    state = {
      settings: settings,
      secret: savedCodes.length
        ? Array.from(savedCodes[Math.floor(Math.random() * savedCodes.length)])
        : Game.createCode(settings.length, settings.characters),
      savedCodes: savedCodes,
      maxAttempts: difficulty.attempts,
      remaining: difficulty.attempts,
      timeLeft: difficulty.seconds,
      attempts: [],
      hintsLeft: 1,
      hintPositions: [],
      score: 0,
      finished: false
    };
    createInputs();
    elements.attempts.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty-log";
    empty.textContent = "YOUR ATTEMPTS WILL APPEAR HERE";
    elements.attempts.appendChild(empty);
    elements.logCount.textContent = "0 ENTRIES";
    elements.hintCount.textContent = "0" + state.hintsLeft;
    elements.hintButton.disabled = false;
    elements.status.textContent = "SYSTEM ONLINE";
    if (elements.overlay.classList.contains("visible")) {
      elements.inputs.children[0].focus();
    }
    elements.overlay.classList.remove("visible");
    elements.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("game-won");
    elements.enter.disabled = false;
    elements.enter.classList.remove("is-loading");
    elements.enter.querySelector(".button-label").textContent = "ENTER";
    setFeedback(savedCodes.length
      ? "ENTER ANY SAVED CODE TO UNLOCK"
      : "AWAITING INPUT — ENTER A CODE TO BEGIN");
    timerInterval = window.setInterval(function () {
      if (state.finished) return;
      state.timeLeft -= 1;
      if (state.timeLeft <= 0) finishGame(false, "TIME EXPIRED — ACCESS DENIED");
    }, 1000);
    window.setTimeout(function () {
      const firstInput = elements.inputs.querySelector("input");
      if (firstInput && !state.finished) firstInput.focus();
    }, 0);
  }

  function stopTimer() {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function getAllowedCharacter(character) {
    const upper = character.toUpperCase();
    return state.settings.characters.includes(upper) ? upper : "";
  }

  function updateSlot(input, character) {
    input.value = character;
    input.classList.toggle("filled", Boolean(character));
    input.classList.remove("invalid");
  }

  function onSlotInput(event) {
    if (state.finished) return;
    const input = event.currentTarget;
    const index = Number(input.dataset.index);
    const typed = input.value.slice(-1);
    const character = getAllowedCharacter(typed);
    updateSlot(input, character);
    if (typed && !character) {
      input.classList.add("invalid");
      window.setTimeout(function () { input.classList.remove("invalid"); }, 300);
      playSound("error");
      return;
    }
    if (character && index < state.settings.length - 1) {
      elements.inputs.children[index + 1].focus();
    }
  }

  function onSlotKeydown(event) {
    if (state.finished) {
      event.preventDefault();
      return;
    }
    const input = event.currentTarget;
    const index = Number(input.dataset.index);
    if (event.key === "Backspace" && !input.value && index > 0) {
      elements.inputs.children[index - 1].focus();
      elements.inputs.children[index - 1].select();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      elements.inputs.children[index - 1].focus();
    } else if (event.key === "ArrowRight" && index < state.settings.length - 1) {
      event.preventDefault();
      elements.inputs.children[index + 1].focus();
    }
  }

  function onSlotPaste(event) {
    event.preventDefault();
    if (state.finished) return;
    const start = Number(event.currentTarget.dataset.index);
    const pasted = event.clipboardData.getData("text").toUpperCase();
    let next = start;
    for (const rawCharacter of pasted) {
      if (next >= state.settings.length) break;
      const character = getAllowedCharacter(rawCharacter);
      if (!character) continue;
      updateSlot(elements.inputs.children[next], character);
      next += 1;
    }
    const focusIndex = Math.min(next, state.settings.length - 1);
    elements.inputs.children[focusIndex].focus();
  }

  function getGuess() {
    const values = Array.from(elements.inputs.children).map(function (input) {
      return input.value;
    });
    const lastFilled = values.reduce(function (lastIndex, value, index) {
      return value ? index : lastIndex;
    }, -1);
    if (lastFilled === -1 || values.slice(0, lastFilled + 1).some(function (value) { return !value; })) {
      return null;
    }

    const guess = values.slice(0, lastFilled + 1);
    if (state.savedCodes.length) return guess.length >= 4 ? guess : null;
    return guess.length === state.settings.length ? guess : null;
  }

  function setLoading(isLoading) {
    elements.enter.disabled = isLoading || state.finished;
    elements.enter.classList.toggle("is-loading", isLoading);
    elements.enter.querySelector(".button-label").textContent = isLoading ? "CHECKING" : "ENTER";
  }

  function submitGuess(event) {
    event.preventDefault();
    if (state.finished || elements.enter.disabled) return;
    const guess = getGuess();
    if (!guess) {
      setFeedback("COMPLETE EVERY CODE SLOT BEFORE SUBMITTING", "error");
      const firstEmpty = Array.from(elements.inputs.children).find(function (input) {
        return !input.value;
      });
      if (firstEmpty) firstEmpty.focus();
      return;
    }

    setLoading(true);
    elements.status.textContent = "SCANNING INPUT";
    setFeedback("SCANNING ENCRYPTED CODE…");
    window.setTimeout(function () {
      if (state.finished) return;
      setLoading(false);
      elements.status.textContent = "SYSTEM ONLINE";
      const guessCode = guess.join("");
      const savedCodeMatch = state.savedCodes.includes(guessCode);
      const feedbackCode = state.savedCodes.find(function (code) {
        return code.length === guess.length;
      });
      const result = savedCodeMatch
        ? { exact: guess.length, misplaced: 0 }
        : Game.scoreGuess(
          feedbackCode ? Array.from(feedbackCode) : state.secret,
          guess
        );
      state.attempts.push({ guess: guess, result: result });
      state.remaining -= 1;
      addAttemptRow(guess, result, state.attempts.length);

      if (savedCodeMatch || (!state.savedCodes.length && result.exact === state.settings.length)) {
        if (savedCodeMatch) state.secret = guess.slice();
        const timeBonus = state.settings.timerEnabled ? Math.ceil(state.timeLeft / 10) : 0;
        const difficulty = Game.DIFFICULTIES[state.settings.difficulty];
        state.score = Math.max(100, Math.round(
          (state.remaining * 100 + timeBonus * 25 + state.settings.length * 20) *
          difficulty.multiplier
        ));
        finishGame(true, "CODE ACCEPTED — ACCESS GRANTED");
      } else if (state.remaining <= 0) {
        finishGame(false, "NO ATTEMPTS REMAINING — ACCESS DENIED");
      } else {
        playSound("error");
        setFeedback(result.exact + " EXACT · " + result.misplaced + " MISPLACED", "error");
        elements.panel.classList.remove("wrong-shake");
        void elements.panel.offsetWidth;
        elements.panel.classList.add("wrong-shake");
        Array.from(elements.inputs.children).forEach(function (input) {
          updateSlot(input, "");
        });
        elements.inputs.children[0].focus();
      }
    }, 550);
  }

  function addAttemptRow(guess, result, number) {
    const empty = elements.attempts.querySelector(".empty-log");
    if (empty) empty.remove();
    const row = document.createElement("div");
    row.className = "attempt-row latest";
    row.setAttribute("aria-label", "Attempt " + number + ": " + result.exact + " exact matches, " + result.misplaced + " misplaced matches");
    const attemptNumber = document.createElement("span");
    attemptNumber.className = "attempt-number";
    attemptNumber.textContent = "#" + String(number).padStart(2, "0");
    const code = document.createElement("span");
    code.className = "attempt-code";
    code.textContent = "•".repeat(guess.length);
    code.setAttribute("aria-label", "Code hidden");
    const feedback = document.createElement("span");
    feedback.className = "attempt-feedback";
    const exact = document.createElement("span");
    exact.className = "exact-match";
    exact.textContent = result.exact + " EXACT";
    const misplaced = document.createElement("span");
    misplaced.className = "misplaced-match";
    misplaced.textContent = result.misplaced + " MISPLACED";
    feedback.append(exact, misplaced);
    row.append(attemptNumber, code, feedback);
    Array.from(elements.attempts.children).forEach(function (entry) {
      entry.classList.remove("latest");
    });
    elements.attempts.prepend(row);
    elements.logCount.textContent = number + (number === 1 ? " ENTRY" : " ENTRIES");
  }

  function finishGame(won, message) {
    if (state.finished) return;
    state.finished = true;
    stopTimer();
    setLoading(false);
    elements.enter.disabled = true;
    elements.hintButton.disabled = true;
    elements.status.textContent = won ? "SYSTEM BREACHED" : "ACCESS DENIED";
    setFeedback(message, won ? "success" : "error");
    if (won) {
      elements.victoryCode.textContent = state.secret.join("");
      elements.victoryScore.textContent = "SCORE " + state.score + "  ·  " +
        state.attempts.length + (state.attempts.length === 1 ? " ATTEMPT" : " ATTEMPTS");
      elements.overlay.classList.add("visible");
      elements.overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("game-won");
      playSound("win");
      window.setTimeout(function () { elements.victoryRestart.focus(); }, 100);
    } else {
      showToast("ACCESS DENIED — START A NEW GAME TO TRY AGAIN");
      Array.from(elements.inputs.children).forEach(function (input) {
        input.disabled = true;
      });
      playSound("error");
    }
  }

  function requestHint() {
    if (state.finished || state.hintsLeft <= 0) return;
    state.hintsLeft -= 1;
    elements.hintCount.textContent = "0" + state.hintsLeft;
    elements.hintButton.disabled = true;
    const hint = Game.getHint(state.secret, state.settings.enabledSets, state.hintPositions);
    const match = hint.match(/^Slot (\d+)/);
    if (match) state.hintPositions.push(Number(match[1]) - 1);
    setFeedback("INTEL: " + hint.toUpperCase(), "hint");
    playSound("hint");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(function () {
      elements.toast.classList.remove("visible");
    }, 3600);
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) return;
      if (!audioContext) audioContext = new AudioContextConstructor();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const frequencies = type === "win" ? [440, 660, 880] : type === "hint" ? [520, 730] : [190, 130];
      frequencies.forEach(function (frequency, index) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * .11);
        gain.gain.setValueAtTime(.0001, now + index * .11);
        gain.gain.exponentialRampToValueAtTime(.065, now + index * .11 + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, now + index * .11 + .16);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + index * .11);
        oscillator.stop(now + index * .11 + .18);
      });
    } catch (error) {
      console.warn("Could not play the sound effect.", error);
      soundEnabled = false;
      elements.soundToggle.setAttribute("aria-pressed", "false");
      elements.soundState.textContent = "OFF";
    }
  }

  function initMatrix() {
    const canvas = document.getElementById("matrix-canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      console.warn("Matrix background could not initialize because Canvas 2D is unavailable.");
      return;
    }
    const glyphs = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*";
    const fontSize = 14;
    let columns = 0;
    let drops = [];
    let frame = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      columns = Math.ceil(window.innerWidth / fontSize);
      drops = Array.from({ length: columns }, function () {
        return Math.floor(Math.random() * -window.innerHeight / fontSize);
      });
    }

    function draw() {
      context.fillStyle = "rgba(2, 10, 8, 0.075)";
      context.fillRect(0, 0, window.innerWidth, window.innerHeight);
      context.font = fontSize + "px monospace";
      for (let index = 0; index < drops.length; index += 1) {
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
        context.fillStyle = Math.random() > .94 ? "#aaffd1" : "#00b96b";
        context.fillText(glyph, index * fontSize, drops[index] * fontSize);
        if (drops[index] * fontSize > window.innerHeight && Math.random() > .978) drops[index] = 0;
        drops[index] += .22;
      }
      matrixAnimation = window.requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();
  }

  elements.form.addEventListener("submit", submitGuess);
  elements.hintButton.addEventListener("click", requestHint);
  elements.restartButton.addEventListener("click", startGame);
  elements.victoryRestart.addEventListener("click", startGame);
  elements.soundToggle.addEventListener("click", function () {
    soundEnabled = !soundEnabled;
    elements.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    elements.soundState.textContent = soundEnabled ? "ON" : "OFF";
    elements.soundToggle.setAttribute("aria-label", soundEnabled ? "Disable sound effects" : "Enable sound effects");
    if (soundEnabled) playSound("hint");
  });
  elements.overlay.addEventListener("click", function (event) {
    if (event.target === elements.overlay) elements.victoryRestart.focus();
  });

  window.addEventListener("beforeunload", function () {
    stopTimer();
    if (matrixAnimation !== null) window.cancelAnimationFrame(matrixAnimation);
  });

  initMatrix();
  startGame();
}());
