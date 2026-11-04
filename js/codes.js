(function () {
  "use strict";

  const VAULT_KEY = "nexus-secret-code-vault-v1";
  const CODE_PATTERN = /^[A-Z0-9!@#$%^&*]{4,6}$/;
  const form = document.getElementById("code-form");
  const bulkForm = document.getElementById("bulk-code-form");
  const bulkInput = document.getElementById("bulk-code-value");
  const input = document.getElementById("code-value");
  const label = document.getElementById("editor-label");
  const saveButton = document.getElementById("save-code");
  const cancelButton = document.getElementById("cancel-edit");
  const list = document.getElementById("managed-codes");
  const count = document.getElementById("manager-count");
  const message = document.getElementById("manager-message");
  const empty = document.getElementById("manager-empty");
  const deleteAllButton = document.getElementById("delete-all-codes");
  let codes = [];
  let editingIndex = null;

  function loadCodes() {
    let saved;
    try {
      saved = JSON.parse(window.localStorage.getItem(VAULT_KEY) || "[]");
    } catch (error) {
      console.error("Could not read the saved code list.", error);
      setMessage("SAVED CODES COULD NOT BE READ FROM THIS BROWSER.", true);
      return [];
    }

    if (!Array.isArray(saved)) {
      console.warn("The saved code list has an invalid format.");
      setMessage("SAVED CODE DATA HAS AN INVALID FORMAT.", true);
      return [];
    }
    return Array.from(new Set(saved.filter(function (code) {
      return typeof code === "string" && CODE_PATTERN.test(code.toUpperCase());
    }).map(function (code) {
      return code.toUpperCase();
    })));
  }

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", Boolean(isError));
  }

  function saveCodes(nextCodes) {
    try {
      window.localStorage.setItem(VAULT_KEY, JSON.stringify(nextCodes));
    } catch (error) {
      console.error("Could not save the code list.", error);
      setMessage("SAVE FAILED. BROWSER STORAGE MAY BE UNAVAILABLE OR FULL.", true);
      return false;
    }
    codes = nextCodes;
    renderCodes();
    return true;
  }

  function renderCodes() {
    list.replaceChildren();
    codes.forEach(function (code, index) {
      const item = document.createElement("li");
      item.className = "managed-code";

      const value = document.createElement("span");
      value.className = "managed-code-value";
      value.textContent = code;

      const actions = document.createElement("div");
      actions.className = "managed-code-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "code-action";
      edit.dataset.action = "edit";
      edit.dataset.index = String(index);
      edit.textContent = "EDIT";
      edit.setAttribute("aria-label", "Edit code " + code);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "code-action code-action--remove";
      remove.dataset.action = "remove";
      remove.dataset.index = String(index);
      remove.textContent = "DELETE";
      remove.setAttribute("aria-label", "Delete code " + code);

      actions.append(edit, remove);
      item.append(value, actions);
      list.appendChild(item);
    });

    count.textContent = codes.length + (codes.length === 1 ? " CODE" : " CODES");
    empty.hidden = codes.length > 0;
    deleteAllButton.disabled = codes.length === 0;
  }

  function resetEditor() {
    editingIndex = null;
    form.reset();
    input.removeAttribute("aria-invalid");
    label.textContent = "NEW ACCESS CODE";
    saveButton.textContent = "SAVE CODE";
    cancelButton.hidden = true;
  }

  input.addEventListener("input", function () {
    if (input.hasAttribute("aria-invalid")) {
      input.removeAttribute("aria-invalid");
      if (message.classList.contains("is-error")) setMessage("", false);
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const code = input.value.trim().toUpperCase();
    input.value = code;
    if (!CODE_PATTERN.test(code)) {
      input.setAttribute("aria-invalid", "true");
      setMessage("USE 4–6 CHARACTERS: A–Z, 0–9, OR !@#$%^&*.", true);
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    const duplicateIndex = codes.indexOf(code);
    if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
      setMessage("THAT CODE IS ALREADY SAVED.", true);
      input.focus();
      return;
    }

    const nextCodes = codes.slice();
    const wasEditing = editingIndex !== null;
    if (wasEditing) {
      nextCodes[editingIndex] = code;
      nextCodes.push(nextCodes.splice(editingIndex, 1)[0]);
    } else {
      nextCodes.push(code);
    }

    if (saveCodes(nextCodes)) {
      resetEditor();
      setMessage(wasEditing
        ? "CODE UPDATED. IT IS A VALID GAME ANSWER."
        : "CODE SAVED. IT IS A VALID GAME ANSWER.");
      input.focus();
    }
  });

  bulkForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const entries = bulkInput.value
      .split(/[\r\n,;]+/)
      .map(function (code) { return code.trim().toUpperCase(); })
      .filter(Boolean);

    if (!entries.length) {
      setMessage("PASTE AT LEAST ONE CODE TO ADD.", true);
      bulkInput.focus();
      return;
    }

    const nextCodes = codes.slice();
    const existingCodes = new Set(codes);
    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    entries.forEach(function (code) {
      if (!CODE_PATTERN.test(code)) {
        invalidCount += 1;
      } else if (existingCodes.has(code)) {
        duplicateCount += 1;
      } else {
        nextCodes.push(code);
        existingCodes.add(code);
        addedCount += 1;
      }
    });

    if (!addedCount) {
      const detail = invalidCount
        ? " NO VALID NEW CODES TO ADD; " + invalidCount + " INVALID ENTRIES."
        : " ALL CODES ARE ALREADY SAVED.";
      setMessage(detail.trim(), true);
      return;
    }

    if (saveCodes(nextCodes)) {
      bulkForm.reset();
      setMessage("ADDED " + addedCount + (addedCount === 1 ? " CODE." : " CODES.") +
        (duplicateCount ? " " + duplicateCount + " DUPLICATES SKIPPED." : "") +
        (invalidCount ? " " + invalidCount + " INVALID ENTRIES SKIPPED." : ""));
    }
  });

  deleteAllButton.addEventListener("click", function () {
    if (!codes.length || !window.confirm("Delete all " + codes.length + " saved codes? This cannot be undone.")) {
      return;
    }

    if (saveCodes([])) {
      resetEditor();
      bulkForm.reset();
      setMessage("ALL SAVED CODES DELETED.");
    }
  });

  list.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button || !list.contains(button)) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= codes.length) return;

    if (button.dataset.action === "edit") {
      editingIndex = index;
      input.value = codes[index];
      label.textContent = "EDIT ACCESS CODE";
      saveButton.textContent = "SAVE CHANGES";
      cancelButton.hidden = false;
      setMessage("EDIT THE CODE AND SAVE YOUR CHANGES.");
      input.focus();
      input.select();
      return;
    }

    if (button.dataset.action === "remove") {
      const nextCodes = codes.filter(function (_, codeIndex) {
        return codeIndex !== index;
      });
      if (saveCodes(nextCodes)) {
        if (editingIndex === index) resetEditor();
        else if (editingIndex !== null && editingIndex > index) editingIndex -= 1;
        setMessage("CODE DELETED.");
      }
    }
  });

  cancelButton.addEventListener("click", function () {
    resetEditor();
    setMessage("EDIT CANCELLED.");
    input.focus();
  });

  codes = loadCodes();
  renderCodes();
}());
