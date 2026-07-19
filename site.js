/**
 * Site helpers - active nav + easter eggs
 */
(function () {
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Active nav ---------- */
  function normalizePath(path) {
    if (!path) return "/";
    var p = path.split("?")[0].split("#")[0];
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    p = p.toLowerCase();
    if (p === "" || p === "/" || p.endsWith("/index.html") || p.endsWith("/home.htm")) {
      return "/home";
    }
    return p;
  }

  function isMatch(linkPath, current) {
    var lp = normalizePath(linkPath);
    var cp = current;

    if (lp === "/home") {
      return (
        cp === "/home" ||
        cp === "/" ||
        cp.endsWith("/index.html") ||
        cp.endsWith("/home.htm")
      );
    }
    if (lp.endsWith("/games.htm") || lp.endsWith("/pages/games.htm")) {
      return cp.indexOf("/pages/games") !== -1;
    }
    if (lp.endsWith("/blog.htm") || lp.endsWith("/pages/blog.htm")) {
      return cp.indexOf("/pages/blog") !== -1;
    }
    if (lp.endsWith("/aboutus.htm")) {
      return cp.indexOf("/aboutus.htm") !== -1;
    }
    return cp === lp || cp.endsWith(lp);
  }

  function markActiveNav() {
    var current = normalizePath(window.location.pathname);
    var links = document.querySelectorAll(".nav-links a");
    links.forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      try {
        var url = new URL(href, window.location.origin);
        if (isMatch(url.pathname, current)) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "page");
        }
      } catch (e) {
        /* ignore bad hrefs */
      }
    });
  }

  /* ---------- Toast ---------- */
  function ensureToastHost() {
    var host = document.getElementById("egg-toast-host");
    if (host) return host;
    host = document.createElement("div");
    host.id = "egg-toast-host";
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "true");
    document.body.appendChild(host);
    return host;
  }

  function showToast(message, duration) {
    duration = duration || 3200;
    var host = ensureToastHost();
    var el = document.createElement("div");
    el.className = "egg-toast";
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("is-visible");
    });
    setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }, duration);
  }

  /* ---------- Confetti (lightweight) ---------- */
  function burstConfetti() {
    if (prefersReducedMotion) return;
    var layer = document.createElement("div");
    layer.className = "egg-confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);

    var colors = ["#5cdb6a", "#4eb8f5", "#e0c36a", "#fa5c5c", "#fff"];
    var count = 28;
    for (var i = 0; i < count; i++) {
      var piece = document.createElement("span");
      piece.className = "egg-confetti";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = Math.random() * 0.25 + "s";
      piece.style.animationDuration = 1.2 + Math.random() * 1.1 + "s";
      piece.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      layer.appendChild(piece);
    }

    setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 2600);
  }

  /* ---------- Fist mode ---------- */
  var fistTimer = null;

  function enableFistMode(opts) {
    opts = opts || {};
    document.documentElement.classList.add("fist-mode");
    if (!prefersReducedMotion) {
      document.documentElement.classList.add("fist-mode-flash");
      setTimeout(function () {
        document.documentElement.classList.remove("fist-mode-flash");
      }, 600);
    }

    showToast(opts.message || "COMBO COMPLETE - FIST MODE");
    if (opts.confetti !== false) burstConfetti();

    if (fistTimer) clearTimeout(fistTimer);
    fistTimer = setTimeout(function () {
      document.documentElement.classList.remove("fist-mode");
      fistTimer = null;
    }, opts.duration || 10000);
  }

  /* ---------- Logo multi-click ---------- */
  function setupLogoClicks() {
    var logo = document.querySelector(".page-top .logo, .site-nav .logo");
    if (!logo) return;

    var clicks = 0;
    var navTimer = null;
    var href = logo.getAttribute("href") || "/home.htm";

    logo.addEventListener("click", function (e) {
      // Delay navigation so a multi-click can complete without leaving the page
      e.preventDefault();
      clicks += 1;

      if (navTimer) clearTimeout(navTimer);

      if (clicks >= 5) {
        clicks = 0;
        showToast("PIXELATED NONSENSE UNLOCKED");
        burstConfetti();
        document.documentElement.classList.add("nonsense-mode");
        setTimeout(function () {
          document.documentElement.classList.remove("nonsense-mode");
        }, 5000);
        return;
      }

      // Single click → go home after a short pause; multi-click continues counting
      navTimer = setTimeout(function () {
        if (clicks === 1) {
          window.location.href = href;
        }
        clicks = 0;
      }, 480);
    });
  }

  /* ---------- Konami code ---------- */
  function setupKonami() {
    var sequence = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    var index = 0;

    document.addEventListener("keydown", function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      var expected = sequence[index];
      var expectedNorm = expected.length === 1 ? expected : expected;

      if (key === expectedNorm || (expected === "b" && key === "b") || (expected === "a" && key === "a")) {
        index += 1;
        if (index === sequence.length) {
          index = 0;
          enableFistMode({
            message: "KONAMI CODE - THE SLUDGE SYNDICATE NOTICED",
          });
        }
      } else {
        // allow restart if this key is the start of the sequence
        index = key === sequence[0] ? 1 : 0;
      }
    });
  }

  /* ---------- Console egg ---------- */
  function setupConsoleEgg() {
    window.fists = function () {
      enableFistMode({
        message: "FISTS() EXECUTED - COMBO FROM THE CONSOLE",
      });
      return "👊 Pixelated nonsense engaged. Wishlist Snakes with Fists.";
    };

    try {
      console.log(
        "%c Green Guy Blue Guy %c Pixelated Nonsense ",
        "background:#12151c;color:#5cdb6a;font-family:monospace;font-weight:bold;padding:4px 8px;border:1px solid #5cdb6a;",
        "background:#0a0c10;color:#4eb8f5;font-family:monospace;padding:4px 8px;border:1px solid #4eb8f5;"
      );
      console.log(
        "%cType %cfists()%c for a surprise. The Sludge Syndicate is watching.",
        "color:#a0abbc",
        "color:#5cdb6a;font-weight:bold",
        "color:#a0abbc"
      );
    } catch (e) {
      /* ignore */
    }
  }

  /* ---------- Character cards (tap-friendly special toggle) ---------- */
  function setupCharacterCards() {
    var cards = document.querySelectorAll("[data-character-card]");
    if (!cards.length) return;

    function setSpecial(card, on) {
      card.classList.toggle("is-special", on);
      card.setAttribute("aria-pressed", on ? "true" : "false");
      var hint = card.querySelector(".character-hint");
      if (hint) {
        var isEnemy = card.classList.contains("enemy-card");
        if (on) {
          hint.textContent = "Tap again for idle";
        } else {
          hint.textContent = isEnemy
            ? "Tap / hover for attack"
            : "Tap / hover for special";
        }
      }
      // Restart special GIF from frame 0 when shown
      if (on) {
        var action = card.querySelector(".char-action");
        if (action && action.src) {
          var src = action.src;
          action.src = "";
          action.src = src;
        }
      }
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        // Toggle special on tap/click (works on mobile; desktop can also click)
        e.preventDefault();
        e.stopPropagation();
        setSpecial(card, !card.classList.contains("is-special"));
      });

      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSpecial(card, !card.classList.contains("is-special"));
        }
      });
    });

    // Outside tap clears sticky special (mobile-friendly)
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-character-card]")) return;
      cards.forEach(function (card) {
        if (card.classList.contains("is-special")) setSpecial(card, false);
      });
    });
  }

  /* ---------- Init ---------- */
  function init() {
    markActiveNav();
    setupLogoClicks();
    setupKonami();
    setupConsoleEgg();
    setupCharacterCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
