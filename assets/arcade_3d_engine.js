/**
 * ASPHALT LEGENDS — TOP-25 APP (MONOPOLY GO! STYLE) 100% 3D ICONIC CITYSCAPE & BOARD ENGINE
 * Zero mixed 2D/3D flatness: WebGL renders the full 3D iconic street block, landmark architecture,
 * animated 3D cruisers, elevated trains, palm trees, water towers, hydrant geysers, and 3D tokens.
 * The 2D overlay canvas is 100% transparent outside the chalk board decals & slingshot aim lines.
 */
(function () {
  if (typeof THREE === 'undefined') {
    console.warn('[Asphalt3D] Three.js not found.');
    return;
  }

  const wrap = document.querySelector('.canvas-wrap');
  const canvas2d = document.getElementById('arcadeCanvas') || document.getElementById('skullyCanvas');
  if (!wrap || !canvas2d) return;

  // Enable transparency on the 2D overlay canvas so the 3D WebGL world shines through 100%!
  window.__ASPHALT_3D_ACTIVE = true;

  // Create primary WebGL 3D Viewport Canvas underneath the transparent 2D HUD/chalk layer
  const webglCanvas = document.createElement('canvas');
  webglCanvas.id = 'skully3dCanvas';
  webglCanvas.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'display:block',
    'pointer-events:none',
    'z-index:1',
    'border-radius:14px'
  ].join(';');

  canvas2d.style.position = 'relative';
  canvas2d.style.zIndex = '2';
  canvas2d.style.background = 'transparent';
  wrap.insertBefore(webglCanvas, canvas2d);

  const W = 720, H = 448;
  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xFF7B39);
  scene.fog = new THREE.FogExp2(0xFF8C42, 0.00055);

  // Monopoly GO! / Toy-Box Diorama Camera: frames both the foreground playfield AND the iconic 3D street block behind it!
  const camera = new THREE.PerspectiveCamera(36, W / H, 1, 3500);
  const CAM_BASE = { x: 360, y: -275, z: 395 };
  const CAM_LOOK = new THREE.Vector3(360, 225, 42);
  camera.up.set(0, 0, 1);
  camera.position.set(CAM_BASE.x, CAM_BASE.y, CAM_BASE.z);
  camera.lookAt(CAM_LOOK);

  // Vivid Golden-Hour & Arcade Studio Lighting
  const hemiLight = new THREE.HemisphereLight(0xFFF3C4, 0x3D2352, 1.15);
  hemiLight.position.set(360, 250, 500);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xFFD166, 1.55);
  sunLight.position.set(110, -240, 520);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 50;
  sunLight.shadow.camera.far = 1600;
  const d = 580;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x00F5D4, 0.55);
  rimLight.position.set(680, 480, 260);
  scene.add(rimLight);

  const warmBounce = new THREE.PointLight(0xFF5400, 0.85, 900);
  warmBounce.position.set(360, 320, 95);
  scene.add(warmBounce);

  const to3D = (x2d, y2d) => ({ x: x2d, y: H - y2d });

  // Procedural noise bump/roughness texture for tactile stone & asphalt
  function makeAsphaltBumpTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#363238';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = 40 + Math.floor(Math.random() * 95);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 8);
    return tex;
  }
  const bumpTex = makeAsphaltBumpTexture();

  // Procedural vivid window grid texture for distant 3D skyline towers
  function makeSkylineWindowTex(bgHex, litHex1, litHex2) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = bgHex;
    g.fillRect(0, 0, 128, 256);
    for (let r = 0; r < 16; r++) {
      for (let col = 0; col < 6; col++) {
        const lit = ((r * 7 + col * 13) % 5) !== 0;
        g.fillStyle = lit ? ((r + col) % 2 === 0 ? litHex1 : litHex2) : '#1E1B2E';
        g.fillRect(10 + col * 18, 12 + r * 15, 11, 9);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  const skylineTex1 = makeSkylineWindowTex('#3B2D54', '#FFD166', '#FF9F1C');
  const skylineTex2 = makeSkylineWindowTex('#2B3A67', '#00F5D4', '#FFE066');

  // 3D Billboard Sign Texture Helper (Crisp Arcade Storefront & Landmark Signs)
  function makeSignTexture(text, subtext, bgHex, borderHex, textHex) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = bgHex;
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = borderHex;
    g.lineWidth = 10;
    g.strokeRect(6, 6, 500, 116);
    g.fillStyle = textHex;
    g.font = '900 44px "Bungee", "Luckiest Guy", "Impact", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, subtext ? 48 : 64);
    if (subtext) {
      g.fillStyle = '#FFFFFF';
      g.font = '800 24px "Plus Jakarta Sans", sans-serif';
      g.fillText(subtext, 256, 94);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // =========================================================================
  // 1. FOREGROUND PLAYFIELD SLAB & 3D CURBSTONES
  // =========================================================================
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // Vivid Sunset Sky Backdrop Dome / Horizon Plane
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512; skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  function updateSkyTexture(hoodKey) {
    const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
    if (hoodKey === 'chicago') {
      grad.addColorStop(0, '#1D2B64');
      grad.addColorStop(0.45, '#F8CDDA');
      grad.addColorStop(0.75, '#FF6B6B');
      grad.addColorStop(1, '#FFD166');
    } else if (hoodKey === 'la') {
      grad.addColorStop(0, '#7B2CBF');
      grad.addColorStop(0.4, '#FF007F');
      grad.addColorStop(0.75, '#FF7B00');
      grad.addColorStop(1, '#FFEA00');
    } else if (hoodKey === 'pueblo') {
      grad.addColorStop(0, '#0077B6');
      grad.addColorStop(0.45, '#00B4D8');
      grad.addColorStop(0.78, '#FF9E00');
      grad.addColorStop(1, '#FFD166');
    } else {
      // Brooklyn '84 Block Party Golden Sunset
      grad.addColorStop(0, '#240046');
      grad.addColorStop(0.38, '#7B2CBF');
      grad.addColorStop(0.7, '#FF5400');
      grad.addColorStop(1, '#FFBD00');
    }
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 512, 512);
    // Glowing Golden Sun Disc in upper sky
    const sunG = skyCtx.createRadialGradient(256, 320, 10, 256, 320, 150);
    sunG.addColorStop(0, 'rgba(255, 255, 220, 1)');
    sunG.addColorStop(0.35, 'rgba(255, 209, 102, 0.85)');
    sunG.addColorStop(1, 'rgba(255, 84, 0, 0)');
    skyCtx.fillStyle = sunG;
    skyCtx.fillRect(0, 0, 512, 512);
  }
  updateSkyTexture('brooklyn');
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeo = new THREE.PlaneGeometry(2600, 1100);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.rotation.x = Math.PI / 2;
  skyMesh.position.set(360, 880, 420);
  worldGroup.add(skyMesh);

  // Main Asphalt Playfield Slab (y: -40 to 395 in 3D space -> 2D y: 105 to 540)
  const asphaltGeo = new THREE.BoxGeometry(1400, 450, 18);
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x34323E,
    roughness: 0.78,
    metalness: 0.08,
    bumpMap: bumpTex,
    bumpScale: 1.6
  });
  const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
  asphaltMesh.position.set(360, 185, -9);
  asphaltMesh.receiveShadow = true;
  worldGroup.add(asphaltMesh);

  // TRUE 3D PERSPECTIVE CHALK COURT & PLAYFIELD PLANE (Eliminates 2D floating overlay!)
  const courtCanvas = document.createElement('canvas');
  courtCanvas.width = 720;
  courtCanvas.height = 448;
  const courtCtx = courtCanvas.getContext('2d');
  const courtTex = new THREE.CanvasTexture(courtCanvas);
  courtTex.anisotropy = 4;
  const courtPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(720, 448),
    new THREE.MeshStandardMaterial({
      map: courtTex,
      transparent: true,
      roughness: 0.68,
      metalness: 0.05,
      depthWrite: false
    })
  );
  courtPlane.position.set(360, 224, 0.6);
  courtPlane.receiveShadow = true;
  worldGroup.add(courtPlane);

  // 3D Cast-Iron Sewer Manhole Discs for Stoop Ball Mode (Embedded in the 3D Street!)
  const manholeGroup = new THREE.Group();
  worldGroup.add(manholeGroup);
  const sewerSpecs = [
    { x: 345, y: 388, col: 0x00BBF9, rim: 0xFFD166 },
    { x: 495, y: 388, col: 0x9B5DE5, rim: 0x00F5D4 },
    { x: 642, y: 388, col: 0xFF0055, rim: 0xFFD166 }
  ];
  sewerSpecs.forEach(s => {
    const p3 = to3D(s.x, s.y);
    const mg = new THREE.Group();
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(44, 46, 3.5, 28),
      new THREE.MeshStandardMaterial({ color: s.rim, metalness: 0.8, roughness: 0.25 })
    );
    outer.rotation.x = Math.PI / 2;
    outer.position.z = 1.8;
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(37, 37, 4.2, 28),
      new THREE.MeshStandardMaterial({ color: s.col, roughness: 0.4, metalness: 0.4 })
    );
    inner.rotation.x = Math.PI / 2;
    inner.position.z = 2.2;
    mg.add(outer, inner);
    mg.position.set(p3.x, p3.y, 0);
    manholeGroup.add(mg);
  });

  function update3DCourtTexture(mode, t) {
    courtCtx.clearRect(0, 0, 720, 448);
    if (mode === 'skully' && typeof skullyBoxes !== 'undefined') {
      // Recessed 3D Chalk Court Apron baked onto the 3D street plane
      courtCtx.fillStyle = 'rgba(16, 12, 28, 0.36)';
      courtCtx.fillRect(38, 114, 720 - 76, 448 - 126);
      courtCtx.strokeStyle = '#FFFDF7';
      courtCtx.lineWidth = 5;
      courtCtx.strokeRect(42, 118, 720 - 84, 448 - 134);
      courtCtx.strokeStyle = '#FFD166';
      courtCtx.lineWidth = 2;
      courtCtx.strokeRect(48, 124, 720 - 96, 448 - 146);

      // Diagonal chalk struts
      courtCtx.strokeStyle = 'rgba(255, 253, 247, 0.78)';
      courtCtx.lineWidth = 3;
      courtCtx.beginPath();
      courtCtx.moveTo(42, 118); courtCtx.lineTo(720 - 42, 448 - 16);
      courtCtx.moveTo(720 - 42, 118); courtCtx.lineTo(42, 448 - 16);
      courtCtx.stroke();

      courtCtx.save();
      courtCtx.setLineDash([8, 6]);
      courtCtx.strokeStyle = '#00F5D4';
      courtCtx.lineWidth = 2.8;
      courtCtx.strokeRect(205, 202, 310, 148);
      courtCtx.restore();

      const tgtNum = (typeof skullyCap !== 'undefined') ? skullyCap.target : 1;
      skullyBoxes.forEach(b => {
        const isTarget = (b.num === tgtNum);
        const isSkull = (b.num === 13);
        courtCtx.fillStyle = isTarget
          ? 'rgba(255, 209, 102, 0.55)'
          : (isSkull ? 'rgba(255, 0, 85, 0.55)' : 'rgba(20, 14, 38, 0.72)');
        courtCtx.strokeStyle = isTarget ? '#00F5D4' : (isSkull ? '#FFD166' : '#FFFDF7');
        courtCtx.lineWidth = isTarget ? 4.5 : 3;
        courtCtx.fillRect(b.x - 24, b.y - 22, 48, 44);
        courtCtx.strokeRect(b.x - 24, b.y - 22, 48, 44);

        if (isTarget) {
          const pulse = 29 + Math.sin(t * 8) * 4;
          courtCtx.strokeStyle = '#FF0055';
          courtCtx.lineWidth = 3.5;
          courtCtx.strokeRect(b.x - pulse, b.y - pulse + 2, pulse * 2, (pulse - 2) * 2);
        }

        courtCtx.fillStyle = isTarget ? '#140A24' : '#FFFFFF';
        courtCtx.font = '900 16px "Bungee", "JetBrains Mono", sans-serif';
        courtCtx.textAlign = 'center';
        courtCtx.textBaseline = 'middle';
        courtCtx.fillText(isSkull ? '☠13' : String(b.num), b.x, b.y + 1);
      });
    } else if (mode === 'foursquare') {
      const midX = 360, midY = 276;
      courtCtx.fillStyle = 'rgba(0, 187, 249, 0.34)';
      courtCtx.fillRect(68, 122, midX - 68, midY - 122);
      courtCtx.fillStyle = 'rgba(255, 209, 102, 0.42)';
      courtCtx.fillRect(midX, 122, midX - 68, midY - 122);
      courtCtx.fillStyle = 'rgba(255, 0, 85, 0.36)';
      courtCtx.fillRect(68, midY, midX - 68, 430 - midY);
      courtCtx.fillStyle = 'rgba(0, 245, 212, 0.34)';
      courtCtx.fillRect(midX, midY, midX - 68, 430 - midY);

      courtCtx.strokeStyle = '#FFFDF7';
      courtCtx.lineWidth = 5.5;
      courtCtx.strokeRect(68, 122, 720 - 136, 308);
      courtCtx.beginPath();
      courtCtx.moveTo(midX, 122); courtCtx.lineTo(midX, 430);
      courtCtx.moveTo(68, midY); courtCtx.lineTo(720 - 68, midY);
      courtCtx.stroke();

      courtCtx.beginPath();
      courtCtx.moveTo(midX, midY - 26);
      courtCtx.lineTo(midX + 26, midY);
      courtCtx.lineTo(midX, midY + 26);
      courtCtx.lineTo(midX - 26, midY);
      courtCtx.closePath();
      courtCtx.fillStyle = '#FFD166';
      courtCtx.fill();
      courtCtx.strokeStyle = '#140A24';
      courtCtx.lineWidth = 3;
      courtCtx.stroke();

      courtCtx.font = '900 15px "Bungee", sans-serif';
      courtCtx.fillStyle = '#FFFFFF';
      courtCtx.textAlign = 'center';
      courtCtx.fillText('ACE #2 (CREW)', 214, 150);
      courtCtx.fillText('👑 KING #1', 506, 150);
      courtCtx.fillText('★ YOU (PLAYER)', 214, 412);
      courtCtx.fillText('QUEEN #3 (CREW)', 506, 412);
    } else if (mode === 'stoopball') {
      // Chalk distance markers on the 3D street next to the 3D Cast-Iron Manholes
      const labels = [
        { x: 345, t1: '1 SEWER • SINGLE', t2: '100 PTS', col: '#00F5D4' },
        { x: 495, t1: '2 SEWERS • DOUBLE', t2: '250 PTS', col: '#FFD166' },
        { x: 642, t1: '3 SEWERS • HOME RUN!', t2: '500 PTS', col: '#FF0055' }
      ];
      labels.forEach(l => {
        courtCtx.fillStyle = 'rgba(20, 10, 36, 0.85)';
        courtCtx.fillRect(l.x - 68, 322, 136, 26);
        courtCtx.strokeStyle = l.col;
        courtCtx.lineWidth = 2.5;
        courtCtx.strokeRect(l.x - 68, 322, 136, 26);
        courtCtx.fillStyle = '#FFFFFF';
        courtCtx.font = '900 10.5px "Bungee", sans-serif';
        courtCtx.textAlign = 'center';
        courtCtx.fillText(l.t1, l.x, 339);
        courtCtx.fillStyle = '#FFD166';
        courtCtx.font = '900 12px "Bungee", sans-serif';
        courtCtx.fillText(l.t2, l.x, 434);
      });
    } else if (mode === 'marbles' && typeof MARBLE_RING !== 'undefined') {
      const rg = courtCtx.createRadialGradient(MARBLE_RING.cx, MARBLE_RING.cy, 10, MARBLE_RING.cx, MARBLE_RING.cy, MARBLE_RING.r);
      rg.addColorStop(0, 'rgba(58, 12, 163, 0.48)');
      rg.addColorStop(0.75, 'rgba(20, 10, 36, 0.65)');
      rg.addColorStop(1, 'rgba(0, 245, 212, 0.35)');
      courtCtx.beginPath();
      courtCtx.arc(MARBLE_RING.cx, MARBLE_RING.cy, MARBLE_RING.r, 0, Math.PI * 2);
      courtCtx.fillStyle = rg;
      courtCtx.fill();

      courtCtx.strokeStyle = 'rgba(255, 209, 102, 0.45)';
      courtCtx.lineWidth = 3;
      courtCtx.beginPath();
      courtCtx.moveTo(MARBLE_RING.cx - 52, MARBLE_RING.cy);
      courtCtx.lineTo(MARBLE_RING.cx + 52, MARBLE_RING.cy);
      courtCtx.moveTo(MARBLE_RING.cx, MARBLE_RING.cy - 52);
      courtCtx.lineTo(MARBLE_RING.cx, MARBLE_RING.cy + 52);
      courtCtx.stroke();

      courtCtx.save();
      courtCtx.setLineDash([14, 6]);
      courtCtx.strokeStyle = '#00F5D4';
      courtCtx.lineWidth = 5;
      courtCtx.beginPath();
      courtCtx.arc(MARBLE_RING.cx, MARBLE_RING.cy, MARBLE_RING.r, 0, Math.PI * 2);
      courtCtx.stroke();
      courtCtx.restore();

      courtCtx.strokeStyle = '#FFD166';
      courtCtx.lineWidth = 4;
      courtCtx.beginPath();
      courtCtx.moveTo(240, 422);
      courtCtx.lineTo(480, 422);
      courtCtx.stroke();
    } else if (mode === 'jacks') {
      courtCtx.fillStyle = 'rgba(58, 12, 163, 0.38)';
      courtCtx.fillRect(110, 128, 500, 298);
      courtCtx.strokeStyle = '#00F5D4';
      courtCtx.lineWidth = 4.5;
      courtCtx.strokeRect(110, 128, 500, 298);
      courtCtx.strokeStyle = '#FFD166';
      courtCtx.lineWidth = 2;
      courtCtx.strokeRect(116, 134, 488, 286);
    }
    courtTex.needsUpdate = true;
  }

  // Double Yellow Center Avenue Striping on the Avenue Roadway (behind the play board at y3d = 382)
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xFFD166 });
  const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(1200, 3.5, 0.8), stripeMat);
  stripe1.position.set(360, 384, 0.5);
  const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(1200, 3.5, 0.8), stripeMat);
  stripe2.position.set(360, 390, 0.5);
  worldGroup.add(stripe1, stripe2);

  // White Crosswalk Zebra Bars on Left & Right Ends of the Block
  const zebraMat = new THREE.MeshStandardMaterial({ color: 0xFFFDF7, roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const zl = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 0.9), zebraMat);
    zl.position.set(38, 355 + i * 14, 0.5);
    const zr = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 0.9), zebraMat);
    zr.position.set(682, 355 + i * 14, 0.5);
    worldGroup.add(zl, zr);
  }

  // 3D Raised Bluestone Sidewalk Promenade & Red/Yellow Painted Curb at y3d = 415..520
  const curbGeo = new THREE.BoxGeometry(1400, 95, 16);
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0xD8CFC2,
    roughness: 0.62,
    metalness: 0.05
  });
  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.position.set(360, 455, 6);
  curbMesh.receiveShadow = true;
  curbMesh.castShadow = true;
  worldGroup.add(curbMesh);

  // Iconic NYC/Arcade Yellow Fire-Zone Curb Nose Trim
  const curbTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1400, 6, 16.5),
    new THREE.MeshStandardMaterial({ color: 0xFFB703, roughness: 0.4 })
  );
  curbTrim.position.set(360, 409, 6.2);
  worldGroup.add(curbTrim);

  // Sidewalk Tree Pits & Lush 3D Street Trees
  function createStreetTree(x, y) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 6, 48, 10),
      new THREE.MeshStandardMaterial({ color: 0x5C3A21, roughness: 0.85 })
    );
    trunk.rotation.x = Math.PI / 2;
    trunk.position.set(0, 0, 28);
    trunk.castShadow = true;
    g.add(trunk);

    const foliageCols = [0x2EC4B6, 0x38B000, 0x70E000];
    const offsets = [[0, 0, 58, 24], [-14, -6, 48, 18], [15, 4, 50, 19], [0, 10, 68, 17]];
    offsets.forEach(([ox, oy, oz, rad], idx) => {
      const leaf = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rad, 1),
        new THREE.MeshStandardMaterial({ color: foliageCols[idx % foliageCols.length], roughness: 0.55 })
      );
      leaf.position.set(ox, oy, oz);
      leaf.castShadow = true;
      g.add(leaf);
    });
    g.position.set(x, y, 8);
    return g;
  }

  // 3D Vintage Cast-Iron Streetlights with Glowing Warm Bulbs
  function createStreetLamp(x, y) {
    const g = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1B263B, metalness: 0.75, roughness: 0.3 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 4, 88, 10), poleMat);
    post.rotation.x = Math.PI / 2;
    post.position.set(0, 0, 48);
    g.add(post);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(4, 22, 3), poleMat);
    arm.position.set(0, -9, 90);
    g.add(arm);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xFFF3B0, emissive: 0xFFB703, emissiveIntensity: 1.4 })
    );
    globe.position.set(0, -18, 86);
    g.add(globe);
    g.position.set(x, y, 8);
    return g;
  }

  worldGroup.add(createStreetLamp(75, 416));
  worldGroup.add(createStreetLamp(360, 416));
  worldGroup.add(createStreetLamp(645, 416));

  // 3D Johnny-Pump Fire Hydrant + Animated Water Spray Geyser on the Sidewalk Curb
  const hydrantGroup = new THREE.Group();
  const hydBody = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8.5, 28, 12),
    new THREE.MeshStandardMaterial({ color: 0xE63946, roughness: 0.35, metalness: 0.25 })
  );
  hydBody.rotation.x = Math.PI / 2;
  hydBody.position.set(0, 0, 22);
  const hydCap = new THREE.Mesh(
    new THREE.SphereGeometry(7.5, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xFFB703, roughness: 0.3, metalness: 0.5 })
  );
  hydCap.position.set(0, 0, 36);
  hydrantGroup.add(hydBody, hydCap);
  hydrantGroup.position.set(575, 414, 4);
  worldGroup.add(hydrantGroup);

  // Animated 3D Water Droplets spraying out of the Johnny Pump
  const sprayDrops = [];
  const dropGeo = new THREE.SphereGeometry(2.4, 8, 8);
  const dropMat = new THREE.MeshStandardMaterial({
    color: 0x90E0EF,
    emissive: 0x00B4D8,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.82
  });
  for (let i = 0; i < 18; i++) {
    const dm = new THREE.Mesh(dropGeo, dropMat);
    hydrantGroup.add(dm);
    sprayDrops.push({ mesh: dm, phase: i / 18 });
  }

  // 3D Animated Boombox on the Stoop with Pulsing Woofer Cones
  const boomboxGroup = new THREE.Group();
  const bbCase = new THREE.Mesh(
    new THREE.BoxGeometry(34, 12, 20),
    new THREE.MeshStandardMaterial({ color: 0xE63946, roughness: 0.35, metalness: 0.3 })
  );
  bbCase.position.set(0, 0, 10);
  const wooferMat = new THREE.MeshStandardMaterial({ color: 0x1D1E2C, metalness: 0.6, roughness: 0.25 });
  const wL = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 2, 14), wooferMat);
  wL.position.set(-9, -6, 10);
  const wR = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 2, 14), wooferMat);
  wR.position.set(9, -6, 10);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(8, 2, 7),
    new THREE.MeshStandardMaterial({ color: 0xFFD166, emissive: 0xFFB703, emissiveIntensity: 0.4 })
  );
  deck.position.set(0, -6, 11);
  boomboxGroup.add(bbCase, wL, wR, deck);
  boomboxGroup.position.set(225, 425, 14);
  worldGroup.add(boomboxGroup);

  // =========================================================================
  // 2. ICONIC 3D NEIGHBORHOOD DIORAMA BUILDERS (BROOKLYN, CHICAGO, LA, PUEBLO)
  // =========================================================================
  const hoodGroup = new THREE.Group();
  worldGroup.add(hoodGroup);
  let activeHoodKey = '';
  let dynamicLandmarks = [];

  // Helper: Build a detailed 3D Building with Cornice, 3D Windows, Stoop, or Bodega Awning
  function createDetailedBuilding(opts) {
    const bGroup = new THREE.Group();
    const { x, y, w, d, h, wallHex, trimHex, rows, cols, hasStoop, awningText, awningSub, awningHex, fireEscape } = opts;

    const wallMat = new THREE.MeshStandardMaterial({ color: wallHex, roughness: 0.58, metalness: 0.06 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), wallMat);
    body.position.set(0, 0, h / 2);
    body.castShadow = true;
    body.receiveShadow = true;
    bGroup.add(body);

    // Ornate 3D Bracketed Roof Cornice
    const corniceMat = new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.42, metalness: 0.15 });
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 8, d + 10, 9), corniceMat);
    cornice.position.set(0, -3, h + 4.5);
    cornice.castShadow = true;
    bGroup.add(cornice);

    // Corbels along cornice
    for (let i = -Math.floor(w / 2) + 10; i <= Math.floor(w / 2) - 10; i += 18) {
      const corbel = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 7), corniceMat);
      corbel.position.set(i, -d / 2 - 3, h - 2);
      bGroup.add(corbel);
    }

    // 3D Recessed Glowing Windows with Sandstone Lintels & Sills
    const startZ = hasStoop || awningText ? 52 : 28;
    const availH = h - startZ - 14;
    const rowStep = rows > 1 ? availH / rows : availH;
    const colStep = w / (cols + 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const wx = -w / 2 + c * colStep;
        const wz = startZ + r * rowStep + 10;
        const isLit = ((r * 5 + c * 3 + Math.floor(x)) % 4) !== 0;

        const frame = new THREE.Mesh(new THREE.BoxGeometry(15, 4, 21), corniceMat);
        frame.position.set(wx, -d / 2 - 1, wz);
        bGroup.add(frame);

        const pane = new THREE.Mesh(
          new THREE.BoxGeometry(11, 2.5, 17),
          new THREE.MeshStandardMaterial({
            color: isLit ? 0xFFE66D : 0x2B2D42,
            emissive: isLit ? 0xFF9F1C : 0x000000,
            emissiveIntensity: isLit ? 0.65 : 0,
            roughness: 0.2,
            metalness: 0.4
          })
        );
        pane.position.set(wx, -d / 2 - 2.2, wz);
        bGroup.add(pane);
      }
    }

    // Iconic Brownstone Front Stoop Staircase + Iron Railings + Recessed Arch Doorway
    if (hasStoop) {
      const stoopMat = new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.65 });
      for (let s = 0; s < 5; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(34, 8, (5 - s) * 5.5), stoopMat);
        step.position.set(0, -d / 2 - 6 - s * 6, ((5 - s) * 5.5) / 2);
        step.castShadow = true;
        bGroup.add(step);
      }
      const railMat = new THREE.MeshStandardMaterial({ color: 0x1D1E2C, metalness: 0.7, roughness: 0.3 });
      [-16, 16].forEach(rx => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 34, 18), railMat);
        rail.position.set(rx, -d / 2 - 18, 14);
        bGroup.add(rail);
      });
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(18, 4, 30),
        new THREE.MeshStandardMaterial({ color: 0x5C2C16, roughness: 0.4 })
      );
      door.position.set(0, -d / 2 - 1.5, 38);
      bGroup.add(door);
    }

    // Iconic Bodega / Corner Store Striped 3D Awning & Illuminated Signboard
    if (awningText) {
      const signTex = makeSignTexture(awningText, awningSub || '', '#' + (awningHex || 0xE63946).toString(16).padStart(6, '0'), '#FFD166', '#FFFDF7');
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(w - 8, 4, 24),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x331100, emissiveIntensity: 0.4, roughness: 0.3 })
      );
      signBoard.position.set(0, -d / 2 - 3, 42);
      bGroup.add(signBoard);

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(w - 6, 26, 5),
        new THREE.MeshStandardMaterial({ color: awningHex || 0xE63946, roughness: 0.45 })
      );
      canopy.rotation.x = 0.32;
      canopy.position.set(0, -d / 2 - 14, 28);
      canopy.castShadow = true;
      bGroup.add(canopy);

      const shopWin = new THREE.Mesh(
        new THREE.BoxGeometry(w - 22, 3, 22),
        new THREE.MeshStandardMaterial({ color: 0xFFF3B0, emissive: 0xFFB703, emissiveIntensity: 0.75 })
      );
      shopWin.position.set(0, -d / 2 - 1.5, 14);
      bGroup.add(shopWin);
    }

    // 3D Iron Fire Escape Zig-Zag Balconies & Ladders
    if (fireEscape) {
      const feMat = new THREE.MeshStandardMaterial({ color: 0x1B263B, metalness: 0.75, roughness: 0.35 });
      for (let f = 1; f < rows; f++) {
        const bz = startZ + f * rowStep;
        const balcony = new THREE.Mesh(new THREE.BoxGeometry(36, 14, 3), feMat);
        balcony.position.set(0, -d / 2 - 8, bz);
        bGroup.add(balcony);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(36, 1.5, 10), feMat);
        rail.position.set(0, -d / 2 - 14, bz + 5);
        bGroup.add(rail);
        const ladder = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, rowStep + 6), feMat);
        ladder.rotation.y = (f % 2 === 0 ? 0.45 : -0.45);
        ladder.position.set(0, -d / 2 - 11, bz - rowStep / 2);
        bGroup.add(ladder);
      }
    }

    bGroup.position.set(x, y, 14);
    return bGroup;
  }

  function createRooftopWaterTower(x, y, zBase) {
    const wt = new THREE.Group();
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2B2D42, metalness: 0.7, roughness: 0.4 });
    [[-10, -10], [10, -10], [-10, 10], [10, 10]].forEach(([lx, ly]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 28, 8), legMat);
      leg.rotation.x = Math.PI / 2;
      leg.position.set(lx, ly, 14);
      wt.add(leg);
    });
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16, 32, 16),
      new THREE.MeshStandardMaterial({ color: 0x9C6644, roughness: 0.7 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 42);
    barrel.castShadow = true;
    wt.add(barrel);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x3D405B, roughness: 0.5 })
    );
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 0, 66);
    wt.add(roof);

    wt.position.set(x, y, zBase);
    return wt;
  }

  function createPalmTree(x, y) {
    const pg = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8D5B4C, roughness: 0.8 });
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.5 - i * 0.3, 5 - i * 0.3, 16, 10), trunkMat);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(Math.sin(i * 0.25) * 6, 0, 8 + i * 14);
      seg.castShadow = true;
      pg.add(seg);
    }
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x38B000, roughness: 0.45 });
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(38, 8, 2.5), frondMat);
      frond.position.set(6 + Math.cos(ang) * 18, Math.sin(ang) * 18, 120);
      frond.rotation.z = ang;
      frond.rotation.y = 0.35;
      pg.add(frond);
    }
    pg.position.set(x, y, 12);
    return pg;
  }

  function rebuildHoodDiorama(hoodKey) {
    while (hoodGroup.children.length > 0) {
      hoodGroup.remove(hoodGroup.children[0]);
    }
    dynamicLandmarks = [];
    updateSkyTexture(hoodKey);
    skyTex.needsUpdate = true;

    const towerSpecs = [
      [-120, 690, 95, 70, 290], [40, 710, 110, 80, 340], [210, 700, 90, 70, 260],
      [510, 710, 105, 80, 350], [670, 695, 95, 70, 310], [830, 705, 110, 75, 280]
    ];
    towerSpecs.forEach(([tx, ty, tw, td, th], idx) => {
      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tw, td, th),
        new THREE.MeshStandardMaterial({
          map: idx % 2 === 0 ? skylineTex1 : skylineTex2,
          roughness: 0.65
        })
      );
      tMesh.position.set(tx, ty, th / 2);
      hoodGroup.add(tMesh);
    });

    if (hoodKey === 'brooklyn') {
      const bridgeGroup = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0xC9B79C, roughness: 0.65 });
      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(26, 36, 310), stoneMat);
      leftPillar.position.set(-34, 0, 155);
      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(26, 36, 310), stoneMat);
      rightPillar.position.set(34, 0, 155);
      const centerPier = new THREE.Mesh(new THREE.BoxGeometry(22, 36, 310), stoneMat);
      centerPier.position.set(0, 0, 155);
      const topLint = new THREE.Mesh(new THREE.BoxGeometry(102, 42, 36), stoneMat);
      topLint.position.set(0, 0, 295);
      const midDeck = new THREE.Mesh(new THREE.BoxGeometry(520, 28, 12), stoneMat);
      midDeck.position.set(0, 0, 135);
      bridgeGroup.add(leftPillar, rightPillar, centerPier, topLint, midDeck);

      const cableMat = new THREE.MeshBasicMaterial({ color: 0xFFF3B0 });
      for (let c = -4; c <= 4; c++) {
        if (c === 0) continue;
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 220, 6), cableMat);
        cable.position.set(c * 45, -10, 215);
        cable.rotation.z = c * 0.18;
        bridgeGroup.add(cable);
      }
      bridgeGroup.position.set(360, 640, 0);
      hoodGroup.add(bridgeGroup);

      const bDefs = [
        { x: -35, y: 505, w: 115, d: 80, h: 175, wallHex: 0xB24C34, trimHex: 0xE6CCB2, rows: 3, cols: 3, hasStoop: true, fireEscape: false },
        { x: 92,  y: 505, w: 125, d: 84, h: 195, wallHex: 0xC85A32, trimHex: 0xF4A261, rows: 3, cols: 3, awningText: "PAPI'S BODEGA", awningSub: "HEROES • 25¢ SODAS • SPALDEENS", awningHex: 0xE63946, fireEscape: true },
        { x: 228, y: 505, w: 125, d: 82, h: 185, wallHex: 0x8F3B2B, trimHex: 0xDDB892, rows: 3, cols: 3, hasStoop: true, fireEscape: true },
        { x: 364, y: 505, w: 125, d: 84, h: 205, wallHex: 0xD96B27, trimHex: 0xFFF3B0, rows: 4, cols: 3, awningText: "FULTON RECORDS", awningSub: "84 FUNK • BOOMBOXES • TAPES", awningHex: 0x00B4D8, fireEscape: false },
        { x: 500, y: 505, w: 125, d: 82, h: 188, wallHex: 0xA4422D, trimHex: 0xE6CCB2, rows: 3, cols: 3, hasStoop: true, fireEscape: true },
        { x: 636, y: 505, w: 125, d: 84, h: 198, wallHex: 0xBC4749, trimHex: 0xF2E8CF, rows: 3, cols: 3, awningText: "SAL'S SLICE", awningSub: "HOT SICILIAN • ITALIAN ICES", awningHex: 0x2EC4B6, fireEscape: false },
        { x: 765, y: 505, w: 115, d: 80, h: 175, wallHex: 0x9E3F29, trimHex: 0xDDB892, rows: 3, cols: 3, hasStoop: true, fireEscape: false }
      ];
      bDefs.forEach(b => hoodGroup.add(createDetailedBuilding(b)));
      hoodGroup.add(createRooftopWaterTower(228, 505, 198));
      hoodGroup.add(createRooftopWaterTower(500, 505, 200));
      hoodGroup.add(createStreetTree(160, 418));
      hoodGroup.add(createStreetTree(435, 418));

    } else if (hoodKey === 'chicago') {
      const elViaduct = new THREE.Group();
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x2B2D42, metalness: 0.8, roughness: 0.35 });
      const girder = new THREE.Mesh(new THREE.BoxGeometry(1100, 36, 14), steelMat);
      girder.position.set(360, 465, 96);
      elViaduct.add(girder);
      for (let px = -40; px <= 760; px += 130) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 115), steelMat);
        col.position.set(px, 442, 58);
        elViaduct.add(col);
      }
      hoodGroup.add(elViaduct);

      const trainGroup = new THREE.Group();
      for (let c = 0; c < 4; c++) {
        const car = new THREE.Mesh(
          new THREE.BoxGeometry(92, 26, 28),
          new THREE.MeshStandardMaterial({ color: 0xCED4DA, metalness: 0.75, roughness: 0.25 })
        );
        car.position.set(c * 98, 0, 118);
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(93, 27, 6),
          new THREE.MeshStandardMaterial({ color: 0xE63946, emissive: 0xE63946, emissiveIntensity: 0.3 })
        );
        stripe.position.set(c * 98, 0, 114);
        const winRow = new THREE.Mesh(
          new THREE.BoxGeometry(82, 28, 10),
          new THREE.MeshStandardMaterial({ color: 0xFFE66D, emissive: 0xFFB703, emissiveIntensity: 0.9 })
        );
        winRow.position.set(c * 98, 0, 122);
        trainGroup.add(car, stripe, winRow);
      }
      trainGroup.position.set(120, 455, 0);
      hoodGroup.add(trainGroup);
      dynamicLandmarks.push({ type: 'train', group: trainGroup });

      const bDefs = [
        { x: 40,  y: 520, w: 140, d: 82, h: 195, wallHex: 0x6C757D, trimHex: 0xE9ECEF, rows: 3, cols: 3, hasStoop: true, fireEscape: true },
        { x: 195, y: 520, w: 145, d: 84, h: 215, wallHex: 0xB5442E, trimHex: 0xFFD166, rows: 4, cols: 3, awningText: "BRONZEVILLE JAZZ", awningSub: "SOUTH SIDE SOUL • LIVE HORNS", awningHex: 0x7209B7, fireEscape: false },
        { x: 360, y: 520, w: 150, d: 84, h: 230, wallHex: 0x495057, trimHex: 0xF8F9FA, rows: 4, cols: 4, awningText: "HAROLD'S SHACK", awningSub: "MILD SAUCE • HOT WINGS", awningHex: 0xE63946, fireEscape: true },
        { x: 525, y: 520, w: 145, d: 82, h: 205, wallHex: 0x8D3B29, trimHex: 0xE6CCB2, rows: 3, cols: 3, hasStoop: true, fireEscape: true },
        { x: 680, y: 520, w: 140, d: 82, h: 195, wallHex: 0x5C677D, trimHex: 0xDEE2E6, rows: 3, cols: 3, awningText: "SOUTH SIDE BARBER", awningSub: "FADES • RECORD SHOP", awningHex: 0x00B4D8, fireEscape: false }
      ];
      bDefs.forEach(b => hoodGroup.add(createDetailedBuilding(b)));
      hoodGroup.add(createRooftopWaterTower(360, 520, 240));

    } else if (hoodKey === 'la') {
      const bDefs = [
        { x: 55,  y: 510, w: 155, d: 84, h: 155, wallHex: 0xF4A261, trimHex: 0xFFF3B0, rows: 2, cols: 3, awningText: "CRENSHAW VIP", awningSub: "DAYTON WIRE WHEELS • HYDRAULICS", awningHex: 0xFF007F, fireEscape: false },
        { x: 230, y: 510, w: 165, d: 84, h: 165, wallHex: 0x2EC4B6, trimHex: 0xFFE66D, rows: 2, cols: 4, awningText: "SLASOUL SKATE", awningSub: "BOOGIE ROLLER RINK • 88 BEATS", awningHex: 0x7209B7, fireEscape: false },
        { x: 405, y: 510, w: 160, d: 88, h: 225, wallHex: 0xFF9F1C, trimHex: 0x00F5D4, rows: 3, cols: 3, awningText: "VISION THEATER", awningSub: "LEIMERT PARK ART DECO LANDMARK", awningHex: 0xE63946, fireEscape: false },
        { x: 585, y: 510, w: 165, d: 84, h: 158, wallHex: 0xE76F51, trimHex: 0xFFF3B0, rows: 2, cols: 3, awningText: "TACOS & DONUTS", awningSub: "24 HR DRIVE-IN • ORANGE BANG", awningHex: 0xFB8500, fireEscape: false }
      ];
      bDefs.forEach(b => hoodGroup.add(createDetailedBuilding(b)));
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 12, 85, 12),
        new THREE.MeshStandardMaterial({ color: 0x00F5D4, emissive: 0x00F5D4, emissiveIntensity: 0.7 })
      );
      spire.rotation.x = Math.PI / 2;
      spire.position.set(405, 480, 270);
      hoodGroup.add(spire);

      [20, 145, 315, 495, 675].forEach(px => hoodGroup.add(createPalmTree(px, 418)));

    } else if (hoodKey === 'pueblo') {
      const mtnMat = new THREE.MeshStandardMaterial({ color: 0x4A4E69, roughness: 0.85 });
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xFFFDF7, emissive: 0xFFD166, emissiveIntensity: 0.25 });
      [[140, 680, 260, 320], [380, 700, 310, 370], [610, 680, 270, 310]].forEach(([mx, my, mr, mh]) => {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mtnMat);
        peak.rotation.x = Math.PI / 2;
        peak.position.set(mx, my, mh / 2);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(mr * 0.36, mh * 0.36, 7), snowMat);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(mx, my - 2, mh * 0.84);
        hoodGroup.add(peak, cap);
      });

      const bDefs = [
        { x: 65,  y: 510, w: 160, d: 84, h: 175, wallHex: 0xBC4749, trimHex: 0xF2E8CF, rows: 3, cols: 3, awningText: "UNION AVE DEPOT", awningSub: "PUEBLO HISTORIC DISTRICT '86", awningHex: 0xD90429, fireEscape: false },
        { x: 245, y: 510, w: 165, d: 84, h: 185, wallHex: 0xD4A373, trimHex: 0xFEFAE0, rows: 3, cols: 3, awningText: "SLOPPER DINER", awningSub: "ROASTED PUEBLO GREEN CHILE", awningHex: 0x38B000, fireEscape: false },
        { x: 430, y: 510, w: 165, d: 84, h: 195, wallHex: 0x9E2A2B, trimHex: 0xFFD166, rows: 3, cols: 4, awningText: "BESSEMER PRIDE", awningSub: "STEEL CITY NEIGHBORHOOD CLUB", awningHex: 0x0077B6, fireEscape: true },
        { x: 615, y: 510, w: 160, d: 84, h: 175, wallHex: 0xB56576, trimHex: 0xF2E8CF, rows: 3, cols: 3, hasStoop: true, fireEscape: false }
      ];
      bDefs.forEach(b => hoodGroup.add(createDetailedBuilding(b)));
      hoodGroup.add(createStreetTree(155, 418));
      hoodGroup.add(createStreetTree(525, 418));
    }
  }

  rebuildHoodDiorama('brooklyn');
  activeHoodKey = 'brooklyn';

  // =========================================================================
  // 3. 3D MODE SPECIFIC ARCHITECTURAL PROPS (STOOP STEPS, FOUR SQUARE PADS)
  // =========================================================================
  const stoopStepsGroup = new THREE.Group();
  worldGroup.add(stoopStepsGroup);
  const stoopStepDefs = [
    { x: 88, y: 168, w: 36, h: 195 },
    { x: 124, y: 210, w: 36, h: 155 },
    { x: 160, y: 252, w: 36, h: 115 },
    { x: 196, y: 294, w: 36, h: 75 }
  ];
  stoopStepDefs.forEach((st, idx) => {
    const p3 = to3D(st.x + st.w / 2, st.y + st.h / 2);
    const zHeight = (4 - idx) * 20;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(st.w, st.h, zHeight),
      new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0xD95338 : 0xB84028, roughness: 0.48 })
    );
    stepMesh.position.set(p3.x, p3.y, zHeight / 2);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    stoopStepsGroup.add(stepMesh);

    const bullnose = new THREE.Mesh(
      new THREE.BoxGeometry(st.w + 4, st.h + 4, 4),
      new THREE.MeshStandardMaterial({ color: 0xFFE6A7, roughness: 0.35 })
    );
    bullnose.position.set(p3.x, p3.y, zHeight + 2);
    stoopStepsGroup.add(bullnose);
  });

  // =========================================================================
  // 4. REAL 3D DYNAMIC ACTORS: CRUISER CARS, CAPS, MARBLES, SPALDEEN, JACKS
  // =========================================================================
  function create3DCruiser(bodyHex, roofHex) {
    const car = new THREE.Group();
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(122, 34, 15),
      new THREE.MeshStandardMaterial({ color: bodyHex, metalness: 0.68, roughness: 0.2 })
    );
    chassis.position.set(60, 0, 12);
    chassis.castShadow = true;
    car.add(chassis);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(60, 30, 13),
      new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.35, metalness: 0.3 })
    );
    cabin.position.set(62, 0, 25);
    cabin.castShadow = true;
    car.add(cabin);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(62, 31, 9),
      new THREE.MeshStandardMaterial({ color: 0xFFD166, emissive: 0xFF9F1C, emissiveIntensity: 0.55, metalness: 0.9, roughness: 0.1 })
    );
    glass.position.set(62, 0, 24);
    car.add(glass);

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.95, roughness: 0.08 });
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(6, 36, 6), chromeMat);
    fBumper.position.set(122, 0, 9);
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(6, 36, 6), chromeMat);
    rBumper.position.set(-2, 0, 9);
    car.add(fBumper, rBumper);

    const tireGeo = new THREE.CylinderGeometry(10, 10, 8, 18);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141218, roughness: 0.7 });
    const rimGeo = new THREE.CylinderGeometry(5.5, 5.5, 8.6, 14);
    [[26, -16], [96, -16], [26, 16], [96, 16]].forEach(([wx, wy]) => {
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(wx, wy, 10);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      rim.position.set(wx, wy, 10);
      car.add(wheel, rim);
    });
    return car;
  }

  const cruiserA = create3DCruiser(0xE63946, 0xFFFDF8);
  const cruiserB = create3DCruiser(0x00B4D8, 0xFFD166);
  scene.add(cruiserA, cruiserB);

  const capMeshes = new Map();
  function getOrCreateCapMesh(id, waxColor, rimColor) {
    if (capMeshes.has(id)) return capMeshes.get(id);
    const g = new THREE.Group();
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 17.5, 8.5, 20),
      new THREE.MeshStandardMaterial({ color: rimColor || 0xFFD166, metalness: 0.82, roughness: 0.22 })
    );
    skirt.rotation.x = Math.PI / 2;
    skirt.position.z = 4.25;
    skirt.castShadow = true;
    g.add(skirt);

    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(13.2, 13.2, 7.2, 24),
      new THREE.MeshStandardMaterial({ color: waxColor || 0xE63946, roughness: 0.25, metalness: 0.1 })
    );
    wax.rotation.x = Math.PI / 2;
    wax.position.z = 5.2;
    g.add(wax);

    const penny = new THREE.Mesh(
      new THREE.CylinderGeometry(7.8, 7.8, 7.8, 20),
      new THREE.MeshStandardMaterial({ color: 0xD97736, metalness: 0.88, roughness: 0.2 })
    );
    penny.rotation.x = Math.PI / 2;
    penny.position.z = 5.6;
    g.add(penny);

    scene.add(g);
    capMeshes.set(id, g);
    return g;
  }

  const marbleMeshes = new Map();
  function getOrCreateMarbleMesh(id, colHex, radius) {
    if (marbleMeshes.has(id)) return marbleMeshes.get(id);
    const g = new THREE.Group();
    const r = (radius || 11) * 1.3;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(r, 24, 24),
      new THREE.MeshPhysicalMaterial({
        color: colHex || 0x00F5D4,
        metalness: 0.05,
        roughness: 0.06,
        transmission: 0.62,
        transparent: true,
        opacity: 0.94,
        clearcoat: 1.0
      })
    );
    sphere.castShadow = true;
    g.add(sphere);

    const ribbon = new THREE.Mesh(
      new THREE.TorusKnotGeometry(r * 0.42, r * 0.13, 32, 8),
      new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: colHex || 0xFFD166, emissiveIntensity: 0.45 })
    );
    g.add(ribbon);
    scene.add(g);
    marbleMeshes.set(id, { group: g, r });
    return marbleMeshes.get(id);
  }

  const spaldeenMesh = new THREE.Mesh(
    new THREE.SphereGeometry(15.5, 28, 28),
    new THREE.MeshStandardMaterial({
      color: 0xFF4D8D,
      emissive: 0xFF0055,
      emissiveIntensity: 0.2,
      roughness: 0.32,
      metalness: 0.08
    })
  );
  spaldeenMesh.castShadow = true;
  scene.add(spaldeenMesh);

  const fsPuckMeshes = [];
  const puckColors = [0x00B4D8, 0xFFB703, 0x38B000, 0xFF0055];
  for (let i = 0; i < 4; i++) {
    const pg = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 22, 9, 24),
      new THREE.MeshStandardMaterial({ color: 0xFFFDF8, roughness: 0.3 })
    );
    base.rotation.x = Math.PI / 2;
    base.position.z = 4.5;
    base.castShadow = true;
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16, 11, 24),
      new THREE.MeshStandardMaterial({ color: puckColors[i], metalness: 0.35, roughness: 0.25 })
    );
    top.rotation.x = Math.PI / 2;
    top.position.z = 6;
    pg.add(base, top);
    scene.add(pg);
    fsPuckMeshes.push(pg);
  }

  const jackMeshes = [];
  function create3DJack() {
    const jg = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xFFD166, metalness: 0.88, roughness: 0.18 });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xFF0055, metalness: 0.5, roughness: 0.25 });
    const cylGeo = new THREE.CylinderGeometry(2.4, 2.4, 32, 10);
    const a1 = new THREE.Mesh(cylGeo, metalMat);
    const a2 = new THREE.Mesh(cylGeo, metalMat);
    a2.rotation.z = Math.PI / 2;
    const a3 = new THREE.Mesh(cylGeo, metalMat);
    a3.rotation.x = Math.PI / 2;
    jg.add(a1, a2, a3);
    const tipGeo = new THREE.SphereGeometry(4.2, 12, 12);
    [[-16, 0, 0], [16, 0, 0], [0, -16, 0], [0, 16, 0]].forEach(([tx, ty, tz]) => {
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(tx, ty, tz);
      jg.add(tip);
    });
    jg.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(jg);
    return jg;
  }
  for (let i = 0; i < 12; i++) jackMeshes.push(create3DJack());

  const surfaceColors = {
    asphalt: 0x34323E,
    cement:  0x8D99AE,
    gravel:  0x7F6A54,
    tennis:  0x1B7A43,
    gym:     0xC97A3E,
    marble:  0xE2ECE9
  };

  function syncAndRender3D() {
    requestAnimationFrame(syncAndRender3D);
    const t = performance.now() * 0.001;

    camera.position.x = CAM_BASE.x + Math.sin(t * 0.45) * 8;
    camera.position.z = CAM_BASE.z + Math.cos(t * 0.35) * 4;
    camera.lookAt(CAM_LOOK);

    const hoodKey = (typeof currentHood !== 'undefined') ? currentHood : 'brooklyn';
    if (hoodKey !== activeHoodKey) {
      activeHoodKey = hoodKey;
      rebuildHoodDiorama(hoodKey);
    }

    if (typeof currentSurface !== 'undefined' && surfaceColors[currentSurface]) {
      asphaltMat.color.setHex(surfaceColors[currentSurface]);
      asphaltMat.roughness = currentSurface === 'marble' ? 0.18 : (currentSurface === 'gym' ? 0.3 : 0.76);
    }

    sprayDrops.forEach(d => {
      const p = (t * 1.6 + d.phase) % 1;
      d.mesh.position.set(-p * 68, -p * 32, 26 + Math.sin(p * Math.PI) * 28);
      d.mesh.scale.setScalar(1 - p * 0.4);
    });

    const beatScale = 1 + Math.sin(t * 14) * 0.14;
    wL.scale.set(beatScale, 1, beatScale);
    wR.scale.set(beatScale, 1, beatScale);

    dynamicLandmarks.forEach(lm => {
      if (lm.type === 'train') {
        lm.group.position.x = ((t * 85) % 1100) - 350;
      }
    });

    const c1x = ((Date.now() * 0.042) % 960) - 160;
    const c2x = 840 - ((Date.now() * 0.031) % 980);
    cruiserA.position.set(c1x, H - 92, 2);
    cruiserB.position.set(c2x, H - 102, 2);
    cruiserB.rotation.z = Math.PI;

    const mode = (typeof currentMode !== 'undefined') ? currentMode : 'skully';
    stoopStepsGroup.visible = (mode === 'stoopball');
    manholeGroup.visible = (mode === 'stoopball');
    update3DCourtTexture(mode, t);

    capMeshes.forEach(m => { m.visible = false; });
    marbleMeshes.forEach(m => { m.group.visible = false; });
    spaldeenMesh.visible = false;
    fsPuckMeshes.forEach(m => { m.visible = false; });
    jackMeshes.forEach(m => { m.visible = false; });

    if (mode === 'skully' && typeof skullyCap !== 'undefined') {
      const playerCap = getOrCreateCapMesh('player_cap', '#FF2A54', '#FFD166');
      playerCap.visible = true;
      const p3 = to3D(skullyCap.x, skullyCap.y);
      playerCap.position.set(p3.x, p3.y, 1);
      const speed = Math.hypot(skullyCap.vx || 0, skullyCap.vy || 0);
      if (speed > 0.2) playerCap.rotation.z += speed * 0.05;

      if (typeof rivalCaps !== 'undefined') {
        rivalCaps.forEach((rc, idx) => {
          const rm = getOrCreateCapMesh('rival_' + idx, rc.wax, rc.rim);
          rm.visible = true;
          const rp = to3D(rc.x, rc.y);
          rm.position.set(rp.x, rp.y, 1);
        });
      }
    } else if (mode === 'marbles' && typeof marbleTargets !== 'undefined') {
      marbleTargets.forEach((m, idx) => {
        if (m.out) return;
        const mm = getOrCreateMarbleMesh('m_' + idx, m.hue, m.r);
        mm.group.visible = true;
        const p3 = to3D(m.x, m.y);
        mm.group.position.set(p3.x, p3.y, mm.r);
        mm.group.rotation.x += (m.vy || 0) * 0.08 + 0.01;
        mm.group.rotation.y += (m.vx || 0) * 0.08 + 0.01;
      });
      if (typeof marbleTaw !== 'undefined') {
        const sm = getOrCreateMarbleMesh('shooter_taw', '#00F5D4', marbleTaw.r + 2);
        sm.group.visible = true;
        const p3 = to3D(marbleTaw.x, marbleTaw.y);
        sm.group.position.set(p3.x, p3.y, sm.r);
      }
    } else if (mode === 'foursquare' && typeof fsBall !== 'undefined') {
      spaldeenMesh.visible = true;
      const p3 = to3D(fsBall.x, fsBall.y);
      const bounceZ = 16 + Math.abs(Math.sin(t * 7.5)) * 26;
      spaldeenMesh.position.set(p3.x, p3.y, bounceZ);

      const tNow = Date.now() * 0.004;
      const aiPositions = [
        { x: 214 + Math.sin(tNow) * 52 + (fsBall.x - 360) * 0.12, y: 192 + Math.cos(tNow * 1.3) * 18 },
        { x: 506 + Math.cos(tNow) * 52 + (fsBall.x - 360) * 0.14, y: 192 + Math.sin(tNow * 1.1) * 18 },
        { x: 506 + Math.sin(tNow * 1.2) * 52 + (fsBall.x - 360) * 0.12, y: 348 + Math.cos(tNow) * 18 }
      ];
      aiPositions.forEach((pos, idx) => {
        const pm = fsPuckMeshes[idx];
        pm.visible = true;
        const pp = to3D(pos.x, pos.y);
        pm.position.set(pp.x, pp.y, 1);
      });
      if (typeof fsPlayerPad !== 'undefined') {
        const youM = fsPuckMeshes[3];
        youM.visible = true;
        const yp = to3D(fsPlayerPad.x, fsPlayerPad.y);
        youM.position.set(yp.x, yp.y, 1);
      }
    } else if (mode === 'stoopball' && typeof stoopBall !== 'undefined') {
      spaldeenMesh.visible = true;
      const p3 = to3D(stoopBall.x, stoopBall.y);
      const arcZ = stoopBall.inFlight ? 34 + Math.max(0, (360 - stoopBall.y) * 0.45) : 22;
      spaldeenMesh.position.set(p3.x, p3.y, Math.max(15, arcZ));
    } else if (mode === 'jacks' && typeof jacksList !== 'undefined') {
      jacksList.forEach((j, idx) => {
        if (idx >= jackMeshes.length) return;
        const jm = jackMeshes[idx];
        jm.visible = !j.picked;
        const p3 = to3D(j.x, j.y);
        jm.position.set(p3.x, p3.y, 13);
        jm.rotation.z = idx * 0.7 + t * 0.6;
        jm.rotation.x = 0.4;
      });
      if (typeof jacksBall !== 'undefined') {
        spaldeenMesh.visible = true;
        const bp = to3D(jacksBall.x, jacksBall.y);
        const hZ = Math.max(15, 16 + (jacksBall.z || 0) * 1.1);
        spaldeenMesh.position.set(bp.x, bp.y, hZ);
      }
    }

    renderer.render(scene, camera);
  }

  syncAndRender3D();
})();
