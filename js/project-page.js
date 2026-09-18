/* ------------------------------------------------------------------
   Shared behaviour for the project category pages
   (projects/ml-vision.html, analysis-tools.html, embedded-cad.html).

   Both pieces no-op when their markup isn't on the page.
   ------------------------------------------------------------------ */
(function () {
	"use strict";

	/* ---------- category switcher ----------
	   On phones the three categories scroll sideways in one strip, so
	   centre the current one instead of leaving it clipped off-screen.
	   scrollLeft rather than scrollIntoView: that would scroll the page. */
	var strip = document.querySelector(".pp-switch");
	if (strip) {
		var current = strip.querySelector('[aria-current="page"]');
		if (current) {
			var centre = function () {
				var left = current.offsetLeft - strip.offsetLeft;
				strip.scrollLeft = Math.max(0, left - (strip.clientWidth - current.offsetWidth) / 2);
			};
			centre();
			/* the strip only overflows once Space Mono has swapped in, so
			   measure again after the webfont lands (and on rotation) */
			if (document.fonts && document.fonts.ready) document.fonts.ready.then(centre);
			window.addEventListener("resize", centre);
		}
	}

	/* ---------- image lightbox ---------- */
	var box = document.getElementById("pp-lightbox");
	if (!box) return;

	var img = box.querySelector("img");
	var close = box.querySelector(".pp-lightbox-close");
	var lastFocus = null;

	document.querySelectorAll(".shot:not([data-nozoom]) img").forEach(function (thumb) {
		thumb.parentElement.addEventListener("click", function () {
			img.src = thumb.src;
			img.alt = thumb.alt;
			box.classList.add("open");
			document.body.style.overflow = "hidden";
			lastFocus = thumb.parentElement;
			close.focus();
		});
	});

	function hide() {
		box.classList.remove("open");
		document.body.style.overflow = "";
		if (lastFocus && lastFocus.focus) lastFocus.focus();
	}

	box.addEventListener("click", hide);
	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape" && box.classList.contains("open")) hide();
	});
})();
