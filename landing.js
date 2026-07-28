/* Движок скролл-фильма: скролл страницы ведёт таймлайн, сцены живут в
   фиксированном #stage. Каждая сцена получает --p (0..1). Без библиотек. */

(() => {
  const scenes = [...document.querySelectorAll(".scene")];
  const stage = document.getElementById("stage");
  const track = document.getElementById("track");
  const header = document.getElementById("filmHeader");
  const rail = document.getElementById("rail");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PER = 1.5; // высот экрана скролла на сцену
  const DARK = new Set(["Night", "Privacy"]);

  function sizeTrack() {
    track.style.height = `${scenes.length * PER * 100}vh`;
  }
  sizeTrack();
  addEventListener("resize", sizeTrack);

  /* ---------- рельса навигации ---------- */
  scenes.forEach((s, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span>${s.dataset.name}</span>`;
    b.addEventListener("click", () => {
      scrollTo({ top: i * PER * innerHeight + 4, behavior: reduced ? "auto" : "smooth" });
    });
    rail.appendChild(b);
  });
  const railDots = [...rail.children];

  /* ---------- звёзды и точки данных ---------- */
  const night = document.querySelector(".s-night");
  for (let i = 0; i < 60; i++) {
    const st = document.createElement("i");
    st.className = "star";
    const size = 1 + Math.random() * 2.4;
    st.style.cssText = `left:${Math.random() * 100}%; top:${Math.random() * 70}%;
      width:${size}px; height:${size}px; animation-delay:${Math.random() * 3}s;`;
    night.appendChild(st);
  }
  const dome = document.getElementById("dome");
  const palette = ["#F2A9BC", "#9CC1DE", "#8FBF9F", "#B8B1E3", "#F2CE7B"];
  const dots = [];
  for (let i = 0; i < 14; i++) {
    const d = document.createElement("i");
    d.className = "data-dot";
    d.style.background = palette[i % palette.length];
    dome.appendChild(d);
    dots.push({
      el: d,
      a: Math.random() * Math.PI * 2,
      r: 0.26 + Math.random() * 0.16,
      sp: (0.2 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
    });
  }
  function orbit(t) {
    const R = dome.clientWidth / 2;
    for (const d of dots) {
      const a = d.a + t * 0.00035 * d.sp * 2;
      d.el.style.left = `${R + Math.cos(a) * R * d.r * 2 - 3}px`;
      d.el.style.top = `${R + Math.sin(a) * R * d.r * 2 - 3}px`;
    }
  }

  /* ---------- настроения ---------- */
  const moodImgs = [...document.querySelectorAll("#moodStage img")];
  const moodCap = document.getElementById("moodCap");
  const moodDots = document.getElementById("moodDots");
  const MOODS = [
    ["Glowing", "a properly good night"],
    ["Rested", "ready for the day"],
    ["A bit tired", "could use a calm one"],
    ["Sleepy", "an early night would help"],
    ["At the limit", "she asks for a slow day, ice pack and all"],
    ["Under the weather", "she rests with you, no judgement"],
  ];
  MOODS.forEach(() => moodDots.appendChild(document.createElement("i")));
  const moodDotEls = [...moodDots.children];
  let moodIdx = -1;
  function setMoods(p) {
    const f = Math.min(MOODS.length - 1e-4, p * MOODS.length);
    moodImgs.forEach((img, i) => {
      const d = Math.min(1, Math.abs(f - i));
      img.style.opacity = (1 - d).toFixed(3);
      img.style.transform = `scale(${0.92 + (1 - d) * 0.08}) rotate(${(f - i) * -4}deg)`;
    });
    const i = Math.round(Math.min(MOODS.length - 1, f));
    if (i !== moodIdx) {
      moodIdx = i;
      moodCap.querySelector("b").textContent = MOODS[i][0];
      moodCap.querySelector("span").textContent = MOODS[i][1];
      moodDotEls.forEach((d, k) => d.classList.toggle("here", k === i));
    }
  }

  /* ---------- пузыри языков ---------- */
  const bubbles = [...document.querySelectorAll("#bubbles .lb")];

  /* ---------- главный цикл ---------- */
  // ?t=0.35 — замороженный кадр таймлайна для скриншотов и отладки.
  const FORCED = new URLSearchParams(location.search).get("t");
  let active = -1;
  function frame(now) {
    const vh = innerHeight;
    const max = track.offsetHeight - vh;
    const t = FORCED !== null
      ? Math.min(1, Math.max(0, +FORCED))
      : Math.min(1, Math.max(0, scrollY / max));
    const f = t * scenes.length;
    const i = Math.min(scenes.length - 1, Math.floor(f));
    const p = Math.min(1, f - i);

    if (i !== active) {
      active = i;
      scenes.forEach((s, k) => s.classList.toggle("on", k === i));
      railDots.forEach((d, k) => d.classList.toggle("here", k === i));
      const dark = DARK.has(scenes[i].dataset.name);
      header.className = `film ${dark ? "dark" : "light"}`;
      rail.className = dark ? "dark" : "";
    }
    scenes[i].style.setProperty("--p", p.toFixed(4));

    const name = scenes[i].dataset.name;
    if (name === "Moods") setMoods(p);
    if (name === "Languages") bubbles.forEach(b => b.classList.toggle("show", p >= +b.dataset.at));
    if (name === "Privacy" && !reduced) orbit(now);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- параллакс от мыши ---------- */
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    const layers = [...document.querySelectorAll("[data-depth]")];
    addEventListener("mousemove", e => {
      const dx = e.clientX / innerWidth - 0.5;
      const dy = e.clientY / innerHeight - 0.5;
      for (const l of layers) {
        const d = +l.dataset.depth;
        l.style.translate = `${(-dx * d).toFixed(1)}px ${(-dy * d).toFixed(1)}px`;
      }
    }, { passive: true });
  }

  /* ---------- реплики по тапу ---------- */
  const LINES = [
    "Hello!", "You found me", "Tap tap tap", "Привет!", "¡Hola!", "你好！",
    "I read nights, not minds", "*happy wiggle*", "Five more minutes…",
    "Your usual is my favourite", "No red numbers here", "zzz… oh! hi",
  ];
  let lineIdx = Math.floor(Math.random() * LINES.length);
  document.querySelectorAll(".tappable").forEach(pet => {
    const say = pet.parentElement.querySelector(".say") || pet.closest(".inner").querySelector(".say");
    pet.addEventListener("click", () => {
      pet.classList.remove("boing");
      void pet.offsetWidth;
      pet.classList.add("boing");
      if (say) {
        say.textContent = LINES[lineIdx++ % LINES.length];
        const r = pet.getBoundingClientRect();
        const pr = say.offsetParent.getBoundingClientRect();
        say.style.left = `${r.left - pr.left + r.width / 2 - 60}px`;
        say.style.top = `${r.top - pr.top - 44}px`;
        say.classList.add("show");
        clearTimeout(say._t);
        say._t = setTimeout(() => say.classList.remove("show"), 1600);
      }
      if (pet.id === "finPet") confetti(pet);
    });
  });

  /* ---------- теги инсайтов ---------- */
  const verdict = document.getElementById("verdict");
  const VERDICTS = {
    helps: ["adds recovery on nights after. Keep it", "your deep sleep likes this one", "+12 min of deep sleep on average. She approves"],
    hurts: ["costs you deep sleep. She noticed", "nights after this run shorter. Just saying", "recovery dips the morning after. No shame, just data"],
  };
  document.querySelectorAll("#tags .tag").forEach(tag => {
    tag.addEventListener("click", () => {
      const kind = tag.dataset.kind;
      const was = tag.classList.contains(kind);
      tag.classList.remove("helps", "hurts");
      if (!was) tag.classList.add(kind);
      const list = VERDICTS[kind];
      verdict.textContent = was
        ? "she keeps watching, quietly"
        : `${tag.textContent.replace(/^[^ ]+ /, "")} ${list[Math.floor(Math.random() * list.length)]}`;
      verdict.style.color = kind === "helps" ? "var(--sage-deep)" : "var(--lav-deep)";
    });
  });

  /* ---------- конфетти ---------- */
  function confetti(from) {
    const r = from.getBoundingClientRect();
    for (let i = 0; i < 26; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      c.style.background = palette[i % palette.length];
      c.style.left = `${r.left + r.width / 2}px`;
      c.style.top = `${r.top + r.height / 3}px`;
      document.body.appendChild(c);
      const ang = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 220;
      c.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(ang) * v}px, ${Math.sin(ang) * v + 260}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
      ], { duration: 1200 + Math.random() * 600, easing: "cubic-bezier(0.2, 0.6, 0.3, 1)" })
        .onfinish = () => c.remove();
    }
  }

  /* ---------- искры за курсором ---------- */
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    let last = 0;
    addEventListener("mousemove", e => {
      const now = performance.now();
      if (now - last < 90) return;
      last = now;
      const s = document.createElement("span");
      s.className = "trail";
      s.textContent = Math.random() > 0.5 ? "✦" : "✧";
      s.style.left = `${e.clientX + 8}px`;
      s.style.top = `${e.clientY + 8}px`;
      s.style.color = palette[Math.floor(Math.random() * palette.length)];
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }, { passive: true });
  }

  /* ---------- клавиатура ---------- */
  addEventListener("keydown", e => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = Math.min(scenes.length - 1, Math.max(0, active + (e.key === "ArrowDown" ? 1 : -1)));
    scrollTo({ top: next * PER * innerHeight + 4, behavior: reduced ? "auto" : "smooth" });
  });
})();
