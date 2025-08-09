// carnage.js - Unminified, readable version
(function () {
  // ---------------------------
  // CONFIG
  // ---------------------------
  const CFG = {
    ascii: [
"    _____",
"   / ___/__ ________  ___ ____ ____",
"  / /__/ _ `/ __/ _ \\/ _ `/ _ `/ -_)",
"  \\___/\\_,_/_/ /_//_/\\_,_/\\_, /\\__/",
"                         /___/"
    ],
    colors: {
      glow1: "#00ff66", // neon green
      glow2: "#00eaff", // cyan-ish
      dark: "#002a16",  // deep green shadow
      text: "#bfffdc"
    },
    starCount: 120,
    matrixDensity: 0.62, // 0..1
    cursorParticles: 26,
    typeText: "ACCESS GRANTED \u2014 CARNAGE ONLINE",
    typeSpeed: 45, // ms per char
    containerId: "th-carnage"
  };

  // ---------------------------
  // UTILITIES
  // ---------------------------
  function css(s) {
    const el = document.createElement("style");
    el.textContent = s;
    document.head.appendChild(el);
    return el;
  }
  function mk(tag, props) {
    const e = document.createElement(tag);
    if (props) Object.keys(props).forEach(k => e.setAttribute(k, props[k]));
    return e;
  }

  // ---------------------------
  // INJECT BASE STYLES & HTML
  // ---------------------------
  (function injectBase() {
    // Main CSS (keeps it compact but clear)
    css(`
/* Carnage profile base */
#${CFG.containerId}{position:relative;height:100vh;min-height:400px;background:#000;overflow:hidden}
#${CFG.containerId} canvas{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none}
#${CFG.containerId} .frame{position:relative;z-index:60;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:3vh 3vw}
#${CFG.containerId} pre.ascii{white-space:pre;font-family:monospace,monospace;margin:0;line-height:0.95;font-size:1.8rem;letter-spacing:0;color:transparent;position:relative;z-index:62;text-align:center}
/* neon gradient text trick */
#${CFG.containerId} pre.ascii .line{display:block}
#${CFG.containerId} pre.ascii .glow{
  background:linear-gradient(90deg, ${CFG.colors.glow1}, ${CFG.colors.glow2});
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
  text-shadow:0 0 8px rgba(0,255,150,0.12), 0 0 18px rgba(0,234,255,0.08);
  transition:filter .12s, transform .12s, opacity .12s;
  will-change:filter,transform,opacity;
  padding:0 6px;
  border-radius:2px;
}
/* pulsing gradient animation */
@keyframes carnagePulse {
  0%{filter:drop-shadow(0 0 8px rgba(0,255,102,0.9)) hue-rotate(0deg)}
  50%{filter:drop-shadow(0 0 18px rgba(0,234,255,0.9)) hue-rotate(10deg)}
  100%{filter:drop-shadow(0 0 8px rgba(0,255,102,0.9)) hue-rotate(0deg)}
}
#${CFG.containerId} .glowPulse{animation:carnagePulse 2.6s ease-in-out infinite}

/* small scanline overlay using CSS for subtle effect */
#${CFG.containerId} .scanline{
  position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:70;
  background-image:linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.06) 50%);
  background-size:100% 4px;mix-blend-mode:overlay;opacity:0.45;
}
/* CRT vignette */
#${CFG.containerId} .vignette{position:absolute;left:0;top:0;width:100%;height:100%;z-index:71;pointer-events:none;
  background:radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%);}
#${CFG.containerId} .ui{position:relative;z-index:75;margin-top:1vh;color:${CFG.colors.text};font-family:monospace;text-align:center}
#${CFG.containerId} .type{font-size:1rem;opacity:0.95;margin-top:14px;letter-spacing:1px}
#${CFG.containerId} .hidden-skull{position:fixed;left:50%;top:8%;transform:translateX(-50%);padding:14px;background:rgba(0,0,0,0.86);border:1px dashed rgba(0,255,150,0.06);z-index:9999;color:${CFG.colors.text};font-family:monospace;white-space:pre;opacity:0}
/* clickable hint area small */
#${CFG.containerId} .hint{position:fixed;right:12px;top:12px;z-index:80;opacity:0.12;font-family:monospace;color:${CFG.colors.glow1};cursor:pointer}
#${CFG.containerId} .hint:hover{opacity:0.9}
`);
    // Container
    const container = mk("div", { id: CFG.containerId });
    const frame = mk("div", { class: "frame" });
    // ASCII pre
    const pre = mk("pre", { class: "ascii", id: "th-ascii" });
    CFG.ascii.forEach(line => {
      const span = mk("span", { class: "line glow" });
      span.textContent = line;
      pre.appendChild(span);
    });
    // UI: typewriter line
    const ui = mk("div", { class: "ui" });
    const type = mk("div", { class: "type", id: "th-type" });
    ui.appendChild(type);
    // small hint clickable area
    const hint = mk("div", { class: "hint", title: "Click the banner for a surprise" });
    hint.textContent = "[ · · ]";
    // scanline & vignette overlays
    const scan = mk("div", { class: "scanline" });
    const v = mk("div", { class: "vignette" });
    frame.appendChild(pre);
    container.appendChild(frame);
    container.appendChild(scan);
    container.appendChild(v);
    container.appendChild(ui);
    container.appendChild(hint);
    document.body.appendChild(container);
  })();

  // ---------------------------
  // CANVAS LAYERS
  // ---------------------------
  // we create 3 canvases: stars (z -3), matrix (z -2), cursor particles (z 20)
  const canvases = {};
  function mkCanvas(id, z) {
    const c = document.createElement("canvas");
    c.id = id;
    c.style.position = "fixed";
    c.style.left = "0";
    c.style.top = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.zIndex = z;
    c.style.pointerEvents = "none";
    document.body.appendChild(c);
    function fit() {
      c.width = innerWidth;
      c.height = innerHeight;
    }
    fit();
    window.addEventListener("resize", fit);
    return c;
  }
  canvases.stars = mkCanvas("carnage-stars", "-3");
  canvases.matrix = mkCanvas("carnage-matrix", "-2");
  canvases.cursor = mkCanvas("carnage-cursor", "20");

  // ---------------------------
  // STARFIELD
  // ---------------------------
  (function starfield() {
    const c = canvases.stars;
    const ctx = c.getContext("2d");
    let stars = [];
    function reset() {
      stars = [];
      for (let i = 0; i < CFG.starCount; i++) {
        stars.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          z: Math.random() * 1.2 + 0.2,
          r: Math.random() * 1.8 + 0.2,
          vx: (Math.random() - 0.5) * 0.08,
          vy: Math.random() * 0.35 + 0.05
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.globalCompositeOperation = "lighter";
      for (let s of stars) {
        s.x += s.vx * s.z;
        s.y += s.vy * s.z;
        if (s.y > c.height + 6) { s.y = -6; s.x = Math.random() * c.width; }
        if (s.x < -6) s.x = c.width + 6;
        if (s.x > c.width + 6) s.x = -6;
        const alpha = 0.15 + (s.z * 0.6);
        ctx.fillStyle = `rgba(180,255,220,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.7 + s.z / 2), 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    reset();
    frame();
    window.addEventListener("resize", () => reset());
  })();

  // ---------------------------
  // MATRIX RAIN
  // ---------------------------
  (function matrix() {
    const c = canvases.matrix;
    const ctx = c.getContext("2d");
    const fontSize = 14;
    let cols = Math.floor(c.width / fontSize);
    let drops = new Array(cols).fill(1);
    function reset() {
      cols = Math.floor(c.width / fontSize);
      drops = new Array(cols).fill(Math.random() * 20);
    }
    function draw() {
      // translucent black to slowly fade
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < cols; i++) {
        // mix katakana and numbers
        const txt = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // leading bright char
        ctx.fillStyle = "rgba(180,255,180,0.95)";
        ctx.fillText(txt, x, y);
        // tail
        ctx.fillStyle = "rgba(0,180,80,0.24)";
        ctx.fillText(txt, x, y - 18);
        if (y > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      requestAnimationFrame(draw);
    }
    reset();
    draw();
    window.addEventListener("resize", reset);
  })();

  // ---------------------------
  // CURSOR PARTICLE TRAIL
  // ---------------------------
  (function cursorTrail() {
    const c = canvases.cursor;
    const ctx = c.getContext("2d");
    let parts = [];
    function add(x, y) {
      parts.push({ x, y, life: 30 + Math.random() * 18, r: 2 + Math.random() * 3 });
      if (parts.length > CFG.cursorParticles) parts.shift();
    }
    window.addEventListener("mousemove", (e) => { add(e.clientX, e.clientY); });
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life -= 1.2;
        const a = Math.max(0, p.life / 40);
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
        gradient.addColorStop(0, `rgba(0,255,170,${0.7 * a})`);
        gradient.addColorStop(1, "rgba(0,255,170,0)");
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.r * (1 + (1 - a) * 3), 0, Math.PI * 2);
        ctx.fill();
      }
      parts = parts.filter(p => p.life > 0);
      requestAnimationFrame(draw);
    }
    draw();
  })();

  // ---------------------------
  // NEON PULSE + FLICKER (applied to pre.ascii .glow)
  // ---------------------------
  (function neonPulse() {
    const spans = Array.from(document.querySelectorAll("#th-ascii .glow"));
    // add class that runs CSS animation
    spans.forEach(s => s.classList.add("glowPulse"));
    // random flicker
    setInterval(() => {
      const idx = Math.floor(Math.random() * spans.length);
      const s = spans[idx];
      if (!s) return;
      // quick flicker
      s.style.opacity = "0.28";
      s.style.transform = "translateY(1px) skewX(1deg)";
      setTimeout(() => { s.style.opacity = "1"; s.style.transform = "none"; }, 70 + Math.random() * 160);
    }, 4200 + Math.random() * 2400);
    // hover glitch effect
    const pre = document.getElementById("th-ascii");
    pre.addEventListener("mouseenter", () => {
      spans.forEach(s => { s.style.transform = "translateX(-2px)"; s.style.filter = "saturate(1.2)"; });
    });
    pre.addEventListener("mouseleave", () => {
      spans.forEach(s => { s.style.transform = "none"; s.style.filter = "none"; });
    });
    // click -> reveal hidden skull
    pre.addEventListener("click", revealSkull);
    // also hint click
    const hint = document.querySelector(".hint");
    hint.addEventListener("click", revealSkull);
  })();

  // ---------------------------
  // TYPEWRITER INTRO
  // ---------------------------
  (function typewriter() {
    const el = document.getElementById("th-type");
    const text = CFG.typeText;
    let i = 0;
    function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, CFG.typeSpeed);
      } else {
        // after typed, keep visible for 4s then fade slightly
        setTimeout(() => { el.style.transition = "opacity 1s"; el.style.opacity = "0.86"; }, 4000);
      }
    }
    setTimeout(tick, 700); // small delay so banner loads
  })();

  // ---------------------------
  // Revealed ASCII skull (EASTER EGG)
  // ---------------------------
  function revealSkull() {
    if (document.querySelector(".hidden-skull").style.opacity === "1") return;
    const skull = document.createElement("pre");
    skull.className = "hidden-skull";
    skull.textContent = [
"       .-.",
"      (o o)",
"      | O \\",
"       \\   \\",
"        `~~~'"
    ].join("\n");
    document.body.appendChild(skull);
    // fade in, then remove
    setTimeout(() => { skull.style.transition = "opacity .4s, transform .5s"; skull.style.opacity = "1"; skull.style.transform = "translateX(-50%) scale(1)"; }, 30);
    setTimeout(() => { skull.style.opacity = "0"; skull.remove(); }, 9000);
  }

  // ---------------------------
  // BOOT TONE (WebAudio) - short bright beep
  // ---------------------------
  (function bootTone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      function play() {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = 420;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        // ramp for nice pop
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.02, now + 0.02);
        o.start(now);
        o.frequency.exponentialRampToValueAtTime(980, now + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        setTimeout(() => { try { o.stop(); } catch (e) { } }, 230);
      }
      // only start on first user gesture in some browsers; attach a resume handler
      if (ctx.state === "suspended") {
        const resume = () => {
          ctx.resume().then(() => { play(); window.removeEventListener("pointerdown", resume); });
        };
        window.addEventListener("pointerdown", resume, { once: true });
      } else {
        play();
      }
    } catch (e) { /* audio not supported */ }
  })();

  // ---------------------------
  // Graceful fallback: if JS not allowed, the ascii lines still show because we injected them.
  // ---------------------------

  // End of script
})();
