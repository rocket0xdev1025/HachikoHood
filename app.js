const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)];
const officialLinks = {
  telegram: "https://t.me/HACHIKO_hood",
  x: "https://x.com/HACHIKO_hood",
  chart: "https://dexscreener.com/robinhood/0xe01fa47ddc93ed72de792f37ec1242be688d7a64",
  swap: "https://app.uniswap.org/swap?chain=robinhood&outputCurrency=0xe01fa47ddc93ed72de792f37ec1242be688d7a64",
};
let noticeTimer;
/* The contract address lives HERE and nowhere else. Paste the real 0x... on
   launch day and both the floating bar and the tokenomics block pick it up -
   nothing else to keep in sync. Empty = not live yet: the copy button then
   explains instead of copying a placeholder nobody should paste into a wallet. */
const CONTRACT_ADDRESS = "";
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
all("[data-link]").forEach((b) =>
  b.addEventListener("click", () => {
    const link = officialLinks[b.dataset.link];
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    else
      notify(
        { telegram: "Telegram", x: "X", chart: "Chart", swap: "Official swap" }[
          b.dataset.link
        ] + " is coming soon. Hachi is saving your spot."
      );
  })
);
/* Contract address bar: render whatever CONTRACT_ADDRESS holds and copy it on
   demand. With the address still empty the button deliberately does NOT copy
   anything - a fake 0x string pasted into a wallet is a real way to lose money,
   so it explains instead and lights up the moment the real address is set. */
(function () {
  const bar = $("#ca-bar"),
    value = $("#ca-value"),
    btn = $("#ca-copy"),
    inline = $("#ca-inline");
  if (!bar || !btn) return;
  const address = (CONTRACT_ADDRESS || "").trim();
  if (address) {
    value.textContent = address;
    if (inline) inline.textContent = address;
  } else {
    btn.dataset.state = "soon";
    btn.title = "The contract address is not live yet";
  }
  const fallback = (text) =>
    new Promise((res, rej) => {
      try {
        const t = document.createElement("textarea");
        t.value = text;
        t.setAttribute("readonly", "");
        t.style.cssText = "position:fixed;top:-1000px;opacity:0";
        document.body.appendChild(t);
        t.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(t);
        ok ? res() : rej(new Error("execCommand refused"));
      } catch (e) {
        rej(e);
      }
    });
  const copy = (text) =>
    navigator.clipboard && window.isSecureContext
      ? navigator.clipboard.writeText(text)
      : fallback(text);
  btn.addEventListener("click", () => {
    if (!address) {
      notify(
        "0xe01fa47ddc93ed72de792f37ec1242be688d7a64"
      );
      return;
    }
    const done = () => {
      btn.textContent = "Copied!";
      btn.dataset.state = "done";
      notify("Contract address copied. Share it carefully.");
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        btn.textContent = "Copy";
        btn.dataset.state = "";
      }, 1900);
    };
    copy(address)
      .then(done)
      .catch(() =>
        fallback(address)
          .then(done)
          .catch(() =>
            notify(
              "Could not copy on this browser - long-press the address to select it."
            )
          )
      );
  });
})();
$(".menu").onclick = () => {
  let on = $(".navlinks").classList.toggle("open");
  $(".menu").setAttribute("aria-expanded", String(on));
};
all(".navlinks a").forEach(
  (a) =>
    (a.onclick = () => {
      $(".navlinks").classList.remove("open");
      $(".menu").setAttribute("aria-expanded", "false");
    })
);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let paused = reduce,
  state = "hello",
  clock = 0,
  lastTime = 0,
  walkStart = 0,
  trainStart = 1.3,
  trainActive = true,
  petUntil = 0;
const solo = $("#solo-dog"),
  scene = $("#hero-scene"),
  reunion = $("#reunion"),
  speech = $("#speech"),
  train = $(".train"),
  walkCanvas = solo.querySelector("canvas"),
  walkCtx = walkCanvas.getContext("2d"),
  track = $(".train-track"),
  stationBack = $(".station-back"),
  stationFront = $(".station-front");
/* Walk sprites. Frames 2 and 5 are NOT part of the same cycle — cutting them
   out removes two visible jumps from the loop, so the dog now walks on a
   four-pose cycle (0,1,3,4). Only those four are fetched. */
const WALK_CYCLE = [0, 1, 3, 4];
const walkFrames = {};
for (const i of WALK_CYCLE) {
  const img = new Image();
  img.src = "assets/walk-" + i + ".webp";
  walkFrames[i] = img;
}
/* Walk timing. dur = seconds for the full trip; fps = stride frames per second
   (raise it together with the speed, or the paws skate over the ground).
   amp = how far the dog travels, in % of the hero width. It was 36% on phones,
   which only moved the dog 0.68 of its own body length — its legs ran while the
   ground barely passed. 42% is the most the phone layout can take before the
   sprite leaves the frame. */
const WALK = { dur: 7.5, durMobile: 5, fps: 8, fpsMobile: 11, amp: 42 };
/* A second, endlessly looping walker that trots along the bottom of the
   "how to buy" section, on the boundary with the community band. cross =
   seconds to travel the full width once. */
const buyDog = $(".buy-walker"),
  buyCtx = buyDog ? buyDog.getContext("2d") : null;
let buyW = 0,
  buyDogW = 0;
const EDGE = { cross: 14, crossMobile: 9 };
/* Measured from the walk sprites: 45px of the 512px canvas under the paws is
   transparent, so the draw is shifted down by exactly that to plant him on the
   boundary line instead of floating 8.79% of his height above it. */
const FEET_OFFSET = 45;
const reunionImg = new Image();
reunionImg.src = "assets/reunion.webp";
const reunionCanvas = $("#reunion-canvas"),
  reunionCtx = reunionCanvas.getContext("2d");
// Animate the reunion with two independent image layers: an articulated tail and a stable face/body.
let tailLayer, bodyLayer;
reunionImg.onload = () => {
  const w = reunionImg.naturalWidth,
    h = reunionImg.naturalHeight;
  reunionCanvas.width = w;
  reunionCanvas.height = h;
  bodyLayer = document.createElement("canvas");
  bodyLayer.width = w;
  bodyLayer.height = h;
  let c = bodyLayer.getContext("2d");
  c.drawImage(reunionImg, 0, 0);
  tailLayer = document.createElement("canvas");
  tailLayer.width = w;
  tailLayer.height = h;
  let tc = tailLayer.getContext("2d");
  tc.save();
  tc.beginPath();
  tc.moveTo(0, h * 0.44);
  tc.lineTo(w * 0.18, h * 0.44);
  tc.quadraticCurveTo(w * 0.2, h * 0.52, w * 0.12, h * 0.62);
  tc.lineTo(w * 0.08, h * 0.7);
  tc.lineTo(0, h * 0.7);
  tc.closePath();
  tc.clip();
  tc.drawImage(reunionImg, 0, 0);
  tc.restore();
  c.globalCompositeOperation = "destination-out";
  c.drawImage(tailLayer, 0, 0);
  c.globalCompositeOperation = "source-over";
  reunion.classList.add("ready");
};
function hearts() {
  for (let i = 0; i < 5; i++) {
    let h = document.createElement("span");
    h.className = "floating-heart";
    h.textContent = "♥";
    h.style.right = 18 + Math.random() * 17 + "%";
    h.style.bottom = 40 + Math.random() * 12 + "%";
    h.style.animationDelay = i * 0.09 + "s";
    $("#hearts").append(h);
    setTimeout(() => h.remove(), 2100);
  }
}
function setScene(next) {
  state = next;
  all("[data-action]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.action === next))
  );
  reunion.hidden = next !== "hello";
  solo.hidden = next === "hello";
  solo.classList.toggle("walking", next === "walk");
  solo.style.right = "";
  solo.style.left = "";
  solo.style.transform = "";
  speech.style.opacity = "1";
  if (next === "hello") {
    speech.textContent = "My favourite human is here! ♡";
    petUntil = clock + 2;
    hearts();
  }
  if (next === "wait") {
    speech.textContent = "Same spot. I saved a place for you.";
    solo.querySelector("img").alt = "Hachiko waiting at the station";
  }
  if (next === "walk") {
    walkStart = clock;
    speech.textContent = paused
      ? "Ready when you are. Press play!"
      : "Tiny paws. Big adventure!";
    if (paused) drawWalker(0, 1, 0);
  }
}
all("[data-action]").forEach(
  (b) => (b.onclick = () => setScene(b.dataset.action))
);
reunion.onclick = () => {
  speech.textContent = "Best. Reunion. Ever. ♡";
  petUntil = clock + 2;
  hearts();
};
solo.onclick = () => {
  if (state === "walk") setScene("wait");
  speech.textContent = "You are officially his favourite. ♡";
  petUntil = clock + 2;
  hearts();
};
$("#train-button").onclick = () => {
  if (paused) {
    notify("Press play to call the train.");
    return;
  }
  trainStart = clock;
  trainActive = true;
  speech.textContent = "That sounds like our train!";
  $("#train-button").textContent = "Here it comes!";
  setTimeout(() => ($("#train-button").textContent = "Choo choo!"), 3500);
};
function updatePause() {
  document.body.classList.toggle("paused", paused);
  $("#motion").textContent = paused ? "▶" : "Ⅱ";
  $("#motion").setAttribute(
    "aria-label",
    paused ? "Resume motion" : "Pause motion"
  );
}
$("#motion").onclick = () => {
  paused = !paused;
  updatePause();
};
updatePause();
/* Draw one walk pose into any 2d canvas, cross-dissolving into the next. A hard
   cut between four poses flickers; painting the incoming pose over the outgoing
   one blends only where the two silhouettes differ (everywhere both are opaque
   the result is still fully opaque), so the stride reads as motion instead of a
   flip-book. Shared by the hero walker and the "how to buy" road walker. */
function paintWalker(ctx, n, dir, bob, blend, yOff) {
  const N = WALK_CYCLE.length;
  const a = walkFrames[WALK_CYCLE[n % N]],
    b = walkFrames[WALK_CYCLE[(n + 1) % N]];
  if (!a || !a.complete || !a.naturalWidth) return;
  ctx.clearRect(0, 0, 512, 512);
  const paint = (img, alpha) => {
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.globalAlpha = alpha;
    ctx.save();
    if (dir < 0) {
      ctx.translate(512, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, 0, bob + (yOff || 0), 512, 512);
    ctx.restore();
  };
  paint(a, 1);
  if (blend > 0) paint(b, blend);
  ctx.globalAlpha = 1;
}
function drawWalker(n, dir, bob, blend) {
  paintWalker(walkCtx, n, dir, bob, blend);
}
function drawReunion() {
  if (!bodyLayer) return;
  const w = reunionCanvas.width,
    h = reunionCanvas.height;
  reunionCtx.clearRect(0, 0, w, h);
  const lively = clock < petUntil;
  let angle = Math.sin(clock * (lively ? 17 : 9)) * (lively ? 0.11 : 0.045);
  reunionCtx.save();
  reunionCtx.translate(w * 0.13, h * 0.6);
  reunionCtx.rotate(paused ? 0 : angle);
  reunionCtx.drawImage(tailLayer, -w * 0.13, -h * 0.6);
  reunionCtx.restore();
  reunionCtx.drawImage(bodyLayer, 0, 0);
  let bob = lively ? Math.sin(clock * 11) * 3 : Math.sin(clock * 2) * 1.5;
  reunion.style.transform =
    "translateY(" + bob + "px) rotate(" + Math.sin(clock * 1.4) * 0.35 + "deg)";
}
/* A pass with no stop: the carriage rolls straight through the station and is
   never parked. first = delay after page load before the first pass, pass =
   seconds for the whole sweep, gap = pause before the next one. */
const TRAIN = { first: 1.3, pass: 4.6, gap: 2 };
function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!paused && !document.hidden) {
    clock += dt;
    const mob = innerWidth < 700,
      walkDur = mob ? WALK.durMobile : WALK.dur,
      walkFps = mob ? WALK.fpsMobile : WALK.fps,
      walkCross = mob ? EDGE.crossMobile : EDGE.cross;
    if (state === "walk") {
      let t = (clock - walkStart) / walkDur;
      if (t >= 1) {
        setScene("wait");
        speech.textContent = "And back to our favourite place.";
      } else {
        let x = (innerWidth < 700 ? 46 : 63) - Math.sin(t * Math.PI) * WALK.amp;
        solo.style.left = x + "%";
        solo.style.right = "auto";
        const ph = clock * walkFps,
          n = Math.floor(ph),
          f = ph - n,
          blend = f > 0.6 ? ((f - 0.6) / 0.4) * 0.85 : 0;
        drawWalker(n, t < 0.5 ? -1 : 1, Math.sin(clock * 18) * 1.8, blend);
      }
    }
    if (state === "wait") {
      let happy = clock < petUntil;
      solo.style.transform =
        "translateY(" +
        Math.sin(clock * (happy ? 10 : 2)) * (happy ? 4 : 1) +
        "px) rotate(" +
        Math.sin(clock * (happy ? 10 : 2)) * (happy ? 1.5 : 0.25) +
        "deg)";
    }
    if (trainActive) {
      const t = clock - trainStart;
      let x;
      if (t < 0) x = 30;
      else if (t < TRAIN.pass) x = 30 - 135 * (t / TRAIN.pass);
      else {
        x = -105;
        trainActive = false;
        trainStart = clock + TRAIN.gap;
      }
      train.style.transform = "translateX(" + x + "%)";
    } else if (clock >= trainStart) {
      trainActive = true;
    }
    if (buyCtx) {
      const u = (((clock / walkCross) % 1) + 1) % 1;
      buyDog.style.transform =
        "translateX(" + Math.round(u * (buyW + buyDogW) - buyDogW) + "px)";
      const ph = clock * walkFps,
        n = Math.floor(ph),
        f = ph - n,
        blend = f > 0.6 ? ((f - 0.6) / 0.4) * 0.85 : 0;
      paintWalker(buyCtx, n, 1, Math.sin(clock * 18) * 1.8, blend, FEET_OFFSET);
    }
  }
  if (state === "hello") drawReunion();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
const seasonMessages = {
  spring: "A little blossom. A lot of hope.",
  rain: "Even rainy days need a good boy.",
  autumn: "Leaves fall. Loyalty does not.",
  winter: "Cold paws. The warmest heart.",
};
let currentSeason = "spring";
const rnd = (a, b) => a + Math.random() * (b - a);
/* Scatter the seasonal particles. Everything used to be derived from one index
   (`left:calc(var(--i)*3.7%)`, stepped durations/delays, one shared keyframe
   trajectory), which drew a visible lattice. Each particle now gets its own
   x, horizontal drift, fall distance, spin, speed, phase offset, size and
   opacity. */
function setSeason(season) {
  currentSeason = season;
  all("[data-bg]").forEach((img) =>
    img.classList.toggle("active", img.dataset.bg === season)
  );
  all("[data-season]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.season === season))
  );
  $("#season-caption").textContent = seasonMessages[season];
  const weather = $(".weather");
  weather.className = "weather " + season;
  weather.replaceChildren();
  const chars = { spring: "✿", rain: "", autumn: "❋", winter: "•" };
  const count = season === "rain" ? 64 : 34;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    const dur = season === "rain" ? rnd(0.5, 1.15) : rnd(6.5, 16);
    p.style.setProperty("--x", rnd(-1, 99).toFixed(2) + "%");
    p.style.setProperty(
      "--dx",
      (season === "rain" ? rnd(-40, 60) : rnd(-130, 210)).toFixed(0) + "px"
    );
    p.style.setProperty("--dy", rnd(108, 142).toFixed(0) + "vh");
    p.style.setProperty(
      "--rot",
      (season === "rain"
        ? rnd(-14, 14)
        : season === "winter"
        ? rnd(-24, 24)
        : rnd(60, 460)
      ).toFixed(0) + "deg"
    );
    p.style.setProperty("--size", rnd(0.6, 1.35).toFixed(2));
    p.style.setProperty("--op", rnd(0.35, 0.95).toFixed(2));
    p.style.setProperty("--dur", dur.toFixed(2) + "s");
    p.style.setProperty("--delay", (-rnd(0, dur)).toFixed(2) + "s");
    p.textContent = chars[season];
    weather.append(p);
  }
}
all("[data-season]").forEach(
  (b) =>
    (b.onclick = () => {
      setSeason(b.dataset.season);
      startSeasons();
    })
);
/* Seasons auto-advance once a second — the same station, dissolving from one
   season into the next. The cadence is restarted by a manual pick so a chosen
   season still gets a full beat on screen, and it holds still while motion is
   paused (the Ⅱ button, reduced-motion, or a hidden tab) rather than churning
   in the background. */
const SEASONS = ["spring", "rain", "autumn", "winter"];
let seasonTimer;
const SEASON_MS = 1000;
function startSeasons() {
  clearInterval(seasonTimer);
  seasonTimer = setInterval(() => {
    if (paused || document.hidden) return;
    setSeason(SEASONS[(SEASONS.indexOf(currentSeason) + 1) % SEASONS.length]);
  }, SEASON_MS);
}
setSeason("spring");
startSeasons();
/* Sticker décor: pop in when its section scrolls into view, then float forever.
   Entrance transform lives on .sticker, the loop on the inner <img>, so the two
   animations never fight. Falls back to "always visible" without IO. */
(function () {
  const els = all(".sticker");
  if (!els.length) return;
  els.forEach((s, i) =>
    s.style.setProperty("--phase", (-(i * 1.7) % 6).toFixed(2) + "s")
  );
  if (!("IntersectionObserver" in window)) {
    els.forEach((s) => s.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach((s) => io.observe(s));
})();
$("#boop").onclick = () => {
  const box = $(".community-character");
  box.classList.remove("booped");
  void box.offsetWidth;
  box.classList.add("booped");
  $("#boop").textContent = "Certified good human! ♡";
  setTimeout(() => ($("#boop").textContent = "Boop the good boy ♡"), 2300);
};
// Pointer movement shifts only scene depth; character proportions stay unchanged.
$(".hero").addEventListener("pointermove", (e) => {
  if (paused || e.pointerType === "touch") return;
  let r = e.currentTarget.getBoundingClientRect();
  let x = (e.clientX - r.left) / r.width - 0.5;
  $(".station-back").style.transform = "translateX(" + x * -5 + "px)";
});

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  for (const tool of [
    {
      name: "set_hachiko_scene",
      description:
        "Change the visible Hachiko interaction to greeting his owner, walking, or waiting.",
      inputSchema: {
        type: "object",
        properties: {
          scene: { type: "string", enum: ["hello", "walk", "wait"] },
        },
        required: ["scene"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (!input || !["hello", "walk", "wait"].includes(input.scene))
          throw Error("Choose hello, walk, or wait");
        setScene(input.scene);
        return { scene: state, motionPaused: paused };
      },
    },
    {
      name: "set_story_season",
      description: "Change the season of the same Hachiko station scene.",
      inputSchema: {
        type: "object",
        properties: {
          season: {
            type: "string",
            enum: ["spring", "rain", "autumn", "winter"],
          },
        },
        required: ["season"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (
          !input ||
          !["spring", "rain", "autumn", "winter"].includes(input.season)
        )
          throw Error("Invalid season");
        setSeason(input.season);
        return { season: currentSeason };
      },
    },
  ]) {
    try {
      Promise.resolve(
        document.modelContext.registerTool(tool, { signal: lifecycle.signal })
      ).catch(() => {});
    } catch {}
  }
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}

/* Hero geometry is calibrated against the composited reference artwork
   (the "done" mock: Hachiko + owner standing on the platform at the yellow
   tactile line, one carriage beside them). Measured proportions of that
   reference, as a fraction of frame height:
     character pair  0.26   (feet exactly on the yellow tactile line)
     carriage body   0.53   -> roughly 2x the character, i.e. real-train scale
     carriage roof   well above the character's head
   Both are pinned to the station plate (assets/hero-platform.webp, 1920x1280):
     platform 914  -> the yellow tactile strip (its measured rows are 906-921,
                      sat 0.7); the deck runs 860-905 above it
     rail    1190  -> the upper steel rail, where the wheels rest
   Because the carriage is ~2x the character and both stand on plate
   landmarks, the carriage passes IN FRONT of Hachiko and covers him as it
   goes by — the intended behaviour: the near track really is in front of the
   platform. plateMap() is the single source of truth: it derives the plate's
   painted size/offset and writes it onto .station-back/.station-front, so the
   CSS background and the sprite placement can never disagree. */
const PLATE = {
  w: 1920,
  h: 1280,
  platform: 914,
  rail: 1190,
  dogH: 366,
  carH: 678,
};
function plateMap() {
  const hero = $(".hero"),
    w = hero.clientWidth,
    h = hero.clientHeight;
  // The plate is used 1:1 (the hero keeps its 3:2 aspect), so nothing is
  // cropped away and the framing matches the reference artwork.
  const s = Math.max(w / PLATE.w, h / PLATE.h);
  const dw = PLATE.w * s,
    dh = PLATE.h * s,
    offX = (w - dw) / 2,
    offY = h - dh;
  return { w, h, s, dw, dh, offX, offY, y: (p) => offY + p * s };
}
function layoutScene() {
  const M = plateMap(),
    h = M.h,
    w = M.w,
    mobile = w <= 700;
  const platformY = M.y(PLATE.platform); // Hachiko's paws rest here
  const railY = M.y(PLATE.rail); // the train's wheels rest here
  // The layout owns the plate mapping, so paint it from the same numbers.
  for (const el of [stationBack, stationFront]) {
    el.style.backgroundSize =
      Math.round(M.dw) + "px " + Math.round(M.dh) + "px";
    el.style.backgroundPosition =
      Math.round(M.offX) + "px " + Math.round(M.offY) + "px";
  }
  // Hachiko stands on the platform at the tactile line, scaled in plate units.
  const hugH = Math.round(PLATE.dogH * M.s);
  reunion.style.bottom = h - platformY + "px";
  reunion.style.height = hugH + "px";
  reunion.style.width =
    Math.round(Math.min(mobile ? w * 0.9 : w * 0.6, hugH * (937 / 900))) + "px";
  // Solo Hachiko keeps the same footing, scaled against the reunion pair.
  const pupH = Math.round(hugH * 0.62);
  solo.style.bottom = h - platformY + "px";
  solo.style.height = pupH + "px";
  solo.style.width = Math.round(pupH * (727 / 900)) + "px";
  // Carriage on the rail, sized in plate units. No cap against the platform
  // line: matching the reference means it is taller than Hachiko, so it
  // sweeps in front of him. Only the top of the hero is respected.
  const carH = Math.round(Math.min(PLATE.carH * M.s, railY - 40));
  track.style.bottom = h - railY + "px";
  track.style.height = carH + "px";
  // Speech bubble. Desktop: above Hachiko's head but high enough to clear the
  // carriage roof, so it stays readable while the train rolls past. Phones:
  // beside him, below the copy block that owns the top of the hero.
  const bubbleTop = mobile
    ? platformY - hugH - 52
    : Math.max(6, Math.min(platformY - hugH - 40, railY - carH - 66));
  speech.style.top = Math.round(bubbleTop) + "px";
  speech.style.bottom = "auto";
  // buy-section walker: cache the section width so the tick loop never reads layout
  if (buyDog) {
    buyW = buyDog.parentElement.clientWidth;
    buyDogW = buyDog.offsetWidth;
  }
}
layoutScene();
window.addEventListener("resize", layoutScene);
