/* =====================================================
   ÁLBUM DIGITAL XV AÑOS · Estrellita
   Agrega aquí las rutas de TODAS tus fotografías,
   en el orden en que quieres que aparezcan.
   ===================================================== */
const fotografias = [
  "fotos/foto1.jpg",
  "fotos/foto2.jpg",
  "fotos/foto3.jpg",
  "fotos/foto4.jpg"
];

(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const portada = $("#portada"), app = $("#app"), libro = $("#libro"), audio = $("#musica");
  const btnMus = $("#btnMusica"), vol = $("#volumen"), ind = $("#indicador");
  const prev = $("#btnPrev"), next = $("#btnNext"), aviso = $("#aviso"), btnFs = $("#btnPantalla");
  const raiz = document.documentElement;

  // Páginas: "base" (una por vez, móvil) y "dbl" (libro abierto, el total siempre es impar
  // para que la página final caiga en el lado derecho).
  const base = fotografias.map((src) => ({ t: "foto", src })).concat({ t: "fin" });
  const dbl = base.slice(0, -1);
  if (dbl.length % 2) dbl.push({ t: "blank" });
  dbl.push({ t: "fin" });

  let doble = false, s = 0, N = 0, max = 0, busy = false, pos = 0, sheets = [], medido = false;

  /* ---------- Avisos ---------- */
  let tAviso;
  function avisar(txt) {
    aviso.textContent = txt; aviso.classList.add("ver");
    clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove("ver"), 4500);
  }

  /* ---------- Construcción de páginas ---------- */
  function cara(p, cls) {
    const d = document.createElement("div");
    d.className = "face " + cls;
    if (p.t === "foto") {
      const i = new Image();
      i.alt = "Fotografía del álbum"; i.decoding = "async"; i.draggable = false;
      i.dataset.src = p.src;
      i.onerror = () => { d.classList.add("rota"); d.textContent = "No se pudo cargar esta fotografía"; };
      d.appendChild(i);
    } else if (p.t === "fin") {
      d.appendChild($("#tplFinal").content.cloneNode(true));
      d.querySelector(".reiniciar").addEventListener("click", reiniciar);
    }
    return d;
  }

  function construir() {
    libro.innerHTML = ""; sheets = [];
    libro.className = "libro " + (doble ? "doble" : "uno") + " quieto";
    const b = document.createElement("div"); b.className = "base"; libro.appendChild(b);
    const lista = doble ? dbl : base;
    N = doble ? (lista.length + 1) / 2 : lista.length;
    max = N - 1;
    for (let i = 0; i < N; i++) {
      const sh = document.createElement("div"); sh.className = "sheet";
      sh.appendChild(cara(lista[doble ? 2 * i : i], "front"));
      if (doble) sh.appendChild(cara(lista[2 * i + 1] || { t: "blank" }, "back"));
      libro.appendChild(sh); sheets.push(sh);
    }
    if (doble) { const idx = pos === base.length - 1 ? dbl.length - 1 : pos; s = Math.floor(idx / 2); }
    else s = pos;
    s = Math.min(s, max);
    sheets.forEach((sh, i) => sh.classList.toggle("flipped", i < s));
    actualizar();
    void libro.offsetWidth;            // fuerza el estilo antes de reactivar animaciones
    libro.classList.remove("quieto");
  }

  function actualizar() {
    pos = doble ? (2 * s === dbl.length - 1 ? base.length - 1 : 2 * s) : s;
    sheets.forEach((e, i) => {
      if (!e.classList.contains("girando")) e.style.zIndex = i < s ? i + 1 : N - i;
      e.classList.toggle("lejos", Math.abs(i - s) > 3);
    });
    for (let i = Math.max(0, s - 2); i <= Math.min(N - 1, s + 4); i++) {
      sheets[i].querySelectorAll("img[data-src]").forEach((im) => {
        if (!im.getAttribute("src")) im.src = im.dataset.src;   // se carga una sola vez
      });
    }
    const T = base.length;
    let txt = String(pos + 1);
    if (doble && s > 0 && dbl[2 * s - 1] && dbl[2 * s - 1].t !== "blank") txt = (2 * s) + " – " + (pos + 1);
    ind.textContent = "Página " + txt + " de " + T;
    prev.disabled = s <= 0; next.disabled = s >= max;
  }

  /* ---------- Navegación ---------- */
  function ir(d) {
    if (busy) return;
    const ns = s + d;
    if (ns < 0 || ns > max) return;
    busy = true;
    const sh = sheets[d > 0 ? s : ns];
    sh.classList.remove("lejos");
    sh.classList.add("girando"); sh.style.zIndex = N + 5;
    void sh.offsetWidth;
    sh.classList.toggle("flipped", d > 0);
    s = ns; actualizar();
    let hecho = false;
    const fin = () => { if (hecho) return; hecho = true; sh.classList.remove("girando"); busy = false; actualizar(); };
    sh.addEventListener("transitionend", (e) => { if (e.target === sh && e.propertyName === "transform") fin(); });
    setTimeout(fin, 1150);
  }

  function reiniciar() {
    if (busy) return;
    libro.classList.add("quieto");
    sheets.forEach((e) => e.classList.remove("flipped"));
    s = 0; actualizar();
    void libro.offsetWidth;
    libro.classList.remove("quieto");
    libro.style.animation = "none"; void libro.offsetWidth; libro.style.animation = "";
  }

  /* ---------- Tamaño y modo ---------- */
  function medir() {
    const w = innerWidth, h = innerHeight;
    const nd = w >= 900 && w / h > 1.15;
    const aw = w - 24, ah = Math.max(160, h - 135);
    const pw = Math.floor(Math.min(nd ? aw / 2 : aw, ah * 0.75));
    raiz.style.setProperty("--pw", pw + "px");
    raiz.style.setProperty("--ph", Math.floor(pw / 0.75) + "px");
    if (!medido || nd !== doble) { doble = nd; medido = true; if (!app.hidden) construir(); }
  }
  let tRes; addEventListener("resize", () => { clearTimeout(tRes); tRes = setTimeout(medir, 120); });

  /* ---------- Música ---------- */
  function estado(on) {
    btnMus.classList.toggle("on", on); btnMus.setAttribute("aria-pressed", on);
    btnMus.setAttribute("aria-label", on ? "Pausar música" : "Reproducir música");
    btnMus.title = on ? "Música: sonando (clic para pausar)" : "Música: en pausa (clic para reproducir)";
  }
  function sonar() {
    audio.volume = +vol.value;
    const p = audio.play();
    if (p && p.catch) p.catch(() => { estado(false); avisar("No se pudo reproducir musica.mp3. Revisa que el archivo exista."); });
  }
  audio.addEventListener("play", () => estado(true));
  audio.addEventListener("pause", () => estado(false));
  audio.addEventListener("error", () => { estado(false); avisar("No se encontró o no se puede leer musica.mp3."); });
  btnMus.addEventListener("click", () => (audio.paused ? sonar() : audio.pause()));
  vol.addEventListener("input", () => { audio.volume = +vol.value; });
  estado(false);

  /* ---------- Portada, pantalla completa, teclado, gestos ---------- */
  $("#btnAbrir").addEventListener("click", () => {
    sonar();                                   // la música inicia con el clic del usuario
    app.hidden = false; medir(); construir();
    portada.classList.add("oculta");
  });
  $("#btnPortada").addEventListener("click", () => { app.hidden = true; portada.classList.remove("oculta"); });

  if (!raiz.requestFullscreen && !raiz.webkitRequestFullscreen) btnFs.hidden = true;
  btnFs.addEventListener("click", () => {
    const en = document.fullscreenElement || document.webkitFullscreenElement;
    if (en) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (raiz.requestFullscreen || raiz.webkitRequestFullscreen).call(raiz)?.catch?.(() => {});
  });
  document.addEventListener("fullscreenchange", medir);

  prev.addEventListener("click", () => ir(-1));
  next.addEventListener("click", () => ir(1));
  addEventListener("keydown", (e) => {
    if (app.hidden) return;
    if (e.key === "ArrowRight") ir(1); else if (e.key === "ArrowLeft") ir(-1);
  });

  let x0 = 0, y0 = 0;
  libro.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  libro.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1);
  }, { passive: true });
  libro.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    const r = libro.getBoundingClientRect();
    ir(e.clientX - r.left > r.width / 2 ? 1 : -1);
  });

  /* ---------- Destellos de la portada ---------- */
  for (let i = 0; i < 16; i++) {
    const c = document.createElement("span"); c.className = "chispa";
    c.style.left = Math.random() * 100 + "%"; c.style.top = Math.random() * 100 + "%";
    c.style.animationDelay = (Math.random() * 4.5).toFixed(2) + "s";
    c.style.animationDuration = (3.5 + Math.random() * 3).toFixed(2) + "s";
    portada.appendChild(c);
  }
  medir();
})();
