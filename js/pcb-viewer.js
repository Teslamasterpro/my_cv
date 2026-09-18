/* ------------------------------------------------------------------
   Interactive 3D viewer for a single glTF/GLB model.

   Used by projects/embedded-cad.html to show the AM243x breakout board
   exported from STEP. Meshopt-compressed GLB, orbit controls, and the
   same dark surface / green accent language as the rest of the site.
   ------------------------------------------------------------------ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const root = document.getElementById("pcb-viewer");
if (root) init(root);

function init(root) {
	const stage = root.querySelector(".viewer3d-stage");
	const status = root.querySelector(".v3-status");
	const statusText = status.querySelector("span");
	const url = root.dataset.model;

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.05;
	stage.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0e1116);

	const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.rotateSpeed = 0.85;
	controls.panSpeed = 0.7;
	controls.autoRotateSpeed = 1.1;

	/* lighting — soft key from above-front, cool fill behind, so copper
	   pours and silkscreen both read against the dark background */
	scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x1a1d23, 1.35));
	const key = new THREE.DirectionalLight(0xffffff, 2.1);
	key.position.set(2, 3.4, 2.6);
	scene.add(key);
	const fill = new THREE.DirectionalLight(0x9fc4ff, 0.9);
	fill.position.set(-2.6, 1.2, -2);
	scene.add(fill);
	const rim = new THREE.DirectionalLight(0x24d861, 0.35);
	rim.position.set(0, -2.4, -1.4);
	scene.add(rim);

	const model = new THREE.Group();
	scene.add(model);

	let radius = 1;
	let wireframe = false;
	const materials = [];

	const loader = new GLTFLoader();
	loader.setMeshoptDecoder(MeshoptDecoder);

	loader.load(
		url,
		(gltf) => {
			/* CAD exports keep their own idea of which way is up, so lay the
			   board flat by its own geometry: the thinnest axis becomes Y */
			const inner = new THREE.Group();
			inner.add(gltf.scene);

			const raw = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
			if (raw.z <= raw.x && raw.z <= raw.y) inner.rotation.x = -Math.PI / 2;
			else if (raw.x <= raw.y && raw.x <= raw.z) inner.rotation.z = Math.PI / 2;
			model.add(inner);

			/* recentre on the bounding box and normalise the scale —
			   STEP exports arrive in metres and off-origin */
			const box = new THREE.Box3().setFromObject(inner);
			const size = box.getSize(new THREE.Vector3());
			const centre = box.getCenter(new THREE.Vector3());
			const scale = 1 / (Math.max(size.x, size.y, size.z) || 1);

			inner.position.sub(centre);
			model.scale.setScalar(scale);
			radius = 0.5 * size.length() * scale;

			gltf.scene.traverse((node) => {
				if (!node.isMesh) return;
				node.material.side = THREE.DoubleSide;
				if (node.material.metalness !== undefined) {
					node.material.metalness = Math.min(node.material.metalness ?? 0.2, 0.35);
					node.material.roughness = 0.55;
				}
				materials.push(node.material);
			});

			resetView();
			status.hidden = true;
			if (!reducedMotion) controls.autoRotate = true;
			syncButtons();
		},
		(progress) => {
			if (progress.total) {
				const pct = Math.round((progress.loaded / progress.total) * 100);
				statusText.textContent = "Loading 3D model… " + pct + "%";
			}
		},
		() => {
			status.querySelector(".v3-spinner").remove();
			statusText.textContent = "The 3D model could not be loaded — the schematic and routing views below show the same board.";
		}
	);

	function resetView() {
		/* 3/4 view from the component side, framed to the model's radius */
		const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.02;
		const dir = new THREE.Vector3(0.62, 0.55, 0.62).normalize();
		camera.position.copy(dir.multiplyScalar(dist));
		camera.near = dist / 100;
		camera.far = dist * 20;
		camera.updateProjectionMatrix();
		controls.target.set(0, 0, 0);
		controls.update();
	}

	function syncButtons() {
		root.querySelectorAll("[data-v3]").forEach((btn) => {
			const on =
				(btn.dataset.v3 === "spin" && controls.autoRotate) ||
				(btn.dataset.v3 === "wire" && wireframe);
			btn.classList.toggle("is-on", on);
			if (btn.dataset.v3 !== "reset") btn.setAttribute("aria-pressed", on ? "true" : "false");
		});
	}

	root.querySelectorAll("[data-v3]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const action = btn.dataset.v3;
			if (action === "reset") {
				resetView();
			} else if (action === "spin") {
				controls.autoRotate = !controls.autoRotate;
			} else if (action === "wire") {
				wireframe = !wireframe;
				materials.forEach((m) => { m.wireframe = wireframe; });
			}
			syncButtons();
		});
	});

	/* pause the loop when the viewer is off-screen */
	let visible = true;
	if ("IntersectionObserver" in window) {
		new IntersectionObserver((entries) => {
			visible = entries[0].isIntersecting;
		}, { threshold: 0.01 }).observe(root);
	}

	function resize() {
		const w = stage.clientWidth;
		const h = stage.clientHeight;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
	else window.addEventListener("resize", resize);
	resize();

	renderer.setAnimationLoop(() => {
		if (!visible) return;
		controls.update();
		renderer.render(scene, camera);
	});
}
