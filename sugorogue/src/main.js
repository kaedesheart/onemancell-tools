import {
  newRun,
  restoreRun,
  roll,
  candidates,
  commitMove,
  takeOffer,
  service,
  heal,
  leaveEvent,
  nextChapter,
} from "./state.js";
import { titleView, gameView, dialogContent } from "./ui.js";
import { escape } from "./render.js";
const app = document.getElementById("app");
const SAVE_KEY = "sugorogue-run-v1";
let warning = "",
  saved = null,
  state = null,
  view = null;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  saved = restoreRun(raw);
  if (raw && !saved)
    warning = "保存データを読み込めませんでした。新しい旅を始められます。";
} catch {
  warning = "このブラウザでは途中保存を使えません。";
}
function save() {
  if (!state) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saved = state;
  } catch {
    warning = "途中保存ができませんでした。この画面を開いたまま遊べます。";
  }
}
function render({ follow = false } = {}) {
  const active = document.activeElement;
  const focusKey = active?.dataset?.action ? { ...active.dataset } : null;
  const scroll = document.getElementById("map-scroll")?.scrollLeft || 0;
  app.innerHTML = state ? gameView(state, warning) : titleView(saved, warning);
  const dialog =
    view || (state && ["event", "chapter", "won", "lost"].includes(state.phase))
      ? dialogContent(state, view)
      : null;
  if (dialog) {
    const el = document.createElement("dialog");
    el.className = "game-dialog";
    el.setAttribute("aria-labelledby", "dialog-title");
    el.innerHTML = `<div class="dialog-inner"><span class="eyebrow">SUGOROGUE</span><h2 id="dialog-title">${escape(dialog.title)}</h2>${dialog.content}</div>`;
    el.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (view) {
        view = null;
        render();
      }
    });
    app.appendChild(el);
    el.showModal();
  }
  const map = document.getElementById("map-scroll");
  if (map) {
    map.scrollLeft = scroll;
    if (follow) {
      const marker =
        map.querySelector(
          state.phase === "choose" ? ".target-marker" : ".player-marker",
        ) || map.querySelector(".player-marker");
      if (marker) map.scrollLeft = marker.offsetLeft - map.clientWidth * 0.45;
    }
  }
  if (focusKey) {
    const elements = app.querySelectorAll("[data-action]");
    const next = [...elements].find((el) =>
      Object.entries(focusKey).every(([key, val]) => el.dataset[key] === val),
    );
    if (next && !next.disabled && (!dialog || next.closest("dialog")))
      next.focus({ preventScroll: true });
  }
}
app.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action,
    id = Number(button.dataset.id),
    index = Number(button.dataset.index);
  let follow = false;
  if (action === "help" || action === "deck") view = action;
  else if (action === "close" || action === "event-back") view = null;
  else if (action === "start") {
    if (saved && !["won", "lost"].includes(saved.phase)) view = "restart";
    else {
      state = newRun();
      view = null;
      follow = true;
    }
  } else if (action === "restart") {
    state = newRun();
    view = null;
    follow = true;
  } else if (action === "resume") {
    state = saved;
    view = null;
    follow = true;
  } else if (action === "title") {
    save();
    state = null;
    view = null;
  } else if (state) {
    if (action === "roll") {
      roll(state);
      follow = true;
    } else if (action === "candidate") {
      const c = candidates(state)[index];
      if (c) {
        state.roll.dice.forEach((d, i) => {
          d.choice = c.choices[i];
        });
        follow = true;
      }
    } else if (action === "move") {
      commitMove(state);
      view = null;
      follow = true;
    } else if (action === "offer") takeOffer(state, index);
    else if (action === "heal") heal(state);
    else if (action === "leave") {
      leaveEvent(state);
      view = null;
    } else if (action === "upgrade" || action === "remove") view = action;
    else if (action === "service") {
      if (service(state, id, button.dataset.mode)) view = null;
    } else if (action === "next") {
      nextChapter(state);
      view = null;
      follow = true;
    }
  }
  save();
  render({ follow });
});
render();
