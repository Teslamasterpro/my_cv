/* Scroll reveals, stat count-up, photo lightbox, touch overlay handling,
   Lenis smooth scroll + GSAP text/blur reveals, project work slider.
   GSAP and Lenis load from CDNs; everything falls back gracefully
   to the CSS/IntersectionObserver animations if they don't arrive. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll reveal ---------- */
  var revealables = document.querySelectorAll(".reveal, .reveal-group");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- stat count-up ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.childNodes[0].nodeValue = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        el.childNodes[0].nodeValue = el.getAttribute("data-count");
      });
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  /* ---------- lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lbImg = lightbox.querySelector("img");
    var lbTitle = lightbox.querySelector(".lb-title");
    var lbCaption = lightbox.querySelector(".lb-caption");
    var lbClose = lightbox.querySelector(".lightbox-close");
    var lastFocus = null;

    function openLightbox(tile) {
      lbImg.decoding = "async";
      lbImg.src = tile.getAttribute("data-img");
      lbImg.alt = tile.getAttribute("data-title") || "";
      lbTitle.textContent = tile.getAttribute("data-title") || "";
      lbCaption.textContent = tile.getAttribute("data-caption") || "";
      lightbox.classList.add("open");
      if (lenis) lenis.stop();
      lastFocus = tile;
      lbClose.focus();
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.classList.remove("open");
      if (lenis) lenis.start();
      lbImg.src = "";
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll(".photo[data-img]").forEach(function (tile) {
      tile.addEventListener("click", function () { openLightbox(tile); });
    });

    lbClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
    });
  }

  /* ---------- app window (embedded project demos) ---------- */
  var appModal = document.getElementById("app-modal");
  if (appModal) {
    var appFrame = appModal.querySelector("iframe");
    var appTitle = appModal.querySelector(".app-title");
    var appNewTab = appModal.querySelector(".app-newtab");
    var appClose = appModal.querySelector(".app-close");
    var appLastFocus = null;

    function openApp(url, title, trigger) {
      /* only (re)load if it's a different app — keeps state on reopen */
      if (appFrame.src !== url) appFrame.src = url;
      appTitle.textContent = title;
      appFrame.title = title;
      appNewTab.href = url;
      appModal.classList.add("open");
      if (lenis) lenis.stop();
      appLastFocus = trigger;
      appClose.focus();
      document.body.style.overflow = "hidden";
    }

    function closeApp() {
      appModal.classList.remove("open");
      if (lenis) lenis.start();
      document.body.style.overflow = "";
      if (appLastFocus) appLastFocus.focus();
    }

    document.querySelectorAll("[data-app]").forEach(function (card) {
      card.addEventListener("click", function (e) {
        e.preventDefault();
        openApp(card.getAttribute("data-app"), card.getAttribute("data-app-title") || "", card);
      });
    });

    appClose.addEventListener("click", closeApp);
    appModal.addEventListener("click", function (e) {
      if (e.target === appModal) closeApp();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && appModal.classList.contains("open")) closeApp();
    });
  }

  /* ---------- mobile nav menu ---------- */
  var navEl = document.querySelector(".nav");
  var navToggle = document.querySelector(".nav-toggle");
  if (navEl && navToggle) {
    navToggle.addEventListener("click", function () {
      var open = navEl.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navEl.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        navEl.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reducedMotion) {
    lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 0.9,
      gestureOrientation: "vertical",
      smoothTouch: false
    });
    document.documentElement.classList.add("lenis-active");
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // route same-page anchors through Lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = document.querySelector(a.getAttribute("href"));
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -96 });
        }
      });
    });
  }

  /* ---------- GSAP: hero timeline, split headings, blur reveals ---------- */
  if (window.gsap && window.ScrollTrigger && !reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    document.documentElement.classList.add("gsap-on");
    if (lenis) lenis.on("scroll", ScrollTrigger.update);

    var splitHeading = function (el) {
      if (!window.SplitText) return null;
      return SplitText.create(el, { type: "lines", mask: "lines" });
    };

    document.fonts.ready.then(function () {
      // hero: one orchestrated load sequence
      var hero = document.querySelector(".hero");
      if (hero) {
        var tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from("#hero-avatar", { y: 24, opacity: 0, duration: 0.7 })
          .from(".hero-status", { y: 16, opacity: 0, duration: 0.6 }, "-=0.4");
        var heroTitle = hero.querySelector("h1");
        var heroSplit = splitHeading(heroTitle);
        if (heroSplit) {
          tl.from(heroSplit.lines, { yPercent: 115, duration: 0.9, stagger: 0.09 }, "-=0.35");
        } else {
          tl.from(heroTitle, { y: 32, opacity: 0, duration: 0.8 }, "-=0.35");
        }
        tl.from(".hero-sub", { y: 24, opacity: 0, duration: 0.7 }, "-=0.5")
          .from(".hero-ctas", { y: 24, opacity: 0, duration: 0.7 }, "-=0.5");
      }

      // the avatar flies from the hero and docks below "Hello there."
      var heroAvatar = document.getElementById("hero-avatar");
      var dock = document.getElementById("avatar-dock");
      if (heroAvatar && dock) {
        var untransformedCenter = function (el) {
          var r = el.getBoundingClientRect();
          return {
            x: r.left + r.width / 2 + window.pageXOffset - (parseFloat(gsap.getProperty(el, "x")) || 0),
            y: r.top + r.height / 2 + window.pageYOffset - (parseFloat(gsap.getProperty(el, "y")) || 0)
          };
        };
        // the dock only renders >=769px (see CSS); match that here so
        // phones keep the avatar in the hero
        gsap.matchMedia().add("(min-width: 769px)", function () {
          gsap.to(heroAvatar, {
            x: function () { return untransformedCenter(dock).x - untransformedCenter(heroAvatar).x; },
            y: function () { return untransformedCenter(dock).y - untransformedCenter(heroAvatar).y; },
            scale: function () { return dock.offsetWidth / heroAvatar.offsetWidth; },
            ease: "none",
            scrollTrigger: {
              trigger: "#about",
              start: "top bottom",
              end: "top 40%",
              scrub: 0.6,
              invalidateOnRefresh: true
            }
          });
        });
      }

      // section headings: lines rise out of a mask on scroll
      document.querySelectorAll("[data-split]").forEach(function (el) {
        if (el.closest(".hero")) return;
        var split = splitHeading(el);
        var targets = split ? split.lines : el;
        gsap.from(targets, {
          yPercent: split ? 115 : 0,
          y: split ? 0 : 32,
          opacity: split ? 1 : 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        });
      });

      // eyebrows + section intro copy fade up alongside their heading
      document.querySelectorAll(".section-head .eyebrow, .section-head > p, .pullquote figcaption, .contact .eyebrow, .contact p, .contact .btn, .contact .socials").forEach(function (el) {
        gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true }
        });
      });

      // Aluro's landing-card entrance: blur-to-sharp
      document.querySelectorAll(".blur-reveal").forEach(function (el) {
        gsap.to(el, {
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 80%", once: true }
        });
      });
    });
  }

  /* ---------- work slider (projects) ---------- */
  var slider = document.getElementById("work-slider");
  if (slider) {
    var track = slider.querySelector(".work-track");
    var slides = Array.prototype.slice.call(track.children);
    var dotsWrap = slider.querySelector(".slider-dots");
    var count = slides.length;
    var current = 1; // offset for the prepended clone
    var animating = false;
    var autoplayTimer = null;

    // clone last → front, first → back, for a seamless loop
    var firstClone = slides[0].cloneNode(true);
    var lastClone = slides[count - 1].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    lastClone.setAttribute("aria-hidden", "true");
    track.appendChild(firstClone);
    track.insertBefore(lastClone, slides[0]);

    var dots = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.className = "slider-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to project " + (i + 1));
      dot.addEventListener("click", function () { goTo(i + 1); });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function setX(animate) {
      track.style.transition = animate ? "" : "none";
      track.style.transform = "translateX(-" + current * 100 + "%)";
      if (!animate) void track.offsetWidth; // flush so the jump isn't animated
    }

    function updateDots() {
      var real = (current - 1 + count) % count;
      dots.forEach(function (d, i) { d.classList.toggle("active", i === real); });
    }

    function goTo(index) {
      if (animating || index === current) return;
      if (reducedMotion) {
        // no transition fires, so wrap the clones immediately
        current = index === 0 ? count : index === count + 1 ? 1 : index;
        setX(false);
        updateDots();
        return;
      }
      animating = true;
      current = index;
      setX(true);
      updateDots();
    }

    track.addEventListener("transitionend", function () {
      animating = false;
      if (current === 0) { current = count; setX(false); }
      if (current === count + 1) { current = 1; setX(false); }
    });

    slider.querySelectorAll(".slider-arrow").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goTo(current + parseInt(btn.getAttribute("data-dir"), 10));
        restartAutoplay();
      });
    });

    // swipe
    var startX = null;
    track.addEventListener("pointerdown", function (e) { startX = e.clientX; });
    track.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 48) {
        goTo(current + (dx < 0 ? 1 : -1));
        restartAutoplay();
      }
    });

    function startAutoplay() {
      if (reducedMotion) return;
      autoplayTimer = setInterval(function () { goTo(current + 1); }, 4250);
    }
    function stopAutoplay() { clearInterval(autoplayTimer); }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", startAutoplay);

    setX(false);
    startAutoplay();
  }
})();
