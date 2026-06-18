/* =================================================================
   SERRURIER PROTECTOP — main.js
   Orchestration : smooth scroll, reveals, curseur, hero WebGL,
   carte lazy, formulaire sécurisé. Tout est défensif et nettoyable.
   ================================================================= */
(function () {
  "use strict";

  /* ----------------------------- Helpers ----------------------------- */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var prefersReduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
  var isFinePointer = window.matchMedia
    ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
    : false;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  var hasGSAP   = typeof window.gsap !== "undefined";
  var hasST     = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  var hasLenis  = typeof window.Lenis !== "undefined";
  var hasTHREE  = typeof window.THREE !== "undefined";

  // Registre des nettoyages (listeners, observers, rAF, instances)
  var teardown = [];
  function onCleanup(fn) { if (typeof fn === "function") teardown.push(fn); }

  /* ============================================================
     0. Toujours rendre le contenu lisible
     Si les animations ne tourneront pas (reduced-motion ou GSAP absent),
     on force la visibilité des éléments masqués par défaut via .js
     ============================================================ */
  function forceVisible() {
    $$("[data-reveal], [data-card], [data-stat]").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  }

  /* ============================================================
     1. Année + état du header au scroll
     ============================================================ */
  function initChrome() {
    var yearEl = $("[data-year]");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    var header = $("[data-header]");
    if (!header) return;
    var onScroll = function () {
      if (window.scrollY > 24) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(function () { window.removeEventListener("scroll", onScroll); });
  }

  /* ============================================================
     2. Smooth scroll (Lenis) synchronisé avec ScrollTrigger
     ============================================================ */
  var lenis = null;
  function initSmoothScroll() {
    if (!hasLenis || prefersReduced) return;
    try {
      lenis = new window.Lenis({
        duration: 1.05,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true
      });

      if (hasST) {
        lenis.on("scroll", window.ScrollTrigger.update);
        window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      } else {
        var rafId;
        var raf = function (time) { lenis.raf(time); rafId = requestAnimationFrame(raf); };
        rafId = requestAnimationFrame(raf);
        onCleanup(function () { cancelAnimationFrame(rafId); });
      }
      onCleanup(function () { try { lenis.destroy(); } catch (e) {} lenis = null; });
    } catch (e) {
      lenis = null; // dégradation : scroll natif (html { scroll-behavior:smooth })
    }
  }

  // Ancrage interne fluide (utilise Lenis si dispo, sinon natif)
  function initAnchors() {
    var onClick = function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70 });
      else target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      if (history.replaceState) history.replaceState(null, "", id);
    };
    document.addEventListener("click", onClick);
    onCleanup(function () { document.removeEventListener("click", onClick); });
  }

  /* ============================================================
     3. Reveals & micro-chorégraphie (GSAP + ScrollTrigger)
     ============================================================ */
  function splitHeroTitle() {
    var title = $("[data-split]");
    if (!title) return [];
    var words = (title.textContent || "").trim().split(/\s+/);
    title.textContent = "";
    var spans = [];
    words.forEach(function (w, i) {
      var wrap = document.createElement("span");
      wrap.className = "word";
      var inner = document.createElement("span");
      inner.textContent = w;
      wrap.appendChild(inner);
      title.appendChild(wrap);
      if (i < words.length - 1) title.appendChild(document.createTextNode(" "));
      spans.push(inner);
    });
    return spans;
  }

  function initReveals() {
    if (!hasGSAP || prefersReduced) { forceVisible(); return null; }
    var gsap = window.gsap;
    if (hasST) gsap.registerPlugin(window.ScrollTrigger);

    // Héros : entrée scénarisée.
    // Timeline mise en PAUSE : elle est jouée par l'intro (initPreloader) une fois
    // le déverrouillage terminé, pour synchroniser le reveal avec l'ouverture de l'écran.
    // On utilise fromTo (fin à opacity:1) pour garantir l'état final
    // quelle que soit la valeur CSS de départ (.js [data-reveal]{opacity:0}).
    var heroWords = splitHeroTitle();
    var tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    tl.fromTo(".hero__eyebrow", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 });
    if (heroWords.length) {
      tl.from(heroWords, { yPercent: 115, duration: 0.9, stagger: 0.06 }, "-=0.35");
    }
    tl.fromTo(".hero__lead",   { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.4")
      .fromTo(".hero__cta",    { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.45")
      .fromTo(".hero__proof",  { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.4")
      .fromTo(".hero__scroll", { opacity: 0 },        { opacity: 1, duration: 0.6 }, "-=0.2");

    // Reveals génériques au scroll (les éléments du héros sont gérés par la timeline)
    if (hasST) {
      $$("[data-reveal]").forEach(function (el) {
        if (el.closest(".hero")) return;
        gsap.fromTo(el, { y: 26, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        });
      });

      // Cartes : apparition en cascade
      $$("[data-card]").forEach(function (el) {
        gsap.fromTo(el, { y: 40, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
      });

      initCounters(gsap);
      window.ScrollTrigger.refresh();
    } else {
      forceVisible();
    }

    return tl; // timeline héros (en pause) jouée par l'intro
  }

  /* ============================================================
     3bis. Intro cinématique — séquence de déverrouillage
     ============================================================ */
  function initPreloader(onDone) {
    var pre = $("[data-preloader]");
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      document.documentElement.classList.remove("preloading");
      if (lenis) { try { lenis.start(); } catch (e) {} }
      if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
      if (typeof onDone === "function") { try { onDone(); } catch (e) {} }
    }

    // Pas d'intro : pas d'élément, pas de GSAP, ou mouvement réduit → on révèle direct.
    if (!pre || !hasGSAP || prefersReduced) { finish(); return; }

    var gsap = window.gsap;
    var arc = $("[data-preloader-arc]", pre);
    var pct = $("[data-preloader-pct]", pre);
    var keyhole = $("[data-preloader-keyhole]", pre);
    var CIRC = 339.292; // 2π·54
    var counter = { v: 0 };

    // Verrouille le scroll et repart du haut pendant l'intro
    document.documentElement.classList.add("preloading");
    if (lenis) { try { lenis.stop(); } catch (e) {} }
    if ("scrollRestoration" in history) { try { history.scrollRestoration = "manual"; } catch (e) {} }
    window.scrollTo(0, 0);

    // Garde-fou : l'overlay disparaît quoi qu'il arrive au bout de 5 s
    var failSafe = setTimeout(finish, 5000);

    var tl = gsap.timeline({
      onComplete: function () { clearTimeout(failSafe); finish(); }
    });

    tl.to(counter, {
      v: 100, duration: 1.7, ease: "power2.inOut",
      onUpdate: function () {
        var n = Math.round(counter.v);
        if (pct) pct.textContent = (n < 10 ? "0" : "") + n;
        if (arc) arc.setAttribute("stroke-dashoffset", String(CIRC * (1 - n / 100)));
      }
    })
      // Déclic : la serrure tourne pour déverrouiller
      .to(keyhole, { rotation: 90, duration: 0.55, ease: "back.out(1.8)", transformOrigin: "50% 50%" }, "-=0.05")
      // Petit "punch" de validation
      .to(".preloader__lock", { scale: 1.07, duration: 0.12, transformOrigin: "50% 50%" }, ">-0.06")
      .to(".preloader__lock", { scale: 1, duration: 0.22, ease: "power2.out", transformOrigin: "50% 50%" })
      // L'écran s'ouvre en deux et révèle le hero
      .to(".preloader__center", { opacity: 0, duration: 0.35, ease: "power2.out" }, "-=0.05")
      .to(".preloader__panel--top", { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, "<")
      .to(".preloader__panel--bottom", { yPercent: 100, duration: 0.85, ease: "power4.inOut" }, "<");
  }

  // Compteurs animés
  function initCounters(gsap) {
    $$("[data-stat]").forEach(function (stat) {
      gsap.fromTo(stat, { y: 20, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: stat, start: "top 90%", once: true }
      });
      var valueEl = $(".stat__value", stat);
      if (!valueEl || valueEl.hasAttribute("data-static")) return;
      var target = parseFloat(valueEl.getAttribute("data-count"));
      if (isNaN(target)) return;
      var decimals = parseInt(valueEl.getAttribute("data-decimals") || "0", 10);
      var suffix = valueEl.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.4, ease: "power2.out",
        scrollTrigger: { trigger: stat, start: "top 85%", once: true },
        onUpdate: function () {
          var n = obj.v.toFixed(decimals).replace(".", ",");
          valueEl.textContent = n + suffix;
        }
      });
    });
  }

  /* ============================================================
     4. Curseur personnalisé + magnétisme
     ============================================================ */
  function initCursor() {
    if (!isFinePointer || prefersReduced) return;
    var cursor = $("[data-cursor]");
    if (!cursor) return;
    var dot = $(".cursor__dot", cursor);
    var ring = $(".cursor__ring", cursor);
    var rx = 0, ry = 0, dx = 0, dy = 0, mx = 0, my = 0;
    var rafId, active = false;

    var move = function (e) {
      mx = e.clientX; my = e.clientY;
      if (!active) { active = true; cursor.classList.add("is-active"); }
    };
    var loop = function () {
      dx += (mx - dx) * 0.35; dy += (my - dy) * 0.35;
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      if (dot) dot.style.transform = "translate(" + dx + "px," + dy + "px)";
      if (ring) ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      rafId = requestAnimationFrame(loop);
    };
    var over = function (e) {
      if (e.target.closest("a, button, [data-magnetic], input, select, textarea, label")) cursor.classList.add("is-hover");
    };
    var out = function (e) {
      if (e.target.closest("a, button, [data-magnetic], input, select, textarea, label")) cursor.classList.remove("is-hover");
    };
    var leave = function () { cursor.classList.remove("is-active"); active = false; };

    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseover", over, { passive: true });
    document.addEventListener("mouseout", out, { passive: true });
    document.addEventListener("mouseleave", leave);
    rafId = requestAnimationFrame(loop);

    onCleanup(function () {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      document.removeEventListener("mouseleave", leave);
    });
  }

  function initMagnetic() {
    if (!hasGSAP || !isFinePointer || prefersReduced) return;
    var gsap = window.gsap;
    $$("[data-magnetic]").forEach(function (el) {
      var qx = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
      var qy = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
      var onMove = function (e) {
        var r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.3);
        qy((e.clientY - (r.top + r.height / 2)) * 0.3);
      };
      var onLeave = function () { qx(0); qy(0); };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      onCleanup(function () {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
      });
    });
  }

  /* ============================================================
     5. Héros WebGL (Three.js) — cylindre/mécanisme stylisé
     Optionnel, léger, avec pause hors-vue/onglet caché et fallback.
     ============================================================ */
  function initHeroScene() {
    var canvas = $("[data-hero-canvas]");
    if (!canvas) return;
    // Conditions de dégradation : pas de WebGL, reduced-motion, save-data, pointeur grossier
    if (!hasTHREE || prefersReduced || saveData) return;
    if (!isFinePointer && window.innerWidth < 768) return; // mobile bas de gamme : on garde le fallback CSS

    var THREE = window.THREE;
    var renderer, scene, camera, group, particles, rafId, ro, io;
    var visible = true, inView = true;
    var pointer = { x: 0, y: 0 };

    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (e) {
      return; // WebGL indisponible → fallback CSS reste affiché
    }

    var width = canvas.clientWidth || window.innerWidth;
    var height = canvas.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    group = new THREE.Group();
    scene.add(group);

    // Matériau laiton
    var brass = new THREE.MeshStandardMaterial({
      color: 0xc8a86a, metalness: 0.92, roughness: 0.28
    });
    var brassDim = new THREE.MeshStandardMaterial({
      color: 0x8c7340, metalness: 0.85, roughness: 0.45
    });

    // Trois anneaux concentriques (pênes/cylindre)
    var radii = [2.4, 1.8, 1.2];
    radii.forEach(function (r, i) {
      var geo = new THREE.TorusGeometry(r, 0.07 + i * 0.015, 16, 120);
      var ring = new THREE.Mesh(geo, i === 1 ? brass : brassDim);
      ring.rotation.x = Math.PI / 2.4 + i * 0.12;
      ring.rotation.y = i * 0.3;
      ring.userData.spin = (i % 2 === 0 ? 1 : -1) * (0.06 + i * 0.02);
      group.add(ring);
      onCleanup(function () { geo.dispose(); });
    });

    // Petit noyau central
    var coreGeo = new THREE.IcosahedronGeometry(0.5, 0);
    var core = new THREE.Mesh(coreGeo, brass);
    group.add(core);
    onCleanup(function () { coreGeo.dispose(); });

    // Champ de particules (poussière métallique)
    var COUNT = window.innerWidth < 1024 ? 220 : 420;
    var pos = new Float32Array(COUNT * 3);
    for (var p = 0; p < COUNT; p++) {
      pos[p * 3]     = (Math.random() - 0.5) * 16;
      pos[p * 3 + 1] = (Math.random() - 0.5) * 11;
      pos[p * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var pMat = new THREE.PointsMaterial({ color: 0xd8bd86, size: 0.035, transparent: true, opacity: 0.55 });
    particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    onCleanup(function () { pGeo.dispose(); pMat.dispose(); });

    // Lumières
    var key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(4, 5, 6); scene.add(key);
    var rim = new THREE.DirectionalLight(0xc8a86a, 1.6); rim.position.set(-6, -2, 2); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x404654, 0.7));

    onCleanup(function () {
      brass.dispose(); brassDim.dispose();
      try { renderer.dispose(); } catch (e) {}
    });

    // Interaction pointeur (parallaxe douce)
    var onPointer = function (e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onPointer, { passive: true });
    onCleanup(function () { window.removeEventListener("mousemove", onPointer); });

    // Boucle de rendu
    var clock = new THREE.Clock();
    var render = function () {
      rafId = requestAnimationFrame(render);
      if (!visible || !inView) return;
      var t = clock.getElapsedTime();
      group.children.forEach(function (child) {
        if (child.userData && child.userData.spin) child.rotation.z += child.userData.spin * 0.01;
      });
      core.rotation.x = t * 0.3; core.rotation.y = t * 0.4;
      particles.rotation.y = t * 0.02;
      // parallaxe
      group.rotation.y += ((pointer.x * 0.3) - group.rotation.y) * 0.04;
      group.rotation.x += ((pointer.y * 0.2) - group.rotation.x) * 0.04;
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(render);
    onCleanup(function () { cancelAnimationFrame(rafId); });

    canvas.classList.add("is-ready");

    // Redimensionnement
    var resize = function () {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      if (!width || !height) return;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize); ro.observe(canvas);
      onCleanup(function () { ro.disconnect(); });
    } else {
      window.addEventListener("resize", resize);
      onCleanup(function () { window.removeEventListener("resize", resize); });
    }

    // Pause hors-vue
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.01 });
      io.observe(canvas);
      onCleanup(function () { io.disconnect(); });
    }
    // Pause onglet caché
    var onVis = function () { visible = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    onCleanup(function () { document.removeEventListener("visibilitychange", onVis); });
  }

  /* ============================================================
     6. Carte (chargement à la demande + fallback)
     ============================================================ */
  function initMap() {
    var map = $("[data-map]");
    if (!map) return;
    var src = map.getAttribute("data-map-src");
    if (!src) return;

    var loaded = false;
    var build = function () {
      if (loaded) return;
      loaded = true;
      load();
    };

    var load = function () {
      var iframe = document.createElement("iframe");
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("title", "Plan Google Maps — Serrurier Protectop, 59 Rue Raymond Losserand, 75014 Paris");
      iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      iframe.setAttribute("allow", "fullscreen");
      iframe.setAttribute("allowfullscreen", "");
      // Bac à sable : strict nécessaire au fonctionnement de l'embed Google Maps
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
      var settled = false;
      var fail = setTimeout(function () { if (!settled) cleanupFail(); }, 8000);
      function cleanupFail() { settled = true; clearTimeout(fail); /* fallback reste visible */ }
      iframe.addEventListener("load", function () { settled = true; clearTimeout(fail); map.classList.add("is-loaded"); });
      iframe.addEventListener("error", cleanupFail);
      iframe.src = src; // affecté en dernier pour capter load/error
      map.insertBefore(iframe, map.firstChild);
    };

    // Chargement sur CONSENTEMENT explicite (RGPD/CNIL) : Google Maps dépose des
    // cookies de pistage. L'iframe n'est donc créée qu'après un clic de l'utilisateur.
    var consentBtn = map.querySelector("[data-map-consent]");
    if (consentBtn) {
      var onConsent = function () {
        consentBtn.disabled = true;
        consentBtn.textContent = "Chargement de la carte…";
        build();
      };
      consentBtn.addEventListener("click", onConsent);
      onCleanup(function () { consentBtn.removeEventListener("click", onConsent); });
    } else {
      // Pas de bouton de consentement (ex. carte sans cookie type OSM) : chargement direct.
      build();
    }
  }

  /* ============================================================
     7. Formulaire de devis — validation, anti-spam, upload sécurisé
     ============================================================ */
  function initForm() {
    var form = $("[data-form]");
    if (!form) return;

    var ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    var MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
    var MAX_FILES = 5;

    var fileInput = $("#photos", form);
    var fileList = $("[data-file-list]", form);
    var statusEl = $("[data-form-status]", form);
    var submitBtn = $("[data-submit]", form);
    var submitLabel = $("[data-submit-label]", form);
    var selectedFiles = [];

    function setError(name, msg) {
      var el = form.querySelector('[data-error-for="' + name + '"]');
      var field = form.querySelector('[name="' + name + '"]');
      if (el) el.textContent = msg || "";
      if (field) {
        if (msg) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
      }
    }

    function clearErrors() {
      $$(".field__error", form).forEach(function (e) { e.textContent = ""; });
      $$("[aria-invalid]", form).forEach(function (e) { e.removeAttribute("aria-invalid"); });
    }

    // ---- Gestion des fichiers ----
    function renderFiles() {
      if (!fileList) return;
      fileList.textContent = "";
      selectedFiles.forEach(function (file, idx) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        name.textContent = file.name + " · " + (file.size / 1024 / 1024).toFixed(1) + " Mo"; // textContent : pas d'injection
        var rm = document.createElement("button");
        rm.type = "button";
        rm.setAttribute("aria-label", "Retirer " + file.name);
        rm.textContent = "×";
        rm.addEventListener("click", function () {
          selectedFiles.splice(idx, 1);
          syncInput();
          renderFiles();
        });
        li.appendChild(name);
        li.appendChild(rm);
        fileList.appendChild(li);
      });
    }

    // Reconstruit le FileList de l'input à partir de la sélection validée
    function syncInput() {
      if (!fileInput || typeof DataTransfer === "undefined") return;
      var dt = new DataTransfer();
      selectedFiles.forEach(function (f) { dt.items.add(f); });
      fileInput.files = dt.files;
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        setError("photos", "");
        var incoming = Array.prototype.slice.call(fileInput.files || []);
        var errors = [];
        incoming.forEach(function (file) {
          if (selectedFiles.length >= MAX_FILES) { errors.push("5 fichiers maximum."); return; }
          if (ALLOWED.indexOf(file.type) === -1) { errors.push("Format non accepté : " + file.name); return; }
          if (file.size > MAX_SIZE) { errors.push("Trop volumineux (5 Mo max) : " + file.name); return; }
          // doublon ?
          var dup = selectedFiles.some(function (f) { return f.name === file.name && f.size === file.size; });
          if (!dup) selectedFiles.push(file);
        });
        if (errors.length) setError("photos", errors[0]);
        syncInput();
        renderFiles();
      });
    }

    // ---- Validation des champs ----
    function validate() {
      clearErrors();
      var ok = true;
      var data = {
        name: (form.name.value || "").trim(),
        phone: (form.phone.value || "").trim(),
        email: (form.email.value || "").trim(),
        message: (form.message.value || "").trim()
      };

      if (data.name.length < 2) { setError("name", "Merci d'indiquer votre nom."); ok = false; }

      // Téléphone : chiffres, espaces, + . - ( ) ; 6 à 20 caractères utiles
      var phoneDigits = data.phone.replace(/[^0-9]/g, "");
      if (phoneDigits.length < 6 || !/^[0-9+\s().-]{6,20}$/.test(data.phone)) {
        setError("phone", "Numéro de téléphone invalide."); ok = false;
      }

      if (data.email) {
        // Validation email simple et bornée (pas de regex catastrophique)
        if (!/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(data.email)) {
          setError("email", "Adresse email invalide."); ok = false;
        }
      }

      if (data.message.length < 10) { setError("message", "Décrivez votre besoin en quelques mots."); ok = false; }

      if (!form.consent.checked) { setError("consent", "Votre accord est nécessaire pour vous recontacter."); ok = false; }

      return ok ? data : null;
    }

    // ---- Soumission ----
    var lastSubmit = 0;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (statusEl) { statusEl.textContent = ""; statusEl.className = "form__status"; }

      // Honeypot : rempli => robot. On simule un succès neutre sans rien envoyer.
      var hp = form.querySelector('[name="company"]');
      if (hp && hp.value) {
        if (statusEl) { statusEl.textContent = "Merci, votre demande a bien été prise en compte."; statusEl.classList.add("is-ok"); }
        return;
      }

      // Anti-flood : 1 envoi / 15 s
      var now = Date.now();
      if (now - lastSubmit < 15000) {
        if (statusEl) { statusEl.textContent = "Merci de patienter quelques secondes avant de renvoyer."; statusEl.classList.add("is-error"); }
        return;
      }

      var data = validate();
      if (!data) {
        if (statusEl) { statusEl.textContent = "Veuillez corriger les champs en rouge."; statusEl.classList.add("is-error"); }
        var firstErr = form.querySelector('[aria-invalid="true"]');
        if (firstErr) firstErr.focus();
        return;
      }

      lastSubmit = now;
      submit(data);
    });

    function submit(data) {
      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = "Envoi en cours…";

      // ⚠️ DÉMO : aucun envoi réel n'est effectué côté client.
      // En production, POSTer vers VOTRE endpoint serveur (qui re-valide tout,
      // gère l'upload des photos et l'anti-spam). Voir README › Sécurité.
      var FormData_ = window.FormData ? new FormData(form) : null; // prêt pour un vrai POST

      window.setTimeout(function () {
        if (submitBtn) submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = "Envoyer ma demande";
        if (statusEl) {
          statusEl.textContent = "Merci " + firstName(data.name) + " ! Votre demande est bien reçue. Pour une urgence, appelez le 01 40 47 09 91.";
          statusEl.classList.add("is-ok");
        }
        form.reset();
        selectedFiles = [];
        renderFiles();
        syncInput();
      }, 700);
    }

    function firstName(full) {
      var f = (full || "").split(/\s+/)[0] || "";
      return f.length > 40 ? f.slice(0, 40) : f; // borne d'affichage
    }
  }

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    var heroTL = null;
    try { initChrome(); } catch (e) {}
    try { initSmoothScroll(); } catch (e) {}
    try { initAnchors(); } catch (e) {}
    try { heroTL = initReveals(); } catch (e) { forceVisible(); }
    try { initCursor(); } catch (e) {}
    try { initMagnetic(); } catch (e) {}
    try { initHeroScene(); } catch (e) {}
    try { initMap(); } catch (e) {}
    try { initForm(); } catch (e) {}

    // L'intro joue le reveal du hero à la fin du déverrouillage.
    var playHero = function () { if (heroTL) { try { heroTL.play(); } catch (e) {} } };
    try { initPreloader(playHero); } catch (e) { playHero(); }
  }

  // Nettoyage global (navigation / fermeture)
  window.addEventListener("pagehide", function () {
    teardown.forEach(function (fn) { try { fn(); } catch (e) {} });
    teardown.length = 0;
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
