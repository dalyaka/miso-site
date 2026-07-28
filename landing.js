/* Движок скролл-фильма: скролл страницы ведёт таймлайн, сцены живут в
   фиксированном #stage. Каждая сцена получает --p (0..1). Без библиотек. */

(() => {
  const scenes = [...document.querySelectorAll(".scene")];
  const stage = document.getElementById("stage");
  const track = document.getElementById("track");
  const header = document.getElementById("filmHeader");
  const rail = document.getElementById("rail");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DARK = new Set(["Night", "Privacy"]);

  // Один экран скролла = одна сцена; сценам с внутренней хореографией
  // (настроения, языки) выдан вес чуть больше через data-len.
  const lens = scenes.map(s => +(s.dataset.len || 1));
  const total = lens.reduce((a, b) => a + b, 0);
  const starts = [];
  lens.reduce((acc, l, i) => { starts[i] = acc; return acc + l; }, 0);

  function sizeTrack() {
    track.style.height = `${total * 100 + 100}vh`;
  }
  sizeTrack();
  addEventListener("resize", sizeTrack);

  /* ---------- рельса навигации ---------- */
  scenes.forEach((s, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", s.dataset.name);
    b.innerHTML = `<span aria-hidden="true">${s.dataset.name}</span>`;
    b.addEventListener("click", () => {
      scrollTo({ top: starts[i] * innerHeight + 4, behavior: reduced ? "auto" : "smooth" });
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
    ["Glowing", "after an excellent night"],
    ["Rested", "recovered and ready"],
    ["A bit tired", "worth an easier day"],
    ["Sleepy", "an earlier night would help"],
    ["At the limit", "time for a recovery day"],
    ["Under the weather", "she takes it slow with you"],
  ];
  MOODS.forEach(() => moodDots.appendChild(document.createElement("i")));
  const moodDotEls = [...moodDots.children];
  let moodIdx = -1;
  // Догоняющий указатель: при резком скролле состояния пробегают по
  // очереди, а не перепрыгивают. Кадры не смешиваются: в каждый момент
  // видно ровно одно лицо (жёсткая смена с лёгким поп-масштабом).
  let moodF = 0;
  function setMoods(p) {
    const target = Math.min(MOODS.length - 1e-4, p * MOODS.length);
    moodF += (target - moodF) * 0.16;
    if (Math.abs(target - moodF) < 0.003) moodF = target;
    const f = moodF;
    moodImgs.forEach((img, i) => {
      const d = Math.abs(f - i);
      const on = d < 0.5 || (i === MOODS.length - 1 && f >= MOODS.length - 0.5);
      img.style.opacity = on ? "1" : "0";
      img.style.transform = `scale(${on ? 1 - Math.min(0.1, d * 0.2) : 0.9})`;
    });
    const i = Math.max(0, Math.min(MOODS.length - 1, Math.round(f)));
    if (i !== moodIdx) {
      const first = moodIdx < 0;
      moodIdx = i;
      moodCap.querySelector("b").textContent = MOODS[i][0];
      moodCap.querySelector("span").textContent = MOODS[i][1];
      moodDotEls.forEach((d, k) => d.classList.toggle("here", k === i));
      fxLayers.forEach((layer, k) => layer.classList.toggle("on", k === i));
      if (!first && !reduced) moodBurst();
    }
  }

  /* Полноэкранный «климат» под каждое состояние: слой частиц на всю
     сцену, переключается вместе с состоянием. */
  const moodsScene = document.querySelector(".s-moods");
  const FX_BUILDERS = [
    // Glowing: золотые искры по всему экрану.
    host => { for (let k = 0; k < 16; k++) { const s = mkFx(host, "p-spark", k % 2 ? "✦" : "✧");
      s.style.cssText += `left:${r(2, 96)}%; top:${r(6, 90)}%; font-size:${r(12, 26)}px; --d:${r(2.2, 4.5)}s; animation-delay:${r(0, 3)}s;`; } },
    // Rested: мягкие плывущие сердечки.
    host => { for (let k = 0; k < 12; k++) { const s = mkFx(host, "p-heart", "♥");
      s.style.cssText += `left:${r(3, 95)}%; font-size:${r(11, 22)}px; --d:${r(13, 24)}s; animation-delay:${r(0, 13)}s;`; } },
    // A bit tired: сонные облачка тянутся по экрану.
    host => { for (let k = 0; k < 7; k++) { const s = mkFx(host, "p-cloudlet", "");
      s.style.cssText += `left:${r(2, 84)}%; top:${r(8, 86)}%; scale:${r(0.6, 1.4)}; --d:${r(14, 26)}s; animation-delay:${r(0, 8)}s;`; } },
    // Sleepy: улетающие «z».
    host => { for (let k = 0; k < 12; k++) { const s = mkFx(host, "p-z", "z");
      s.style.cssText += `left:${r(4, 92)}%; top:${r(30, 96)}%; font-size:${r(14, 30)}px; --d:${r(4, 8)}s; animation-delay:${r(0, 6)}s;`; } },
    // At the limit: снежинки в тон льду на голове.
    host => { for (let k = 0; k < 14; k++) { const s = mkFx(host, "p-flake", "✻");
      s.style.cssText += `left:${r(2, 97)}%; font-size:${r(10, 22)}px; --d:${r(8, 16)}s; animation-delay:${r(0, 10)}s;`; } },
    // Under the weather: тихий дождик.
    host => { for (let k = 0; k < 18; k++) { const s = mkFx(host, "p-drop", "");
      s.style.cssText += `left:${r(1, 99)}%; --d:${r(3.5, 6.5)}s; animation-delay:${r(0, 5)}s;`; } },
  ];
  // Локальный r: rnd объявляется ниже по файлу, ссылаться на него ещё рано.
  const r = (a, b) => a + Math.random() * (b - a);
  function mkFx(host, cls, text) {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    host.appendChild(s);
    return s;
  }
  const fxLayers = FX_BUILDERS.map(build => {
    const layer = document.createElement("div");
    layer.className = "mood-fx";
    build(layer);
    moodsScene.appendChild(layer);
    return layer;
  });

  /* Вспышка искр при смене состояния. */
  const moodStageEl = document.getElementById("moodStage");
  function moodBurst() {
    for (let k = 0; k < 6; k++) {
      const s = document.createElement("span");
      s.className = "mood-burst";
      s.textContent = k % 2 ? "✧" : "✦";
      s.style.cssText = `left:50%; top:42%; color:${palette[k % palette.length]};
        --bx:${rnd(-80, 80)}px; --by:${rnd(-70, 40)}px;`;
      moodStageEl.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }

  /* ---------- пузыри языков ---------- */
  const bubbles = [...document.querySelectorAll("#bubbles .lb")];

  /* ---------- рассыпные декорации миров ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  function scatter(host, n, make) {
    for (let i = 0; i < n; i++) host.appendChild(make(i));
  }
  // Светлячки в ночи.
  scatter(night, 7, () => {
    const f = document.createElement("i");
    f.className = "firefly";
    f.style.cssText = `left:${rnd(6, 94)}%; top:${rnd(32, 82)}%;
      animation-duration:${rnd(3, 6)}s; animation-delay:${rnd(0, 3)}s;`;
    return f;
  });
  // Всплывающие пузыри: интро и лаборатория инсайтов.
  const bubTints = ["rgba(242,169,188,0.3)", "rgba(156,193,222,0.3)", "rgba(143,191,159,0.3)"];
  for (const [sel, n] of [[".s-meet", 8], [".s-insights", 10]]) {
    scatter(document.querySelector(sel), n, i => {
      const b = document.createElement("i");
      b.className = "bubble";
      const size = rnd(8, 22);
      b.style.cssText = `left:${rnd(3, 97)}%; width:${size}px; height:${size}px;
        --bub:${bubTints[i % 3]}; animation-duration:${rnd(14, 26)}s; animation-delay:${rnd(0, 14)}s;`;
      return b;
    });
  }
  // Пыльца в утреннем воздухе.
  scatter(document.querySelector(".s-dawn"), 6, () => {
    const p = document.createElement("i");
    p.className = "pollen";
    p.style.cssText = `left:${rnd(8, 92)}%; top:${rnd(30, 80)}%;
      animation-duration:${rnd(3, 7)}s; animation-delay:${rnd(0, 3)}s;`;
    return p;
  });
  // Парящие приветствия на четырёх языках у сцены языков.
  const greetWords = ["Hello", "Привет", "Hola", "你好", "Hello", "Привет", "Hola", "你好"];
  const greetSpots = [
    [6, 16], [74, 12], [10, 70], [84, 66],
    [26, 26], [64, 80], [4, 44], [90, 36],
  ];
  scatter(document.querySelector(".s-langs"), greetWords.length, i => {
    const g = document.createElement("span");
    g.className = "glyph";
    g.textContent = greetWords[i];
    g.style.cssText = `left:${greetSpots[i][0]}%; top:${greetSpots[i][1]}%;
      font-size:${rnd(17, 26)}px; animation-duration:${rnd(4, 8)}s; animation-delay:${rnd(0, 4)}s;`;
    return g;
  });
  // Финал: пастельные шарики по краям и редкое медленное конфетти.
  const fin = document.querySelector(".s-fin");
  const balloonX = [6, 14, 82, 90, 72];
  scatter(fin, balloonX.length, i => {
    const b = document.createElement("i");
    b.className = "balloon";
    b.style.cssText = `left:${balloonX[i]}%; top:${rnd(20, 55)}%;
      background:${palette[i % palette.length]}; animation-duration:${rnd(4, 7)}s; animation-delay:${rnd(0, 2)}s;`;
    return b;
  });
  scatter(fin, 10, i => {
    const c = document.createElement("i");
    c.className = "fall";
    c.style.cssText = `left:${rnd(2, 98)}%; background:${palette[i % palette.length]};
      animation-duration:${rnd(9, 16)}s; animation-delay:${rnd(0, 10)}s;`;
    return c;
  });

  /* ---------- главный цикл ---------- */
  const moonEl = document.querySelector(".moon");
  const sunEl = document.querySelector(".sunball");
  // ?t=0.35 — замороженный кадр таймлайна для скриншотов и отладки.
  const FORCED = new URLSearchParams(location.search).get("t");
  let active = -1;
  function frame(now) {
    const vh = innerHeight;
    const max = track.offsetHeight - vh;
    const t = FORCED !== null
      ? Math.min(1, Math.max(0, +FORCED))
      : Math.min(1, Math.max(0, scrollY / max));
    const u = t * total;
    let i = scenes.length - 1;
    while (i > 0 && u < starts[i]) i--;
    const p = Math.min(1, (u - starts[i]) / lens[i]);

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
    if (name === "States") setMoods(p);
    if (name === "Languages") bubbles.forEach(b => b.classList.toggle("show", p >= +b.dataset.at));
    if (name === "Privacy" && !reduced) orbit(now);
    // Луна и солнце плывут по небу дугой, а не по вертикали.
    if (name === "Night") {
      moonEl.style.left = `${75 - 58 * p}%`;
      moonEl.style.top = `${40 - 26 * Math.sin(p * Math.PI)}%`;
    }
    if (name === "Morning") {
      const th = p * Math.PI / 2;
      sunEl.style.left = `${8 + 42 * (1 - Math.cos(th))}%`;
      sunEl.style.top = `${72 - 52 * Math.sin(th)}%`;
    }

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
    "Hello!", "Привет!", "¡Hola!", "你好！",
    "Good to see you", "Sleep well tonight", "zzz… oh, hi",
  ];
  let lineIdx = Math.floor(Math.random() * LINES.length);
  document.querySelectorAll(".tappable").forEach(pet => {
    // Кликабельная картинка доступна и с клавиатуры.
    pet.setAttribute("role", "button");
    pet.setAttribute("tabindex", "0");
    pet.setAttribute("aria-label", "Say hi to Miso");
    pet.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pet.click(); }
    });
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
    helps: ["is followed by better recovery in your data", "correlates with more deep sleep", "tends to precede your better nights"],
    hurts: ["is followed by lighter sleep", "tends to precede shorter nights", "correlates with lower next-morning recovery"],
  };
  document.querySelectorAll("#tags .tag").forEach(tag => {
    tag.addEventListener("click", () => {
      const kind = tag.dataset.kind;
      const was = tag.classList.contains(kind);
      tag.classList.remove("helps", "hurts");
      if (!was) tag.classList.add(kind);
      const list = VERDICTS[kind];
      verdict.textContent = was
        ? "noted, she keeps collecting data"
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
    scrollTo({ top: starts[next] * innerHeight + 4, behavior: reduced ? "auto" : "smooth" });
  });
})();
