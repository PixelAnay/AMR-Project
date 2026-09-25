import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');
const header = document.querySelector('.site-header');

menu?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.primary-nav a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  });
});

const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 10);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach(element => element.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealElements.forEach(element => observer.observe(element));
}

const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach(other => {
      if (other !== item) other.open = false;
    });
  });
});

function createRoverScene() {
  const stage = document.querySelector('#rover-stage');
  if (!stage) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.35, 60);
  camera.position.set(7.6, 4.8, 8.7);
  camera.lookAt(0, 0.64, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Interactive 3D AMR model. Drag to orbit, use arrow keys to rotate, and space to pause.');

  // A neutral generated environment gives painted metal soft, realistic reflections
  // without loading an external HDR asset.
  const environmentScene = new THREE.Scene();
  environmentScene.background = new THREE.Color(0xe9efec);
  const environmentPanels = [
    [[0, 5, -5], [10, 5, .1], 0xffffff],
    [[-5, 2, 0], [.1, 6, 10], 0xc7ddd8],
    [[5, 1, 0], [.1, 4, 10], 0xf5dfcf],
    [[0, -2, 0], [10, .1, 10], 0x9eaaa6]
  ];
  environmentPanels.forEach(([position, size, color]) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color }));
    panel.position.set(...position);
    environmentScene.add(panel);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environmentScene, 0.08).texture;
  pmrem.dispose();

  const materials = {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xdde3df, roughness: .47, metalness: .16, clearcoat: .18, clearcoatRoughness: .58 }),
    paintDark: new THREE.MeshPhysicalMaterial({ color: 0x20343a, roughness: .42, metalness: .38, clearcoat: .1, clearcoatRoughness: .65 }),
    aluminum: new THREE.MeshStandardMaterial({ color: 0x69787a, roughness: .34, metalness: .82 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x35464a, roughness: .29, metalness: .76 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x12191b, roughness: .91, metalness: 0 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x263235, roughness: .84, metalness: .02 }),
    accent: new THREE.MeshPhysicalMaterial({ color: 0x087b78, roughness: .39, metalness: .32, clearcoat: .12, clearcoatRoughness: .5 }),
    optical: new THREE.MeshPhysicalMaterial({ color: 0x183f47, roughness: .12, metalness: .46, clearcoat: .75, clearcoatRoughness: .12 }),
    lidarWindow: new THREE.MeshPhysicalMaterial({ color: 0x13272c, roughness: .18, metalness: .28, clearcoat: .62, clearcoatRoughness: .16 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc93e31, roughness: .38, metalness: .1, emissive: 0x5e120d, emissiveIntensity: .25 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xe28a27, roughness: .32, metalness: .08, emissive: 0x653000, emissiveIntensity: .35 }),
    status: new THREE.MeshStandardMaterial({ color: 0x84d9c9, roughness: .28, emissive: 0x2b9c89, emissiveIntensity: .65 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb87038, roughness: .3, metalness: .83 })
  };

  const rover = new THREE.Group();
  const body = new THREE.Group();
  rover.add(body);
  scene.add(rover);
  const wheels = [];
  let lidarRotor;

  const finishMesh = (mesh, target = body) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  };

  const box = (size, material, position, target = body) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    return finishMesh(mesh, target);
  };

  const cylinder = (radiusTop, radiusBottom, height, material, position, target = body, segments = 32) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.position.set(...position);
    return finishMesh(mesh, target);
  };

  const roundedPrism = (width, height, depth, radius, material, position, target = body) => {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -depth / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + depth - radius);
    shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
    shape.lineTo(x + radius, y + depth);
    shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: Math.min(.035, height * .15),
      bevelThickness: Math.min(.035, height * .15),
      curveSegments: 8
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    return finishMesh(mesh, target);
  };

  // Realistic low-profile AMR proportions: impact skirt, structural frame, body shell and lift deck.
  roundedPrism(3.2, .17, 2.18, .25, materials.rubber, [0, .37, 0]);
  roundedPrism(3.06, .38, 1.96, .18, materials.paintDark, [0, .61, 0]);
  roundedPrism(2.88, .43, 1.76, .17, materials.paint, [0, 1.01, 0]);
  roundedPrism(2.52, .13, 1.45, .11, materials.aluminum, [0, 1.31, 0]);
  roundedPrism(2.34, .055, 1.3, .07, materials.rubber, [0, 1.405, 0]);

  // Raised locating rails and flush deck fasteners.
  [-1.01, 1.01].forEach(x => roundedPrism(.075, .1, 1.27, .025, materials.steel, [x, 1.48, 0]));
  [-.78, .78].forEach(x => [-.47, .47].forEach(z => cylinder(.043, .043, .025, materials.steel, [x, 1.478, z], body, 16)));

  // Recessed service panels use deliberate 0.04-unit clearances to avoid coplanar flicker.
  box([.024, .3, .82], materials.paintDark, [1.492, 1.0, -.08]);
  box([.024, .22, .62], materials.paintDark, [-1.492, .99, .12]);
  [-.28, -.14, 0, .14, .28].forEach(z => box([.018, .018, .07], materials.rubber, [1.516, 1.03, z - .08]));
  box([.78, .22, .024], materials.paintDark, [0, .99, -.924]);
  [-.23, 0, .23].forEach(x => {
    const connector = cylinder(.046, .046, .022, materials.copper, [x, .99, -.924], body, 18);
    connector.rotation.x = Math.PI / 2;
  });

  // Four drive modules sit slightly clear of the chassis, connected by visible suspension arms.
  const wheelLocations = [
    [-1.74, .43, .67], [1.74, .43, .67],
    [-1.74, .43, -.67], [1.74, .43, -.67]
  ];
  wheelLocations.forEach(([x, y, z]) => {
    const wheel = new THREE.Group();
    wheel.position.set(x, y, z);
    body.add(wheel);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .245, 40), materials.tire);
    tire.rotation.z = Math.PI / 2;
    finishMesh(tire, wheel);

    // Rough rubber tire surface: the carcass geometry itself is perturbed with
    // small random bumps, giving a worn, coarse texture instead of a tread pattern.
    const tireGeometry = tire.geometry;
    const tirePositions = tireGeometry.attributes.position;
    const tireNormals = tireGeometry.attributes.normal;
    for (let vertexIndex = 0; vertexIndex < tirePositions.count; vertexIndex += 1) {
      const nx = tireNormals.getX(vertexIndex);
      const ny = tireNormals.getY(vertexIndex);
      const nz = tireNormals.getZ(vertexIndex);
      // Only bump the curved tread surface, not the flat sidewall caps.
      if (Math.abs(ny) > .9) continue;
      const roughness = (Math.random() - .5) * .014;
      tirePositions.setXYZ(
        vertexIndex,
        tirePositions.getX(vertexIndex) + nx * roughness,
        tirePositions.getY(vertexIndex) + ny * roughness,
        tirePositions.getZ(vertexIndex) + nz * roughness
      );
    }
    tirePositions.needsUpdate = true;
    tireGeometry.computeVertexNormals();

    [-.126, .126].forEach(offset => {
      const sidewall = new THREE.Mesh(new THREE.TorusGeometry(.29, .065, 12, 48), materials.tire);
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = offset;
      finishMesh(sidewall, wheel);
    });

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.175, .175, .264, 32), materials.aluminum);
    hub.rotation.z = Math.PI / 2;
    finishMesh(hub, wheel);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(.072, .072, .274, 24), materials.accent);
    hubCap.rotation.z = Math.PI / 2;
    finishMesh(hubCap, wheel);
    wheels.push(wheel);

    const suspension = box([.16, .31, .13], materials.steel, [x * .87, .61, z]);
    suspension.rotation.z = Math.sign(x) * -.14;
  });

  // Front bumper-mounted safety LiDAR: a plausible low scanning plane near floor level.
  roundedPrism(.76, .24, .16, .055, materials.paintDark, [0, .67, 1.055]);
  roundedPrism(.55, .105, .038, .025, materials.lidarWindow, [0, .68, 1.155]);
  const safetyScan = new THREE.Mesh(
    new THREE.RingGeometry(.62, .625, 52, 1, -.72, 1.44),
    new THREE.MeshBasicMaterial({ color: 0x41b8aa, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false })
  );
  safetyScan.rotation.x = -Math.PI / 2;
  safetyScan.rotation.z = Math.PI;
  safetyScan.position.set(0, .17, 1.02);
  body.add(safetyScan);

  // Stereo depth camera assembly with opaque coated lenses (no transparency sorting artifacts).
  roundedPrism(1.22, .22, .14, .045, materials.paintDark, [0, 1.08, .92]);
  [-.37, .37].forEach(x => {
    const bezel = cylinder(.105, .105, .035, materials.rubber, [x, 1.09, 1.01], body, 24);
    bezel.rotation.x = Math.PI / 2;
    const lens = cylinder(.066, .066, .043, materials.optical, [x, 1.09, 1.035], body, 28);
    lens.rotation.x = Math.PI / 2;
  });
  const centralLens = cylinder(.048, .048, .043, materials.optical, [0, 1.09, 1.035], body, 24);
  centralLens.rotation.x = Math.PI / 2;

  // Ultrasonic transducers are inset into the four corners and face outward.
  [[-1.24, .91, .82], [1.24, .91, .82]].forEach(([x, y, z]) => {
    const sensor = cylinder(.056, .056, .026, materials.optical, [x, y, z + .08], body, 20);
    sensor.rotation.x = Math.PI / 2;
  });
  [[-1.24, .91, -.82], [1.24, .91, -.82]].forEach(([x, y, z]) => {
    const sensor = cylinder(.056, .056, .026, materials.optical, [x, y, z - .08], body, 20);
    sensor.rotation.x = Math.PI / 2;
  });

  // Emergency stop and three-segment machine status beacon.
  cylinder(.115, .13, .095, materials.paintDark, [-.82, 1.48, -.42]);
  cylinder(.105, .105, .065, materials.red, [-.82, 1.56, -.42]);
  cylinder(.06, .07, .23, materials.steel, [.79, 1.55, -.41]);
  cylinder(.105, .105, .055, materials.status, [.79, 1.69, -.41]);
  cylinder(.105, .105, .055, materials.amber, [.79, 1.75, -.41]);
  cylinder(.105, .105, .055, materials.red, [.79, 1.81, -.41]);

  // Enclosed 360° LiDAR puck. Real housings remain fixed; only the protected internal rotor moves.
  cylinder(.11, .14, .43, materials.steel, [0, 1.65, 0]);
  cylinder(.4, .44, .12, materials.paintDark, [0, 1.9, 0]);
  cylinder(.345, .345, .23, materials.lidarWindow, [0, 2.075, 0], body, 48);
  cylinder(.29, .33, .075, materials.paint, [0, 2.23, 0], body, 40);
  lidarRotor = new THREE.Group();
  lidarRotor.position.set(0, 2.075, 0);
  body.add(lidarRotor);
  box([.49, .035, .025], materials.status, [0, 0, .348], lidarRotor);
  box([.025, .035, .49], materials.status, [.348, 0, 0], lidarRotor);

  // Safety corner lights and flush perimeter fasteners.
  [[-1.22, 1.27, .72], [1.22, 1.27, .72], [-1.22, 1.27, -.72], [1.22, 1.27, -.72]].forEach(position => {
    cylinder(.065, .065, .045, materials.amber, position, body, 20);
  });

  // No visible ground plane — only a shadow-catching surface remains, sized to
  // fill the entire hero stage rather than a small bounded tile. The rover's
  // actual movement still stays within its existing routePoints loop below.
  const shadowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ color: 0x0d2320, opacity: .22 })
  );
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  const routePoints = [
    new THREE.Vector3(-1.75, 0, .35), new THREE.Vector3(-.8, 0, .92), new THREE.Vector3(.95, 0, .64),
    new THREE.Vector3(1.72, 0, -.05), new THREE.Vector3(.72, 0, -.78), new THREE.Vector3(-1.24, 0, -.63)
  ];
  const route = new THREE.CatmullRomCurve3(routePoints, true, 'centripetal');

  // Broad warehouse lighting gives the matte body soft highlights rather than a plastic shine.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x78918b, 1.65));
  const key = new THREE.DirectionalLight(0xfffdf8, 3.4);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -.00015;
  key.shadow.normalBias = .025;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb5e0d8, 1.05);
  fill.position.set(-5, 4, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd8bc, .58);
  rim.position.set(4, 2, -6);
  scene.add(rim);

  // The stage now spans the whole hero section, so the controls live in a
  // sibling element rather than an ancestor of the canvas.
  const visual = stage.closest('.rover-visual') ?? document.querySelector('.rover-visual');
  const motionButton = visual?.querySelector('[data-rover-control="motion"]');
  const motionIcon = motionButton?.querySelector('span');
  const motionLabel = motionButton?.querySelector('b');

  const target = new THREE.Vector3(0, .68, 0);
  // The canvas frame is the entire hero section, so there is always spare room
  // around the model. Default framing is a zoom of 8 measured against the
  // visual column, and the extra canvas around it absorbs the route loop,
  // orbiting and zooming without ever clipping the rover.
  // Zoom is disabled: distance is fixed at 8 and only orbiting is allowed.
  const defaultView = { azimuth: .72, elevation: .36, distance: 8 };
  const view = { ...defaultView };
  // Converts the column-relative `view.distance` into a world distance for the
  // full-hero canvas, so distance 8 always reads at the same apparent size.
  const frame = { scale: 1 };
  let paused = reducedMotion;
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;

  const updateCamera = () => {
    const distance = view.distance * frame.scale;
    const horizontalDistance = Math.cos(view.elevation) * distance;
    camera.position.set(
      target.x + Math.sin(view.azimuth) * horizontalDistance,
      target.y + Math.sin(view.elevation) * distance,
      target.z + Math.cos(view.azimuth) * horizontalDistance
    );
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };

  const updateMotionControl = () => {
    if (!motionButton) return;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused ? 'Resume rover motion' : 'Pause rover motion');
    if (motionIcon) motionIcon.textContent = paused ? '▶' : 'Ⅱ';
    if (motionLabel) motionLabel.textContent = paused ? 'Resume' : 'Pause';
  };

  const toggleMotion = () => {
    paused = !paused;
    updateMotionControl();
  };

  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const deltaX = event.clientX - pointerX;
    const deltaY = event.clientY - pointerY;
    view.azimuth -= deltaX * .0065;
    view.elevation = THREE.MathUtils.clamp(view.elevation + deltaY * .005, .14, .82);
    pointerX = event.clientX;
    pointerY = event.clientY;
    updateCamera();
  });

  const endPointerInteraction = event => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', endPointerInteraction);
  canvas.addEventListener('pointercancel', endPointerInteraction);

  // Zooming is disabled: the wheel always scrolls the page and never changes
  // the camera distance, so the rover stays framed at the default zoom.

  canvas.addEventListener('keydown', event => {
    // Zoom and reset controls are intentionally disabled; only orbit and pause remain.
    const handledKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
    if (!handledKeys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') view.azimuth += .09;
    if (event.key === 'ArrowRight') view.azimuth -= .09;
    if (event.key === 'ArrowUp') view.elevation = Math.max(.14, view.elevation - .06);
    if (event.key === 'ArrowDown') view.elevation = Math.min(.82, view.elevation + .06);
    if (event.key === ' ') toggleMotion();
    updateCamera();
  });

  motionButton?.addEventListener('click', toggleMotion);
  updateMotionControl();
  updateCamera();

  const resize = () => {
    // Layout offsets (not bounding rects) are used here so the reveal
    // animation's transform on the visual column can't skew the framing.
    const width = stage.offsetWidth;
    const height = stage.offsetHeight;
    if (!width || !height) return;

    const focus = visual ?? stage;
    const focusHeight = focus.offsetHeight || height;
    const shiftX = (focus.offsetLeft + focus.offsetWidth / 2) - (stage.offsetLeft + width / 2);
    const shiftY = (focus.offsetTop + focusHeight / 2) - (stage.offsetTop + height / 2);

    // Render a window of a deliberately larger frustum: the visible pixels stay
    // the size of the hero, but the image is re-centred over the visual column,
    // so the rover sits where the layout expects it while keeping the whole
    // hero as usable frame.
    const fullWidth = width + Math.abs(shiftX) * 2;
    const fullHeight = height + Math.abs(shiftY) * 2;
    camera.aspect = fullWidth / fullHeight;
    camera.setViewOffset(
      fullWidth, fullHeight,
      shiftX > 0 ? 0 : Math.abs(shiftX) * 2,
      shiftY > 0 ? 0 : Math.abs(shiftY) * 2,
      width, height
    );

    frame.scale = height / focusHeight;
    updateCamera();
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  if (visual) resizeObserver.observe(visual);
  resize();

  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(stage);
  const clock = new THREE.Clock();
  let motionProgress = .17;
  let previousProgress = motionProgress;

  const render = () => {
    requestAnimationFrame(render);
    const delta = Math.min(clock.getDelta(), .05);
    const elapsed = clock.elapsedTime;
    if (!visible) return;

    if (!paused) motionProgress = (motionProgress + delta * .043) % 1;
    const point = route.getPointAt(motionProgress);
    const tangent = route.getTangentAt(motionProgress);
    // Seat the tires on the shadow plane: wheel bottom = rover.y + body bob
    // (.012) + wheel centre (.43) - tire radius (.37), so rover.y = -.072 puts
    // the contact patch exactly at y=0 and removes the gap under the wheels.
    rover.position.set(point.x, -.072, point.z);
    rover.rotation.y = Math.atan2(tangent.x, tangent.z);

    if (!paused) {
      const previousPoint = route.getPointAt(previousProgress);
      const displacement = new THREE.Vector2(point.x - previousPoint.x, point.z - previousPoint.z);
      // Project the world-space displacement onto the rover's own forward axis so wheel
      // spin direction always matches the direction the chassis is actually heading,
      // regardless of which way the route curves.
      const forward = new THREE.Vector2(Math.sin(rover.rotation.y), Math.cos(rover.rotation.y));
      const signedDistance = displacement.dot(forward);
      const wheelRadius = .37;
      wheels.forEach(wheel => { wheel.rotation.x -= signedDistance / wheelRadius; });
      body.position.y = .012 + Math.sin(elapsed * 4.1) * .006;
      body.rotation.z = Math.sin(elapsed * 2.3) * .0025;
    } else {
      body.position.y = THREE.MathUtils.lerp(body.position.y, .012, .12);
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, .12);
    }

    // The enclosed LiDAR remains operational while the chassis is paused.
    if (!reducedMotion || !paused) lidarRotor.rotation.y += delta * 5.2;
    previousProgress = motionProgress;
    renderer.render(scene, camera);
  };
  render();
}

createRoverScene();
