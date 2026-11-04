(function () {
  "use strict";

  const CHARACTER_SETS = {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numbers: "0123456789",
    symbols: "!@#$%^&*"
  };

  const DIFFICULTIES = {
    easy: { attempts: 10, seconds: 180, multiplier: 1 },
    medium: { attempts: 8, seconds: 120, multiplier: 1.5 },
    hard: { attempts: 7, seconds: 90, multiplier: 2 },
    expert: { attempts: 6, seconds: 60, multiplier: 3 }
  };

  function createCode(length, characters) {
    if (!Number.isInteger(length) || length < 4 || length > 6) {
      throw new RangeError("Code length must be between 4 and 6.");
    }
    if (typeof characters !== "string" || characters.length === 0) {
      throw new TypeError("At least one character is required to generate a code.");
    }
    return Array.from({ length }, function () {
      return characters[Math.floor(Math.random() * characters.length)];
    });
  }

  function scoreGuess(secret, guess) {
    let exact = 0;
    const secretRemainder = [];
    const guessRemainder = [];

    for (let index = 0; index < secret.length; index += 1) {
      if (secret[index] === guess[index]) {
        exact += 1;
      } else {
        secretRemainder.push(secret[index]);
        guessRemainder.push(guess[index]);
      }
    }

    const remaining = new Map();
    secretRemainder.forEach(function (character) {
      remaining.set(character, (remaining.get(character) || 0) + 1);
    });

    let misplaced = 0;
    guessRemainder.forEach(function (character) {
      const count = remaining.get(character) || 0;
      if (count > 0) {
        misplaced += 1;
        remaining.set(character, count - 1);
      }
    });

    return { exact, misplaced };
  }

  function getCharacterPool(enabledSets) {
    return Object.keys(CHARACTER_SETS)
      .filter(function (name) { return enabledSets.includes(name); })
      .map(function (name) { return CHARACTER_SETS[name]; })
      .join("");
  }

  function getHint(secret, enabledSets, usedPositions) {
    const categories = [
      { name: "letter", test: /[A-Z]/ },
      { name: "number", test: /[0-9]/ },
      { name: "symbol", test: /[!@#$%^&*]/ }
    ].filter(function (category) {
      return enabledSets.some(function (setName) {
        return CHARACTER_SETS[setName].split("").some(function (character) {
          return category.test.test(character);
        });
      });
    });

    const position = secret.findIndex(function (_, index) {
      return !usedPositions.includes(index);
    });

    if (position === -1) {
      return "The code contains " + new Set(secret).size + " unique character" +
        (new Set(secret).size === 1 ? "." : "s.");
    }

    const character = secret[position];
    const category = categories.find(function (item) { return item.test.test(character); });
    return "Slot " + (position + 1) + " contains " + (category ? "a " + category.name + "." : "one of the selected characters.");
  }

  window.SecretCodeGame = {
    CHARACTER_SETS: CHARACTER_SETS,
    DIFFICULTIES: DIFFICULTIES,
    createCode: createCode,
    getCharacterPool: getCharacterPool,
    getHint: getHint,
    scoreGuess: scoreGuess
  };
}());
