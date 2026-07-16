const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const currentYear = document.querySelector("#current-year");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleText = document.querySelector("#theme-toggle-text");
const heroSection = document.querySelector(".hero");
const heroVisual = document.querySelector(".hero-visual");
const heroPortraitShell = document.querySelector("#hero-portrait-shell");
const homeMinimalCopy = document.querySelector(".minimal-copy");
const themeKey = "portfolio-theme";
const defaultTheme = "editorial";
const supportedThemes = new Set(["editorial", "minimal"]);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsFinePointer = window.matchMedia("(pointer: fine)");
const supportsDesktopLayout = window.matchMedia("(min-width: 961px)");
const revealTargets = document.querySelectorAll("main .hero, main .page-hero, main .section-card, main .skill-groups > .skill-group, main .project-grid > .project-card");
const motionCards = document.querySelectorAll(".project-card, .feature-card, .skill-group, .contact-card");
const motionScenes = document.querySelectorAll(".motion-scene");
const isHomePage = document.body.classList.contains("home-page");
let starfieldController = null;

const defaultMotionEnabled = !prefersReducedMotion.matches;

const applyTheme = (themeName) => {
  document.documentElement.setAttribute("data-theme", themeName);
};

const syncThemeToggleLabel = (themeName) => {
  if (!themeToggle) {
    return;
  }
  const isDark = themeName === "editorial";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
  if (themeToggleText) {
    themeToggleText.textContent = label;
  }
};

const applyMotionPreference = (enabled) => {
  document.documentElement.setAttribute("data-motion", enabled ? "on" : "off");
  if (starfieldController) {
    const allowAnimation = enabled && !prefersReducedMotion.matches;
    starfieldController.setEnabled(allowAnimation);
  }

  if (!enabled) {
    revealTargets.forEach((target) => target.classList.add("visible"));
  }
};

const createStarfield = () => {
  const canvas = document.createElement("canvas");
  canvas.className = "starfield-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let links = [];
  let packets = [];
  let running = false;
  let frameId = 0;
  let tick = 0;
  let enabledState = false;
  let intensity = 0.92;
  let pointerParallaxTargetX = 0;
  let pointerParallaxTargetY = 0;
  let pointerParallaxX = 0;
  let pointerParallaxY = 0;
  const pointerParallaxLimit = 14;
  const clamp = (value, minValue, maxValue) => {
    return Math.min(maxValue, Math.max(minValue, value));
  };

  const getPalette = () => {
    const isLightTheme = document.documentElement.getAttribute("data-theme") === "minimal";
    if (isLightTheme) {
      return {
        linkRgb: "58, 130, 208",
        flowRgb: "37, 99, 235",
        nodeRgb: "20, 48, 94",
        nodeGlowRgb: "56, 149, 255",
        packetRgb: "29, 78, 216",
      };
    }
    return {
      linkRgb: "126, 177, 255",
      flowRgb: "106, 188, 255",
      nodeRgb: "232, 246, 255",
      nodeGlowRgb: "124, 186, 255",
      packetRgb: "192, 231, 255",
    };
  };

  const getNodePosition = (node, frameTick) => {
    const wave = frameTick * node.driftSpeed;
    return {
      x: node.x + (Math.sin(wave + node.driftPhaseX) * node.driftX),
      y: node.y + (Math.cos(wave + node.driftPhaseY) * node.driftY),
    };
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const columns = clamp(Math.floor(width / 120), 9, 16);
    const rows = clamp(Math.floor(height / 105), 7, 12);
    const xSpanStart = width * -0.02;
    const xSpanEnd = width * 1.02;
    const ySpanStart = height * -0.02;
    const ySpanEnd = height * 1.02;
    const xStep = (xSpanEnd - xSpanStart) / Math.max(columns - 1, 1);
    const yStep = (ySpanEnd - ySpanStart) / Math.max(rows - 1, 1);

    nodes = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        nodes.push({
          x: xSpanStart + (col * xStep) + ((Math.random() - 0.5) * xStep * 0.36),
          y: ySpanStart + (row * yStep) + ((Math.random() - 0.5) * yStep * 0.42),
          baseSize: Math.random() * 1.4 + 1.2,
          pulseSpeed: Math.random() * 0.06 + 0.02,
          pulsePhase: Math.random() * Math.PI * 2,
          driftX: Math.random() * 6 + 2,
          driftY: Math.random() * 6 + 2,
          driftSpeed: Math.random() * 0.02 + 0.006,
          driftPhaseX: Math.random() * Math.PI * 2,
          driftPhaseY: Math.random() * Math.PI * 2,
        });
      }
    }

    links = [];
    const pushLink = (fromIndex, toIndex) => {
      if (toIndex < 0 || toIndex >= nodes.length) {
        return;
      }
      links.push({
        from: fromIndex,
        to: toIndex,
        alpha: Math.random() * 0.2 + 0.14,
      });
    };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const index = (row * columns) + col;
        if (col < columns - 1) {
          pushLink(index, index + 1);
        }
        if (row < rows - 1 && Math.random() < 0.96) {
          pushLink(index, index + columns);
        }
        if (col < columns - 1 && row < rows - 1 && Math.random() < 0.62) {
          pushLink(index, index + columns + 1);
        }
        if (col > 0 && row < rows - 1 && Math.random() < 0.48) {
          pushLink(index, index + columns - 1);
        }
        if (col < columns - 2 && Math.random() < 0.38) {
          pushLink(index, index + 2);
        }
        if (row < rows - 2 && Math.random() < 0.34) {
          pushLink(index, index + (columns * 2));
        }
      }
    }

    const packetCount = clamp(Math.floor(links.length * 1.3), 90, 320);
    packets = [];
    for (let i = 0; i < packetCount; i += 1) {
      packets.push({
        linkIndex: Math.floor(Math.random() * links.length),
        t: Math.random(),
        speed: Math.random() * 0.004 + 0.0018,
        size: Math.random() * 1.6 + 1,
        alpha: Math.random() * 0.35 + 0.5,
      });
    }
  };

  const drawFrame = () => {
    context.clearRect(0, 0, width, height);
    tick += 1;
    pointerParallaxX += (pointerParallaxTargetX - pointerParallaxX) * 0.08;
    pointerParallaxY += (pointerParallaxTargetY - pointerParallaxY) * 0.08;
    const palette = getPalette();

    const positions = nodes.map((node) => getNodePosition(node, tick));

    links.forEach((link) => {
      const from = positions[link.from];
      const to = positions[link.to];
      if (!from || !to) {
        return;
      }
      context.beginPath();
      context.moveTo(from.x + pointerParallaxX, from.y + pointerParallaxY);
      context.lineTo(to.x + pointerParallaxX, to.y + pointerParallaxY);
      context.strokeStyle = "rgba(" + palette.linkRgb + ", 0.23)";
      context.lineWidth = 1;
      context.stroke();

      context.setLineDash([10, 20]);
      context.lineDashOffset = -(tick * 0.34);
      context.strokeStyle = "rgba(" + palette.flowRgb + ", 0.44)";
      context.lineWidth = 0.9;
      context.stroke();
      context.setLineDash([]);
    });

    packets.forEach((packet) => {
      const link = links[packet.linkIndex];
      if (!link) {
        return;
      }
      const from = positions[link.from];
      const to = positions[link.to];
      if (!from || !to) {
        return;
      }

      packet.t += packet.speed;
      if (packet.t > 1) {
        packet.t -= 1;
        packet.linkIndex = Math.floor(Math.random() * links.length);
      }

      const x = from.x + ((to.x - from.x) * packet.t) + pointerParallaxX;
      const y = from.y + ((to.y - from.y) * packet.t) + pointerParallaxY;

      context.beginPath();
      context.arc(x, y, packet.size * 2.8, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + palette.flowRgb + ", " + (packet.alpha * 0.25) + ")";
      context.fill();

      context.beginPath();
      context.arc(x, y, packet.size, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + palette.packetRgb + ", " + packet.alpha + ")";
      context.fill();
    });

    nodes.forEach((node, index) => {
      const point = positions[index];
      if (!point) {
        return;
      }
      const pulse = 0.5 + (0.5 * Math.sin((tick * node.pulseSpeed) + node.pulsePhase));
      const radius = node.baseSize + (pulse * 1.25);

      context.beginPath();
      context.arc(point.x + pointerParallaxX, point.y + pointerParallaxY, radius * 3.2, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + palette.nodeGlowRgb + ", " + (0.14 + (pulse * 0.16)) + ")";
      context.fill();

      context.beginPath();
      context.arc(point.x + pointerParallaxX, point.y + pointerParallaxY, radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + palette.nodeRgb + ", " + (0.62 + (pulse * 0.26)) + ")";
      context.fill();
    });

    if (running) {
      frameId = window.requestAnimationFrame(drawFrame);
    }
  };

  const setEnabled = (enabled) => {
    enabledState = enabled;
    canvas.style.opacity = enabled ? String(intensity) : "0";
    if (enabled && !running) {
      running = true;
      drawFrame();
      return;
    }
    if (!enabled && running) {
      resetPointerParallax();
      pointerParallaxX = 0;
      pointerParallaxY = 0;
      running = false;
      window.cancelAnimationFrame(frameId);
      context.clearRect(0, 0, width, height);
    }
  };

  const setIntensity = (nextValue) => {
    intensity = Math.max(0, Math.min(0.95, nextValue));
    if (enabledState) {
      canvas.style.opacity = String(intensity);
    }
  };

  const setPointerPosition = (clientX, clientY) => {
    if (!width || !height) {
      return;
    }
    const offsetX = ((clientX - (width / 2)) / width) * 2;
    const offsetY = ((clientY - (height / 2)) / height) * 2;
    pointerParallaxTargetX = offsetX * pointerParallaxLimit;
    pointerParallaxTargetY = offsetY * pointerParallaxLimit * -1;
  };

  const resetPointerParallax = () => {
    pointerParallaxTargetX = 0;
    pointerParallaxTargetY = 0;
  };

  resize();
  return {
    resize,
    setEnabled,
    setIntensity,
    setPointerPosition,
    resetPointerParallax,
  };
};

const resetProfileMorph = () => {
  if (heroPortraitShell) {
    heroPortraitShell.style.transform = "";
    heroPortraitShell.style.opacity = "";
  }
  if (homeMinimalCopy) {
    homeMinimalCopy.style.transform = "";
    homeMinimalCopy.style.opacity = "";
  }
  document.body.classList.remove("profile-morph-active");
};

const getValidTheme = (themeName) => {
  if (supportedThemes.has(themeName)) {
    return themeName;
  }
  return defaultTheme;
};

const savedTheme = getValidTheme(localStorage.getItem(themeKey) || defaultTheme);
const savedMotionEnabled = defaultMotionEnabled;

applyTheme(savedTheme);
syncThemeToggleLabel(savedTheme);
starfieldController = createStarfield();
applyMotionPreference(savedMotionEnabled);

if (starfieldController) {
  window.addEventListener("resize", () => {
    starfieldController.resize();
  });

  if (isHomePage && heroSection) {
    heroSection.addEventListener("pointermove", (event) => {
      const motionEnabled = document.documentElement.getAttribute("data-motion") === "on";
      if (!motionEnabled || !supportsFinePointer.matches || prefersReducedMotion.matches) {
        return;
      }
      starfieldController.setPointerPosition(event.clientX, event.clientY);
    });

    heroSection.addEventListener("pointerleave", () => {
      starfieldController.resetPointerParallax();
    });
  }
}

if (prefersReducedMotion.addEventListener) {
  prefersReducedMotion.addEventListener("change", () => {
    const motionEnabled = document.documentElement.getAttribute("data-motion") === "on";
    if (starfieldController) {
      starfieldController.setEnabled(motionEnabled && !prefersReducedMotion.matches);
    }
    requestProfileMorphUpdate();
  });
}

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = getValidTheme(document.documentElement.getAttribute("data-theme") || defaultTheme);
    const nextTheme = currentTheme === "editorial" ? "minimal" : "editorial";
    applyTheme(nextTheme);
    syncThemeToggleLabel(nextTheme);
    localStorage.setItem(themeKey, nextTheme);
  });
}

let profileMorphTicking = false;

const updateProfileMorph = () => {
  if (!isHomePage || !heroSection || !heroVisual || !heroPortraitShell) {
    return;
  }

  const motionEnabled = document.documentElement.getAttribute("data-motion") === "on";
  const allowMorph = motionEnabled && !prefersReducedMotion.matches && supportsDesktopLayout.matches;
  if (!allowMorph) {
    resetProfileMorph();
    return;
  }

  const heroRect = heroSection.getBoundingClientRect();
  const visualRect = heroVisual.getBoundingClientRect();
  const travel = Math.max(heroRect.height * 0.9, 1);
  const rawProgress = (120 - heroRect.top) / travel;
  const progress = Math.min(Math.max(rawProgress, 0), 1);

  const shellWidth = heroPortraitShell.offsetWidth;
  const shellHeight = heroPortraitShell.offsetHeight;
  const startX = visualRect.left + Math.max((visualRect.width - shellWidth) / 2, 0);
  const startY = visualRect.top + Math.max((visualRect.height - shellHeight) / 2, 0);
  const targetX = 18;
  const targetY = 106;

  const translateX = (targetX - startX) * progress;
  const translateY = (targetY - startY) * progress;
  const scale = 1 - (0.56 * progress);
  const opacity = 1 - (0.94 * progress);

  heroPortraitShell.style.transform = "translate3d(" + translateX + "px, " + translateY + "px, 0) scale(" + scale + ")";
  heroPortraitShell.style.opacity = String(Math.max(opacity, 0));

  if (homeMinimalCopy) {
    homeMinimalCopy.style.transform = "";
    homeMinimalCopy.style.opacity = "";
  }

  const showNavbarIdentity = progress > 0.35;
  document.body.classList.toggle("profile-morph-active", showNavbarIdentity);
};

const requestProfileMorphUpdate = () => {
  if (profileMorphTicking) {
    return;
  }
  profileMorphTicking = true;
  window.requestAnimationFrame(() => {
    updateProfileMorph();
    profileMorphTicking = false;
  });
};

const updateStarfieldByScroll = () => {
  if (!starfieldController || !isHomePage || !heroSection) {
    return;
  }
  const heroRect = heroSection.getBoundingClientRect();
  const progressRaw = (0 - heroRect.top) / Math.max(heroRect.height * 0.9, 1);
  const progress = Math.min(Math.max(progressRaw, 0), 1);
  document.documentElement.style.setProperty("--section-overlay-strength", String(progress));
  document.body.classList.toggle("professional-view", progress > 0.55);

  const motionEnabled = document.documentElement.getAttribute("data-motion") === "on";
  if (!motionEnabled || prefersReducedMotion.matches) {
    starfieldController.setIntensity(0);
    return;
  }
  const targetOpacity = 0.92 - (0.9 * progress);
  starfieldController.setIntensity(targetOpacity);
};

if (isHomePage) {
  window.addEventListener("scroll", () => {
    requestProfileMorphUpdate();
    updateStarfieldByScroll();
  }, { passive: true });
  window.addEventListener("resize", () => {
    requestProfileMorphUpdate();
    updateStarfieldByScroll();
  });
  requestProfileMorphUpdate();
  updateStarfieldByScroll();
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: "0px 0px -40px 0px",
  });

  revealTargets.forEach((target) => {
    target.classList.add("reveal-on-scroll");
    if (savedMotionEnabled) {
      revealObserver.observe(target);
    } else {
      target.classList.add("visible");
    }
  });
} else {
  revealTargets.forEach((target) => {
    target.classList.add("reveal-on-scroll", "visible");
  });
}

motionScenes.forEach((scene) => {
  const layers = scene.querySelectorAll(".motion-layer");

  scene.addEventListener("pointermove", (event) => {
    const motionEnabled = document.documentElement.getAttribute("data-motion") === "on";
    if (!motionEnabled || !supportsFinePointer.matches) {
      return;
    }

    const rect = scene.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    const offsetX = (event.clientX - centerX) / rect.width;
    const offsetY = (event.clientY - centerY) / rect.height;

    layers.forEach((layer) => {
      let depth = 10;
      if (layer.classList.contains("layer-top")) {
        depth = 30;
      } else if (layer.classList.contains("layer-mid")) {
        depth = 18;
      }

      const translateX = offsetX * depth;
      const translateY = offsetY * depth * -1;
      const rotateY = offsetX * 10;
      const rotateX = offsetY * -8;
      layer.style.transform = "translate3d(" + translateX + "px, " + translateY + "px, 0) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
    });
  });

  scene.addEventListener("pointerleave", () => {
    layers.forEach((layer) => {
      layer.style.transform = "";
    });
  });
});

motionCards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const motionEnabled = document.documentElement.getAttribute("data-motion") === "on";
    if (!motionEnabled || !supportsFinePointer.matches) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width;
    const offsetY = (event.clientY - rect.top) / rect.height;
    const rotateY = (offsetX - 0.5) * 10;
    const rotateX = (0.5 - offsetY) * 8;

    card.style.transform = "perspective(1000px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-6px)";
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("open");
  });
}
