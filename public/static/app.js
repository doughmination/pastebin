/* public/static/app.js
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

// Progressive enhancement only: every page here works with this file blocked.
// Nothing below touches the network.

(function () {
  "use strict";

  const page = document.body.dataset.page;

  if (page === "paste") setUpPaste();
  if (page === "composer") setUpComposer();

  // --- a paste --------------------------------------------------------------

  function setUpPaste() {
    const code = document.querySelector(".code");
    if (!code) return;

    const copyButton = document.querySelector("[data-copy-body]");
    if (copyButton && navigator.clipboard) {
      copyButton.addEventListener("click", async () => {
        const text = code.innerText.replace(/\n$/, "");
        try {
          await navigator.clipboard.writeText(text);
          flash(copyButton, "Copied");
        } catch {
          flash(copyButton, "Press Ctrl+C");
        }
      });
    } else if (copyButton) {
      copyButton.remove();
    }

    let anchorLine = null;

    // Clicking a line number selects that line and puts it in the address bar,
    // so the URL can be shared as a pointer at one line. Shift-click extends.
    code.addEventListener("click", (event) => {
      const line = event.target.closest(".line");
      if (!line || !line.id) return;

      // Only the number gutter reacts, so selecting code still works normally.
      const gutter = parseFloat(getComputedStyle(line).paddingLeft);
      if (!(event.offsetX >= 0 && event.offsetX < gutter && event.target === line)) return;

      const number = Number(line.id.slice(1));
      if (!Number.isFinite(number)) return;

      if (event.shiftKey && anchorLine !== null) {
        light(Math.min(anchorLine, number), Math.max(anchorLine, number));
      } else {
        anchorLine = number;
        light(number, number);
      }
      event.preventDefault();
    });

    function light(from, to) {
      for (const lit of code.querySelectorAll(".line.lit")) lit.classList.remove("lit");
      for (let n = from; n <= to; n++) {
        const line = document.getElementById("L" + n);
        if (line) line.classList.add("lit");
      }
      const hash = from === to ? "#L" + from : "#L" + from + "-L" + to;
      history.replaceState(null, "", hash);
    }

    // Restore a range that arrived in the URL, e.g. #L12-L20.
    const range = /^#L(\d+)(?:-L(\d+))?$/.exec(location.hash);
    if (range) {
      const from = Number(range[1]);
      const to = range[2] ? Number(range[2]) : from;
      anchorLine = from;
      if (to > from) light(from, to);
      const first = document.getElementById("L" + from);
      if (first) first.scrollIntoView({ block: "center" });
    }

    // Deleting a paste can't be undone, so ask once. The form still submits
    // normally for anyone without scripting.
    const deleteForm = document.querySelector("[data-confirm-delete]");
    if (deleteForm) {
      let armed = false;
      const button = deleteForm.querySelector("button");
      deleteForm.addEventListener("submit", (event) => {
        if (armed) return;
        event.preventDefault();
        armed = true;
        button.textContent = "Really delete?";
        setTimeout(() => {
          armed = false;
          button.textContent = "Delete";
        }, 4000);
      });
    }
  }

  function flash(button, text) {
    const original = button.textContent;
    button.textContent = text;
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  }

  // --- the composer ---------------------------------------------------------

  function setUpComposer() {
    const form = document.querySelector(".composer");
    if (!form) return;

    const textarea = form.querySelector("textarea[name=body]");
    const counter = form.querySelector("[data-counter]");
    const maxBytes = Number(form.dataset.maxBytes || 0);

    if (textarea && counter) {
      const encoder = new TextEncoder();
      const update = () => {
        const size = encoder.encode(textarea.value).length;
        counter.textContent = humanBytes(size);
        counter.classList.toggle("over", maxBytes > 0 && size > maxBytes);
      };
      textarea.addEventListener("input", update);
      update();
    }

    // Tab inserts an indent instead of leaving the field. Shift+Tab and Escape
    // still move focus, so the form stays keyboard-navigable.
    if (textarea) {
      textarea.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.shiftKey) return;
        event.preventDefault();
        const { selectionStart: start, selectionEnd: end, value } = textarea;
        textarea.value = value.slice(0, start) + "  " + value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }

    // Picking a custom colour is what you meant by choosing "Custom".
    const customColour = form.querySelector("input[name=accent_custom]");
    if (customColour) {
      customColour.addEventListener("input", () => {
        const radio = form.querySelector("input[name=accent_choice][value=custom]");
        if (radio) radio.checked = true;
      });
    }

    // Ctrl/Cmd+Enter publishes, the way a commit message field would.
    form.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") form.requestSubmit();
    });
  }

  function humanBytes(count) {
    if (count < 1024) return count + " B";
    if (count < 1024 * 1024) return (count / 1024).toFixed(1) + " KB";
    return (count / (1024 * 1024)).toFixed(1) + " MB";
  }
})();
