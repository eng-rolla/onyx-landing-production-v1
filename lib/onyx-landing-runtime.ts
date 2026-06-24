// @ts-nocheck

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import SimplexNoise from "simplex-noise";

export function mountOnyxLanding() {
  const root = document.querySelector(".landing-page");
  const sceneMount = document.getElementById("scene");

  if (!root || !sceneMount || sceneMount.dataset.ready === "true") {
    return null;
  }

  sceneMount.dataset.ready = "true";

  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  const remap = (x, a, b) => (x - a) / (b - a);
  const seg = (x, a, b) => clamp01(remap(x, a, b));

  const nav = document.querySelector(".nav");
  const heroText = document.getElementById("heroText");
  const matrixText = document.getElementById("matrixText");
  const breachText = document.getElementById("breachText");
  const finalText = document.getElementById("finalText");
  const preventText = document.getElementById("preventText");
  const servicesRow = document.getElementById("servicesRow");
  const safariHeroNebula = document.getElementById("safariHeroNebula");
  const cards = Array.from(document.querySelectorAll("#servicesRow .service-card"));
  const narrativeSpacer = document.querySelector(".landing-narrative-spacer");
  const readinessSection = document.querySelector(".readiness-section");
  const audienceSection = document.getElementById("audience");
  const featureStage = document.getElementById("features");
  const faqSection = document.getElementById("faqs");
  const contactSection = document.getElementById("contact");
  const postFaqNebula = document.getElementById("postFaqNebula");
  const featureRailShell = document.getElementById("featureRailShell");
  const featureRail = document.getElementById("featureRail");
  const featureSteps = Array.from(document.querySelectorAll("[data-feature-step]"));
  const featureIndicators = Array.from(document.querySelectorAll("[data-feature-indicator]"));
  const featureProgressFill = document.querySelector(".feature-rail-fill");
  let featureObserver;
  let formInteractionTimeout = 0;
  let formIsActive = false;

  const setFormIsActive = (active) => {
    formIsActive = active;
    root.classList.toggle("is-form-active", active);
  };

  const handleFormFocusIn = (event) => {
    if (!event.target?.matches?.("input, textarea, select")) return;
    window.clearTimeout(formInteractionTimeout);
    setFormIsActive(true);
  };

  const handleFormFocusOut = () => {
    window.clearTimeout(formInteractionTimeout);
    formInteractionTimeout = window.setTimeout(() => {
      const activeElement = document.activeElement;
      setFormIsActive(Boolean(activeElement?.matches?.("input, textarea, select")));
    }, 160);
  };

  const setNarrativeLayer = (element, opacity, transform) => {
    if (!element) return;

    const nextOpacity = clamp01(Number.isFinite(opacity) ? opacity : 0);
    element.style.opacity = `${nextOpacity}`;
    element.style.visibility = nextOpacity > 0.012 ? "visible" : "hidden";
    element.style.pointerEvents = nextOpacity > 0.18 ? "auto" : "none";
    if (transform) {
      element.style.transform = transform;
    }
  };

  const onScrollNav = () => {
    if (!nav) return;
    if (window.scrollY > 4) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };

  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });
  root.addEventListener("focusin", handleFormFocusIn);
  root.addEventListener("focusout", handleFormFocusOut);

  const syncFeatureProgress = (index) => {
    featureIndicators.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === index);
    });
    if (featureProgressFill) {
      const fill = featureSteps.length > 1 ? (index / (featureSteps.length - 1)) * 100 : 100;
      featureProgressFill.style.height = `${fill}%`;
    }
  };

  const syncFeatureRailPosition = () => {
    if (!featureRailShell || !featureRail) return;

    featureRail.classList.remove("is-pinned", "is-bottomed");
    featureRail.style.left = "";
    featureRail.style.width = "";

    if (window.innerWidth <= 1080) return;

    const shellRect = featureRailShell.getBoundingClientRect();
    const railHeight = featureRail.offsetHeight;
    const topOffset = 92;

    if (shellRect.top > topOffset) return;

    if (shellRect.bottom <= topOffset + railHeight) {
      featureRail.classList.add("is-bottomed");
      return;
    }

    featureRail.classList.add("is-pinned");
    featureRail.style.left = `${shellRect.left}px`;
    featureRail.style.width = `${featureRailShell.offsetWidth}px`;
  };

  if (featureSteps.length && featureIndicators.length) {
    syncFeatureProgress(0);
    if ("IntersectionObserver" in window) {
      featureObserver = new IntersectionObserver(
        (entries) => {
          const activeEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!activeEntry) return;
          const stepIndex = Number(activeEntry.target.getAttribute("data-feature-step")) || 0;
          syncFeatureProgress(stepIndex);
        },
        {
          rootMargin: "-18% 0px -30% 0px",
          threshold: [0.2, 0.45, 0.7],
        },
      );
      featureSteps.forEach((step) => featureObserver.observe(step));
    }
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.012);
  // On tablet/mobile, keep the nebula + starfield but drop the central sphere
  // particle systems (the morphing "field" sphere and the "attack" burst).
  const hideCoreParticles = window.innerWidth <= 1080;
  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/i.test(navigator.userAgent) &&
    /Apple/i.test(navigator.vendor) &&
    !/CriOS|Chrome|Chromium|EdgiOS|FxiOS|OPiOS/i.test(navigator.userAgent);

  const getMotionProfile = () => {
    const width = window.innerWidth;
    if (width <= 640) {
      return {
        animationIntensity: 0.72,
        animationSpeed: 0.82,
        renderScale: 0.52,
        maxPixelRatio: 1.25,
      };
    }
    if (width <= 900) {
      return {
        animationIntensity: 0.84,
        animationSpeed: 0.9,
        renderScale: 0.68,
        maxPixelRatio: 1.5,
      };
    }
    return {
      animationIntensity: 1,
      animationSpeed: 1,
      renderScale: 1,
      maxPixelRatio: 1.75,
    };
  };
  const motionProfile = getMotionProfile();
  const animationIntensity = motionProfile.animationIntensity;
  const animationSpeed = motionProfile.animationSpeed;
  const renderScale = motionProfile.renderScale;
  const getRendererPixelRatio = () => Math.min(window.devicePixelRatio || 1, motionProfile.maxPixelRatio);
  const getMobileCameraPullback = () => {
    const width = window.innerWidth;
    if (width <= 640) return 1.58;
    if (width <= 900) return 1.22;
    return 1;
  };
  const getMobileMatrixScale = () => {
    const width = window.innerWidth;
    if (width <= 640) return 0.66;
    if (width <= 900) return 0.82;
    return 1;
  };
  const getMobileAttackStartX = () => {
    const width = window.innerWidth;
    if (width <= 640) return 5.1;
    if (width <= 900) return 6.1;
    return 7;
  };
  const getMobileParticleScale = () => {
    const width = window.innerWidth;
    if (width <= 640) return 0.74;
    if (width <= 900) return 0.86;
    return 1;
  };
  const getMobileNebulaOverscan = () => {
    const width = window.innerWidth;
    if (width <= 640) return 1.14;
    if (width <= 900) return 1.07;
    return 1;
  };

  const getSceneViewportWidth = () => Math.max(sceneMount.clientWidth || window.innerWidth, 1);
  const getSceneViewportHeight = () => Math.max(sceneMount.clientHeight || window.innerHeight, 1);
  const initialViewportWidth = getSceneViewportWidth();
  const initialViewportHeight = getSceneViewportHeight();

  const camera = new THREE.PerspectiveCamera(75, initialViewportWidth / initialViewportHeight, 0.1, 4000);
  camera.position.z = 4;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(getRendererPixelRatio());
  renderer.setSize(initialViewportWidth, initialViewportHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  sceneMount.appendChild(renderer.domElement);

  const useDesktopBloom = window.innerWidth > 900;
  const composer = useDesktopBloom ? new EffectComposer(renderer) : null;
  const renderPass = useDesktopBloom ? new RenderPass(scene, camera) : null;
  const bloomPass = useDesktopBloom
    ? new UnrealBloomPass(new THREE.Vector2(initialViewportWidth, initialViewportHeight), 1.05, 0.55, 0.5)
    : null;
  if (composer && renderPass && bloomPass) {
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
  }

  /*
   * Dev performance notes:
   * - Chrome: Performance panel, record a fast navbar jump and scroll through Features/FAQ/Contact.
   * - Safari: Timelines, watch Frames + JavaScript while jumping to FAQ/Contact.
   * - Mobile Safari: remote Web Inspector, confirm off-screen/hidden tabs stop animation work.
   */

  function discTex(size = 64, edge = 0.9) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(edge, "rgba(255,255,255,1)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  function starTex(size = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(200,230,255,0.9)");
    g.addColorStop(0.6, "rgba(180,220,255,0.35)");
    g.addColorStop(1.0, "rgba(160,200,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  function nebTex(stops) {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d");
    const g1 = x.createRadialGradient(size * 0.45, size * 0.55, 0, size * 0.45, size * 0.55, size * 0.52);
    stops.forEach(([p, col]) => g1.addColorStop(p, col));
    x.fillStyle = g1;
    x.fillRect(0, 0, size, size);
    const g2 = x.createRadialGradient(size * 0.65, size * 0.35, 0, size * 0.7, size * 0.4, size * 0.45);
    x.globalAlpha = 0.5;
    x.fillStyle = g2;
    x.fillRect(0, 0, size, size);
    x.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (isSafari) {
      // Safari can reveal the quad bounds of these large transparent glows.
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.premultiplyAlpha = true;
      tex.needsUpdate = true;
      return tex;
    }
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  function redBreachTex(size = 1024) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, "rgba(255,0,0,0.55)");
    g.addColorStop(0.55, "rgba(255,0,0,0.08)");
    g.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  const bgGroup = new THREE.Group();
  scene.add(bgGroup);

  const starsGeo = new THREE.BufferGeometry();
  const starsN = 360;
  const sPos = new Float32Array(starsN * 3);
  const sCol = new Float32Array(starsN * 3);
  const starColorA = new THREE.Color("#cfe8ff");
  const starColorB = new THREE.Color("#e7e0ff");

  for (let i = 0; i < starsN; i++) {
    const r = 90 + Math.random() * 40;
    const t = Math.random() * 2 * Math.PI;
    const u = Math.random() * 2 - 1;
    const sn = Math.sqrt(1 - u * u);
    sPos.set([r * sn * Math.cos(t), r * u, r * sn * Math.sin(t)], i * 3);
    const c = starColorA.clone().lerp(starColorB, Math.random() * 0.5);
    sCol.set([c.r, c.g, c.b], i * 3);
  }

  starsGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  starsGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));

  const starsMat = new THREE.PointsMaterial({
    map: starTex(128),
    size: 1.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const stars = new THREE.Points(starsGeo, starsMat);
  bgGroup.add(stars);

  const starNoise = new SimplexNoise();
  const sBase = sPos.slice();
  const sPhase = new Float32Array(starsN);
  const sSpeed = new Float32Array(starsN);
  for (let i = 0; i < starsN; i++) {
    sPhase[i] = Math.random() * Math.PI * 2;
    sSpeed[i] = 0.6 + Math.random() * 0.8;
  }
  const STAR_AMP = 5.0 * animationIntensity;
  const STAR_SPEED = 0.08 * animationSpeed;

  function nebSprite(stops, scale, opacity = 0.45) {
    const tex = nebTex(stops);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      depthWrite: false,
      depthTest: true,
      fog: false,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.setScalar(scale);
    sp.renderOrder = -5;
    return sp;
  }

  const n1 = nebSprite([[0, "rgba(120,90,255,0.55)"], [0.45, "rgba(80,50,200,0.20)"], [1, "rgba(0,0,0,0)"]], 220, 0.42);
  const n2 = nebSprite([[0, "rgba(0,232,255,0.48)"], [0.5, "rgba(0,160,200,0.18)"], [1, "rgba(0,0,0,0)"]], 200, 0.36);
  const n3 = nebSprite([[0, "rgba(255,255,217,0.40)"], [0.55, "rgba(160,140,80,0.16)"], [1, "rgba(0,0,0,0)"]], 260, 0.3);
  n1.position.set(-12, 3.5, -110);
  n2.position.set(10, -5.0, -150);
  n3.position.set(-2, 6.0, -190);
  bgGroup.add(n1, n2, n3);

  const nebulas = [
    { sp: n1, basePos: n1.position.clone(), baseScale: n1.scale.x, targetPos: new THREE.Vector3(-1.2, 0.6, -160), targetScale: 230 },
    { sp: n2, basePos: n2.position.clone(), baseScale: n2.scale.x, targetPos: new THREE.Vector3(1.4, -0.8, -160), targetScale: 220 },
    { sp: n3, basePos: n3.position.clone(), baseScale: n3.scale.x, targetPos: new THREE.Vector3(0.2, 0.3, -165), targetScale: 250 },
  ];
  const nebulaBaseOpacities = [0.42, 0.36, 0.3];

  const redOverlay = new THREE.Sprite(new THREE.SpriteMaterial({
    map: redBreachTex(),
    depthWrite: false,
    depthTest: true,
    fog: false,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
  }));
  redOverlay.scale.set(1000, 750, 1);
  redOverlay.position.set(0, 0, -280);
  redOverlay.renderOrder = -15;
  bgGroup.add(redOverlay);

  const noise = new SimplexNoise();

  const COUNT = Math.round(3500 * renderScale);
  const R = 1.5;
  const inc = Math.PI * (3 - Math.sqrt(5));
  const off = 2 / COUNT;
  const sphereBase = new Float32Array(COUNT * 3);
  const matrixTarget = new Float32Array(COUNT * 3);
  const explodeDir = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const y = i * off - 1 + off / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * inc;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    sphereBase.set([x * R, y * R, z * R], i * 3);
  }

  const cols = 60;
  const rows = Math.ceil(COUNT / cols);
  let k = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols && k < COUNT; j++) {
      const x = (j - cols / 2) * 0.06;
      const y = (rows / 2 - i) * 0.06;
      const z = (Math.random() - 0.5) * 1.5;
      matrixTarget.set([x, y, z], k * 3);
      k++;
    }
  }

  for (let i = 0; i < COUNT; i++) {
    explodeDir.set([-(0.4 + Math.random() * 0.6), (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9], i * 3);
  }

  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const field = new THREE.Points(geom, new THREE.PointsMaterial({
    map: discTex(64, 0.9),
    size: 0.035,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  field.visible = false;
  if (!hideCoreParticles) scene.add(field);

  const ATT = Math.round(1200 * renderScale);
  const atkGeo = new THREE.BufferGeometry();
  const atkBase = new Float32Array(ATT * 3);
  const atkDir = new THREE.Float32BufferAttribute(new Float32Array(ATT * 3), 3);
  const atkDirArray = atkDir.array;
  const atkPos = new Float32Array(ATT * 3);
  const atkCol = new Float32Array(ATT * 3);
  const atkPhaseX = new Float32Array(ATT);
  const atkPhaseY = new Float32Array(ATT);
  const aOff = 2 / ATT;
  const aInc = Math.PI * (3 - Math.sqrt(5));
  const atkR = 0.6;
  for (let i = 0; i < ATT; i++) {
    const y = i * aOff - 1 + aOff / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * aInc;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    atkBase.set([x * atkR, y * atkR, z * atkR], i * 3);
    atkDir.setXYZ(i, -(0.6 + Math.random() * 1.2), (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6);
    atkPhaseX[i] = Math.random() * Math.PI * 2;
    atkPhaseY[i] = Math.random() * Math.PI * 2;
  }

  atkGeo.setAttribute("position", new THREE.BufferAttribute(atkPos, 3));
  atkGeo.setAttribute("color", new THREE.BufferAttribute(atkCol, 3));

  const attack = new THREE.Points(atkGeo, new THREE.PointsMaterial({
    map: discTex(64, 0.9),
    size: 0.038,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  attack.visible = false;
  if (!hideCoreParticles) scene.add(attack);

  const SH = Math.round(2500 * renderScale);
  const CR = Math.round(1600 * renderScale);
  const shieldGeo = new THREE.BufferGeometry();
  const coreGeo = new THREE.BufferGeometry();
  const shieldBase = new Float32Array(SH * 3);
  const shieldPos = new Float32Array(SH * 3);
  const shieldCol = new Float32Array(SH * 3);
  const coreBase = new Float32Array(CR * 3);
  const corePos = new Float32Array(CR * 3);
  const coreCol = new Float32Array(CR * 3);
  const shieldRad = 1.8;
  const coreRad = 0.75;

  for (let i = 0; i < SH; i++) {
    const y = i * (2 / SH) - 1 + 1 / SH;
    const r = Math.sqrt(1 - y * y);
    const phi = i * inc * 1.07;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    shieldBase.set([x * shieldRad, y * shieldRad, z * shieldRad], i * 3);
    const v = new THREE.Color("#8A2BE2");
    shieldCol.set([v.r, v.g, v.b], i * 3);
  }

  for (let i = 0; i < CR; i++) {
    const y = i * (2 / CR) - 1 + 1 / CR;
    const r = Math.sqrt(1 - y * y);
    const phi = i * inc * 0.97;
    const x = Math.cos(phi) * r;
    const z = Math.sin(phi) * r;
    coreBase.set([x * coreRad, y * coreRad, z * coreRad], i * 3);
    const v = new THREE.Color("#B89CFF");
    coreCol.set([v.r, v.g, v.b], i * 3);
  }

  shieldGeo.setAttribute("position", new THREE.BufferAttribute(shieldPos, 3));
  shieldGeo.setAttribute("color", new THREE.BufferAttribute(shieldCol, 3));
  coreGeo.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
  coreGeo.setAttribute("color", new THREE.BufferAttribute(coreCol, 3));

  const shieldPts = new THREE.Points(shieldGeo, new THREE.PointsMaterial({
    map: discTex(64, 0.92),
    size: 0.032,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  const corePts = new THREE.Points(coreGeo, new THREE.PointsMaterial({
    map: discTex(64, 0.92),
    size: 0.038,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  shieldPts.visible = false;
  corePts.visible = false;
  scene.add(shieldPts, corePts);

  const getScrollMax = () => {
    const viewportHeight = getSceneViewportHeight();
    return Math.max((narrativeSpacer?.offsetHeight || viewportHeight) - viewportHeight, 1);
  };
  let sTarget = 0;
  let s = 0;
  let lastScrollAt = performance.now();
  let lastWindowScrollY = window.scrollY;

  let bgPX = 0;
  let bgPY = 0;
  let faqBackdropTarget = 0;
  let faqBackdrop = 0;
  let postFaqMotionTarget = 0;
  let postFaqMotion = 0;
  let readinessSplitTarget = 0;
  let readinessSplit = 0;
  let featureNebulaSuppressTarget = 0;
  let featureNebulaSuppress = 0;

  const sectionViewportPresence = (element) => {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const viewportHeight = getSceneViewportHeight();
    const enter = clamp01((viewportHeight * 0.95 - rect.top) / (viewportHeight * 0.25));
    const exit = clamp01((rect.bottom - viewportHeight * 0.05) / (viewportHeight * 0.25));
    return enter * exit;
  };

  const updateScroll = () => {
    const now = performance.now();
    const currentY = window.scrollY;
    const deltaY = currentY - lastWindowScrollY;
    lastWindowScrollY = currentY;
    const scrollMax = getScrollMax();
    sTarget = Math.min(Math.max(currentY / scrollMax, 0), 1);
    lastScrollAt = now;
    const viewportHeight = getSceneViewportHeight();
    if (faqSection) {
      const faqRect = faqSection.getBoundingClientRect();
      faqBackdropTarget = clamp01((viewportHeight * 0.84 - faqRect.top) / (viewportHeight * 0.34));
    }
    if (faqSection && contactSection) {
      const motionStart = faqSection.offsetTop - viewportHeight * 0.18;
      const motionEnd = contactSection.offsetTop - viewportHeight * 0.44;
      postFaqMotionTarget = clamp01((currentY - motionStart) / Math.max(motionEnd - motionStart, 1));
    } else {
      postFaqMotionTarget = faqBackdropTarget;
    }
    if (readinessSection) {
      const readinessRect = readinessSection.getBoundingClientRect();
      const enterProgress = clamp01((viewportHeight * 0.9 - readinessRect.top) / (viewportHeight * 0.44));
      const exitProgress = clamp01((readinessRect.bottom - viewportHeight * 0.1) / Math.max(readinessRect.height * 0.8, 1));
      readinessSplitTarget = enterProgress * exitProgress;
    } else {
      readinessSplitTarget = 0;
    }
    featureNebulaSuppressTarget = Math.max(
      sectionViewportPresence(audienceSection),
      sectionViewportPresence(featureStage),
    );
    syncFeatureRailPosition();
  };

  updateScroll();
  syncFeatureRailPosition();
  window.addEventListener("scroll", updateScroll, { passive: true });

  const clock = new THREE.Clock();
  const lookTarget = new THREE.Vector3();
  const fieldCyan = new THREE.Color("#00e8ff");
  const fieldAmber = new THREE.Color("#ffffd9");
  const fieldRed = new THREE.Color("#ff4444");
  const attackViolet = new THREE.Color("#8A2BE2");
  const attackRed = new THREE.Color("#ff4444");
  let animationFrameId = 0;
  let cleanedUp = false;

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    if (formIsActive) {
      return;
    }

    const deltaScroll = sTarget - s;
    const scrollIdle = performance.now() - lastScrollAt > 70;
    if (window.innerWidth <= 1080) {
      // Mobile/tablet: lock the intro to its settled "what happens" frame
      // (centered camera + nebula) so it never shifts from a first frame.
      s = 1;
    } else if (scrollIdle || Math.abs(deltaScroll) < 0.00035) {
      s = sTarget;
    } else {
      const catchup = Math.min(0.42, 0.14 + Math.abs(deltaScroll) * 2.4);
      s += deltaScroll * catchup;
    }

    const morph = seg(s, 0.08, 0.36);
    const grow = seg(s, 0.38, 0.48);
    const travel = seg(s, 0.49, 0.58);
    const impact = seg(s, 0.58, 0.615);
    const depart = seg(s, 0.615, 0.62);
    const collapse = seg(s, 0.82, 0.87);
    const act1Opacity = 1 - collapse;

    const mSVal = smooth(morph);
    const camBlend = smooth(seg(s, 0.78, 0.86));
    const pathCamX = lerp(0, -3.2, mSVal);
    const pathCamY = lerp(0, -0.6, mSVal);
    const pathCamZ = lerp(4, 7, mSVal);
    const camX = lerp(pathCamX, 0, camBlend);
    const camY = lerp(pathCamY, 0, camBlend);
    const camZ = lerp(pathCamZ, 6.5, camBlend) * getMobileCameraPullback();
    const camLookX = lerp(-2, 0, camBlend);
    postFaqMotion += (postFaqMotionTarget - postFaqMotion) * 0.075;
    const lateOrbitPhase = postFaqMotion * Math.PI * 1.55;
    const lateCameraX = Math.sin(lateOrbitPhase) * 0.46 * faqBackdrop * animationIntensity;
    const lateCameraY = Math.cos(lateOrbitPhase * 0.82 + 0.4) * 0.2 * faqBackdrop * animationIntensity;
    const lateCameraZ = Math.sin(lateOrbitPhase * 0.56 + 0.52) * 0.22 * faqBackdrop * animationIntensity;
    const lateLookX = Math.sin(postFaqMotion * Math.PI * 0.9) * 0.24 * faqBackdrop * animationIntensity;
    camera.position.set(camX + lateCameraX, camY + lateCameraY, camZ + lateCameraZ);
    lookTarget.set(camLookX + lateLookX, 0, 0);
    camera.lookAt(lookTarget);

    const desiredPX = camera.position.x * 0.02;
    const desiredPY = camera.position.y * 0.02;
    bgPX += (desiredPX - bgPX) * 0.08;
    bgPY += (desiredPY - bgPY) * 0.08;
    const lateBgOrbitX = Math.cos(lateOrbitPhase * 0.92) * 3.25 * faqBackdrop * animationIntensity;
    const lateBgOrbitY = Math.sin(lateOrbitPhase * 0.72 + 0.34) * 1.68 * faqBackdrop * animationIntensity;
    bgGroup.position.set(bgPX + lateBgOrbitX, bgPY + lateBgOrbitY, 0);
    bgGroup.rotation.z = Math.sin(lateOrbitPhase * 0.66) * 0.07 * faqBackdrop * animationIntensity;
    bgGroup.rotation.y = Math.cos(lateOrbitPhase * 0.54) * 0.035 * faqBackdrop * animationIntensity;
    faqBackdrop += (faqBackdropTarget - faqBackdrop) * 0.08;
    featureNebulaSuppress += (featureNebulaSuppressTarget - featureNebulaSuppress) * 0.1;
    readinessSplit += (readinessSplitTarget - readinessSplit) * 0.07;
    if (postFaqNebula) {
      const splitEase = smooth(readinessSplit);
      postFaqNebula.style.opacity = `${faqBackdrop * (0.94 - splitEase * 0.08) * (1 - featureNebulaSuppress)}`;
      postFaqNebula.style.setProperty("--nebula-shift-x", `${Math.sin(lateOrbitPhase * 0.94) * 48 * faqBackdrop * animationIntensity}px`);
      postFaqNebula.style.setProperty("--nebula-shift-y", `${Math.cos(lateOrbitPhase * 0.76 + 0.62) * 28 * faqBackdrop * animationIntensity}px`);
      postFaqNebula.style.setProperty("--nebula-rotate", `${Math.sin(lateOrbitPhase * 0.58) * 7 * faqBackdrop * animationIntensity}deg`);
      postFaqNebula.style.setProperty("--nebula-scale", `${1 + faqBackdrop * 0.08 * animationIntensity + Math.sin(lateOrbitPhase * 0.48) * 0.025 * animationIntensity}`);
      postFaqNebula.style.setProperty("--nebula-split-progress", "0");
      postFaqNebula.style.setProperty("--nebula-core-opacity", `${1 - splitEase * 0.38}`);
      postFaqNebula.style.setProperty("--nebula-side-opacity", "1");
      postFaqNebula.style.setProperty("--nebula-split-x", "0px");
      postFaqNebula.style.setProperty("--nebula-split-y", "0px");
    }

    const tNeb = clock.getElapsedTime();
    stars.material.opacity = 0.9 + Math.sin(tNeb * 0.35) * 0.02;

    const starPosition = stars.geometry.attributes.position;
    for (let i = 0; i < starsN; i++) {
      const bx = sBase[i * 3];
      const by = sBase[i * 3 + 1];
      const bz = sBase[i * 3 + 2];
      const ph = sPhase[i] + tNeb * (STAR_SPEED * sSpeed[i]);
      const ox = starNoise.noise3D(bx * 0.02, by * 0.02, ph) * STAR_AMP;
      const oy = starNoise.noise3D(by * 0.02, bz * 0.02, ph + 10.123) * STAR_AMP;
      const oz = starNoise.noise3D(bz * 0.02, bx * 0.02, ph + 21.456) * STAR_AMP;
      starPosition.setXYZ(i, bx + ox, by + oy, bz + oz);
    }
    starPosition.needsUpdate = true;

    const nebShift = smooth(seg(s, 0.72, 0.9));
    const nebWeight = Math.max(nebShift, camBlend * 0.85);
    const readinessNebulaFade = smooth(readinessSplit);
    const desktopHeroNebula = window.innerWidth > 900 ? Math.max(0, 1 - smooth(seg(s, 0.22, 0.56))) : 0;
    nebulas.forEach(({ sp, basePos, baseScale, targetPos, targetScale }, idx) => {
      sp.position.x = lerp(basePos.x, targetPos.x, nebWeight);
      sp.position.y = lerp(basePos.y, targetPos.y, nebWeight);
      sp.position.z = lerp(basePos.z, targetPos.z, nebWeight);
      const baseScaled = lerp(baseScale, targetScale, nebWeight);
      const overscanScale = getMobileNebulaOverscan();
      const scl = (idx === 2 ? baseScaled * (1 - readinessNebulaFade * 0.1) : baseScaled) * overscanScale;
      sp.scale.setScalar(scl);
      const nebulaFadeStrength = idx === 2 ? 1.85 : 1.42;
      const faqFade = nebulaBaseOpacities[idx] * Math.max(0, 1 - faqBackdrop * nebulaFadeStrength);
      const readinessFadeStrength = idx === 2 ? 0.88 : 0.18;
      const animatedOpacity =
        faqFade * Math.max(0, 1 - readinessNebulaFade * readinessFadeStrength) * Math.max(0, 1 - featureNebulaSuppress);
      const desktopHeroOpacity = nebulaBaseOpacities[idx] * desktopHeroNebula;
      sp.material.opacity = Math.max(animatedOpacity, desktopHeroOpacity);
      const wob = 0.0015 + nebWeight * 0.0015;
      sp.position.x += Math.sin((tNeb + idx) * 0.6) * wob;
      sp.position.y += Math.cos((tNeb + idx) * 0.5) * wob;
    });

    const t = clock.getElapsedTime();
    const mS = smooth(morph);
    const mobileParticleScale = getMobileParticleScale();
    field.material.size = 0.035 * mobileParticleScale;
    attack.material.size = 0.038 * Math.max(0.9, mobileParticleScale);
    if (!hideCoreParticles && act1Opacity > 0.002) {
      field.visible = true;
      const amp = 0.14 * (1 - morph) * animationIntensity;
      const spread = 2.6;
      const scale = (1 + grow * mS * 1.6) * lerp(1, getMobileMatrixScale(), mS);
      const pAttr = geom.attributes.position;
      const cAttr = geom.attributes.color;

      for (let i = 0; i < COUNT; i++) {
        const bx = sphereBase[i * 3];
        const by = sphereBase[i * 3 + 1];
        const bz = sphereBase[i * 3 + 2];
        const len = Math.hypot(bx, by, bz) || 1;
        const ux = bx / len;
        const uy = by / len;
        const uz = bz / len;
        const n = noise.noise3D(ux + t * 0.4, uy + t * 0.4, uz + t * 0.4);
        const r = R + n * amp;
        let x = ux * r;
        let y = uy * r;
        let z = uz * r;
        const mx = matrixTarget[i * 3];
        const my = matrixTarget[i * 3 + 1];
        const mz = matrixTarget[i * 3 + 2];
        x = mix(x, mx, mS);
        y = mix(y, my, mS);
        z = mix(z, mz, mS);
        x *= scale;
        y *= scale;
        z *= scale;
        if (impact > 0) {
          x += explodeDir[i * 3] * impact * spread;
          y += explodeDir[i * 3 + 1] * impact * spread;
          z += explodeDir[i * 3 + 2] * impact * spread;
        }
        pAttr.setXYZ(i, x, y, z);

        const wave = Math.sin(ux * 1.3 + uz * 1.7 + t * 1.8);
        const b = (wave + 1) / 2;
        const baseR = mix(fieldCyan.r, fieldAmber.r, b);
        const baseG = mix(fieldCyan.g, fieldAmber.g, b);
        const baseB = mix(fieldCyan.b, fieldAmber.b, b);
        cAttr.setXYZ(i, mix(baseR, fieldRed.r, impact), mix(baseG, fieldRed.g, impact), mix(baseB, fieldRed.b, impact));
      }
      pAttr.needsUpdate = true;
      cAttr.needsUpdate = true;
      field.material.opacity = 0.92 * act1Opacity;
    } else {
      field.visible = false;
      field.material.opacity = 0;
    }

    const heroOut = seg(s, 0.1, 0.28);
    const matrixIn = seg(s, 0.24, 0.4);
    const matrixExit = smooth(seg(s, 0.5, 0.58));
    const matrixOut = 1 - matrixExit;
    setNarrativeLayer(heroText, (1 - heroOut) * act1Opacity);
    setNarrativeLayer(
      matrixText,
      matrixIn * matrixOut * act1Opacity,
      `translateX(${-42 * matrixExit}px) translateY(${(1 - matrixIn) * 12 - 8 * matrixExit}px) translateY(-50%)`,
    );
    const breachIn = smooth(seg(s, 0.605, 0.665));
    const breachOut = smooth(seg(s, 0.7, 0.755));
    const breachOpacity = breachIn * (1 - breachOut);
    setNarrativeLayer(
      breachText,
      breachOpacity * act1Opacity,
      `translateX(-50%) translateY(${24 * (1 - breachIn) - 18 * breachOut}px) scale(${0.96 + breachIn * 0.04})`,
    );
    const finalIn = smooth(seg(s, 0.745, 0.79));
    const finalOut = smooth(seg(s, 0.83, 0.875));
    const finalOpacity = finalIn * (1 - finalOut);
    setNarrativeLayer(
      finalText,
      finalOpacity * act1Opacity,
      `translateX(-50%) translateY(${18 * (1 - finalIn) - 16 * finalOut}px) scale(${0.94 + finalIn * 0.06})`,
    );

    const matrixReady = mS > 0.92;
    if (safariHeroNebula) {
      const safariNebulaFade = 1 - smooth(seg(s, 0.22, 0.46));
      const safariNebulaOpacity = isSafari ? safariNebulaFade * act1Opacity * 0.82 : 0;
      safariHeroNebula.style.opacity = `${safariNebulaOpacity}`;
      safariHeroNebula.style.visibility = safariNebulaOpacity > 0.01 ? "visible" : "hidden";
      safariHeroNebula.style.transform = `translate3d(${26 + bgPX * 10}px, ${-12 + bgPY * 10}px, 0) scale(${1.02 + safariNebulaOpacity * 0.04})`;
    }

    const atkPosAttr = atkGeo.attributes.position;
    const atkColAttr = atkGeo.attributes.color;
    if (hideCoreParticles || act1Opacity <= 0.002 || (!matrixReady && travel === 0 && impact === 0 && depart === 0)) {
      attack.visible = false;
    } else {
      attack.visible = true;
      const trS = smooth(travel);
      const centerX = lerp(getMobileAttackStartX(), -0.2, trS) - depart * 6.0;
      const centerZ = lerp(-6, -0.2, trS);
      const toRed = Math.max(0, Math.min(1, (travel - 0.88) / 0.12)) || impact;
      const atkRValue = mix(attackViolet.r, attackRed.r, toRed);
      const atkGValue = mix(attackViolet.g, attackRed.g, toRed);
      const atkBValue = mix(attackViolet.b, attackRed.b, toRed);
      const jitterAmp = (0.06 + impact * 0.12) * animationIntensity;
      const jitterFreq = 8.0;
      const time = clock.getElapsedTime();
      for (let i = 0; i < ATT; i++) {
        const bx = atkBase[i * 3];
        const by = atkBase[i * 3 + 1];
        const bz = atkBase[i * 3 + 2];
        const burst = impact;
        const dirIdx = i * 3;
        const dx = atkDirArray[dirIdx] * burst * 2.2;
        const dy = atkDirArray[dirIdx + 1] * burst * 2.2;
        const dz = atkDirArray[dirIdx + 2] * burst * 2.2;
        const jx = Math.sin(time * jitterFreq + atkPhaseX[i]) * jitterAmp;
        const jy = Math.cos(time * jitterFreq + atkPhaseY[i]) * jitterAmp;
        atkPosAttr.setXYZ(i, centerX + bx + dx + jx, by + dy + jy, centerZ + bz + dz + jx * 0.45);
        atkColAttr.setXYZ(i, atkRValue, atkGValue, atkBValue);
      }
      atkPosAttr.needsUpdate = true;
      atkColAttr.needsUpdate = true;
      attack.material.opacity = (matrixReady ? 0.95 : 0.0) * act1Opacity * (1 - depart);
    }

    let redPower = Math.min(1, impact * 0.65 + collapse * 0.12);
    redPower *= 1 - seg(s, 0.8, 0.87);
    redOverlay.material.opacity = redPower * 0.45;

    const protectIn = seg(s, 0.86, 0.95);
    const protectSet = smooth(protectIn);
    const protectExit = smooth(seg(s, 0.972, 0.998));
    const protectionVisible = protectSet > 0.01 && protectExit < 0.995;
    shieldPts.visible = protectionVisible;
    corePts.visible = protectionVisible;

    if (protectionVisible) {
      const shieldScale = 0.85 + protectSet * 0.25;
      for (let i = 0; i < SH; i++) {
        const idx = i * 3;
        shieldPos[idx] = shieldBase[idx] * shieldScale;
        shieldPos[idx + 1] = shieldBase[idx + 1] * shieldScale;
        shieldPos[idx + 2] = shieldBase[idx + 2] * shieldScale;
      }
      const coreScale = 0.85 + protectSet * 0.3;
      for (let i = 0; i < CR; i++) {
        const idx = i * 3;
        corePos[idx] = coreBase[idx] * coreScale;
        corePos[idx + 1] = coreBase[idx + 1] * coreScale;
        corePos[idx + 2] = coreBase[idx + 2] * coreScale;
      }
      shieldGeo.attributes.position.needsUpdate = true;
      coreGeo.attributes.position.needsUpdate = true;
      shieldPts.material.opacity = protectSet * 0.95 * (1 - protectExit);
      corePts.material.opacity = protectSet * 0.95 * (1 - protectExit * 0.92);
    } else {
      shieldPts.material.opacity = 0;
      corePts.material.opacity = 0;
    }

    if (protectionVisible) {
      shieldPts.rotation.y += 0.00038 * animationIntensity;
      shieldPts.rotation.x += 0.00013 * animationIntensity;
      corePts.rotation.y -= 0.00054 * animationIntensity;
      corePts.rotation.x += 0.0002 * animationIntensity;
    }

    const preventExit = smooth(seg(s, 0.972, 0.997));
    const preventFade = seg(s, 0.86, 0.925) * (1 - preventExit);
    const preventExitLift = preventExit;
    setNarrativeLayer(preventText, preventFade, `translateX(-50%) translateY(${-18 * preventExitLift}px)`);

    const servicesReveal = smooth(seg(s, 0.89, 0.94));
    const servicesExit = smooth(seg(s, 0.978, 0.998));
    const servicesOpacity = servicesReveal * (1 - servicesExit);
    if (servicesRow) {
      servicesRow.style.opacity = servicesOpacity;
      servicesRow.style.visibility = servicesOpacity > 0.01 ? "visible" : "hidden";
      servicesRow.style.pointerEvents = servicesOpacity > 0.18 ? "auto" : "none";
      servicesRow.style.transform = `translateX(-50%) translateY(${(1 - servicesReveal) * 14 + servicesExit * 26}px)`;
    }

    const stagger = 0.1;
    cards.forEach((el, i) => {
      const start = i * stagger;
      const p = clamp01((servicesReveal - start) / (1 - start));
      const e = smooth(p) * (1 - servicesExit);
      el.style.setProperty("--p", e.toFixed(3));
    });

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  let lastRenderWidth = 0;
  let lastRenderHeight = 0;
  let lastPixelRatio = 0;
  let resizeFrame = 0;
  let pageVisible = !document.hidden;

  const applyResize = () => {
    const width = getSceneViewportWidth();
    const height = getSceneViewportHeight();
    const pixelRatio = getRendererPixelRatio();
    if (width === lastRenderWidth && height === lastRenderHeight && pixelRatio === lastPixelRatio) {
      syncFeatureRailPosition();
      return;
    }
    lastRenderWidth = width;
    lastRenderHeight = height;
    lastPixelRatio = pixelRatio;
    renderer.setPixelRatio(pixelRatio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer?.setSize(width, height);
    syncFeatureRailPosition();
  };

  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      applyResize();
    });
  };

  applyResize();
  window.addEventListener("resize", onResize);

  const startAnimation = () => {
    if (animationFrameId || cleanedUp || !pageVisible) return;
    animationFrameId = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (!animationFrameId) return;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  };

  const handleVisibilityChange = () => {
    pageVisible = !document.hidden;
    if (pageVisible) {
      clock.getDelta();
      startAnimation();
    } else {
      stopAnimation();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  startAnimation();

  const disposeMaterial = (material) => {
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((mat) => {
      if (!mat) return;
      Object.values(mat).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      mat.dispose?.();
    });
  };

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    stopAnimation();
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }
    window.removeEventListener("scroll", onScrollNav);
    window.removeEventListener("scroll", updateScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    root.removeEventListener("focusin", handleFormFocusIn);
    root.removeEventListener("focusout", handleFormFocusOut);
    window.clearTimeout(formInteractionTimeout);
    featureObserver?.disconnect();
    sceneMount.dataset.ready = "false";
    scene.traverse((object) => {
      object.geometry?.dispose?.();
      if (object.material) {
        disposeMaterial(object.material);
      }
    });
    renderPass?.dispose?.();
    bloomPass?.dispose?.();
    composer?.dispose?.();
    renderer.renderLists?.dispose?.();
    renderer.dispose();
    if (renderer.domElement.parentNode === sceneMount) {
      sceneMount.removeChild(renderer.domElement);
    }
  };

  return cleanup;
}
