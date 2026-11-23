(function (k) {
  var PTS = [
    [-98.7, 59.42], [-27.04, -53.56], [6.36, -32.66], [20.28, -54.55],
    [57.54, -31.23], [56.03, -29.02], [13.57, 37.97], [-28.05, 103.63]
  ];
  var YUKSEKLIK = 72;
  var YUZ = 0;
  var BOLME = 8;
  var HEDEF = 2;
  var KATLAR = 12;

  function kenarlar() {
    var liste = [];
    var i;
    for (i = 0; i < PTS.length; i++) {
      var a = PTS[i];
      var b = PTS[(i + 1) % PTS.length];
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var boy = Math.hypot(dx, dy);
      var az = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
      var dis = (az + 90) % 360;
      liste.push({
        a: a, b: b, boy: boy, dis: dis,
        ox: dy / boy, oy: -dx / boy, dx: dx, dy: dy
      });
    }
    return liste;
  }

  var KENAR = kenarlar();
  var ORTA = (function () {
    var sx = 0, sy = 0, i;
    for (i = 0; i < PTS.length; i++) { sx += PTS[i][0]; sy += PTS[i][1]; }
    return { x: sx / PTS.length, z: sy / PTS.length };
  })();

  var durum = {
    hazir: false,
    sacakHedef: 0,
    sacakAnlik: 0,
    sacakTaban: 0.05,
    sacakEk: 0.6,
    normal: KENAR[YUZ].dis,
    aktifYuz: YUZ,
    gunes: { yukseklik: 45, azimut: 220 }
  };

  var renderer, scene, camera, controls, clock;
  var sunLight, sunMesh, sunGlow, hemi, rimLight, fillLight;
  var camGroup = [];
  var sacakMeshler = [];
  var heatLights = [];
  var sunRays = [];
  var hedefIsaret;
  var skyMat;
  var envMap;
  var introT = 0;
  var containerEl = null;
  var maxAnizo = 16;

  function gunesYon(gunes) {
    var az = gunes.azimut * Math.PI / 180;
    var alt = Math.max(0.02, gunes.yukseklik) * Math.PI / 180;
    return {
      x: Math.sin(az) * Math.cos(alt),
      y: Math.sin(alt),
      z: Math.cos(az) * Math.cos(alt)
    };
  }

  function noise2(x, y) {
    var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function canvasTex(draw, w, h, repeatX, repeatY) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    draw(ctx, w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (repeatX) tex.repeat.set(repeatX, repeatY || repeatX);
    tex.anisotropy = maxAnizo;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  function betonDokusu() {
    return canvasTex(function (ctx, w, h) {
      var img = ctx.createImageData(w, h);
      var i, x, y, n, v;
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          n = noise2(x * 0.07, y * 0.07) * 0.55 + noise2(x * 0.2, y * 0.2) * 0.3 + noise2(x * 0.5, y * 0.5) * 0.15;
          v = 168 + n * 52;
          i = (y * w + x) * 4;
          img.data[i] = v;
          img.data[i + 1] = v - 4;
          img.data[i + 2] = v - 10;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      ctx.strokeStyle = "rgba(60,50,40,0.18)";
      ctx.lineWidth = 2;
      for (i = 0; i <= 10; i++) {
        ctx.beginPath(); ctx.moveTo(0, (i / 10) * h); ctx.lineTo(w, (i / 10) * h); ctx.stroke();
      }
      for (i = 0; i <= 6; i++) {
        ctx.beginPath(); ctx.moveTo((i / 6) * w, 0); ctx.lineTo((i / 6) * w, h); ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, 0, w, h * 0.08);
    }, 1024, 2048, 3, 8);
  }

  function solarPerdeDokusu() {
    return canvasTex(function (ctx, w, h) {
      var i, y, band;
      ctx.fillStyle = "#1a1c20";
      ctx.fillRect(0, 0, w, h);
      band = h / 22;
      for (i = 0; i < 22; i++) {
        y = i * band;
        // Güneş paneli şeritleri (Solar Curtain zebra)
        ctx.fillStyle = i % 2 === 0 ? "#0c1014" : "#2a3238";
        ctx.fillRect(0, y, w, band * 0.72);
        ctx.fillStyle = "rgba(80, 120, 90, 0.18)";
        ctx.fillRect(0, y + 1, w, band * 0.2);
        ctx.fillStyle = "rgba(255, 220, 140, 0.06)";
        ctx.fillRect(w * 0.08, y + band * 0.15, w * 0.2, band * 0.25);
      }
      ctx.strokeStyle = "rgba(200, 180, 120, 0.25)";
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, w - 12, h - 12);
    }, 512, 1024, 1, 1);
  }

  function camCepheDokusu() {
    return canvasTex(function (ctx, w, h) {
      var katH = h / 18;
      var kolon = w / 8;
      var ky, kx, gx, gy, gg;
      ctx.fillStyle = "#1a2228";
      ctx.fillRect(0, 0, w, h);
      for (ky = 0; ky < 18; ky++) {
        for (kx = 0; kx < 8; kx++) {
          gx = kx * kolon + 3;
          gy = ky * katH + 4;
          gg = ctx.createLinearGradient(gx, gy, gx, gy + katH - 8);
          gg.addColorStop(0, "#9ec8d8");
          gg.addColorStop(0.35, "#5a8498");
          gg.addColorStop(1, "#243848");
          ctx.fillStyle = gg;
          ctx.fillRect(gx, gy, kolon - 6, katH - 10);
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(gx + 4, gy + 3, (kolon - 6) * 0.35, (katH - 10) * 0.28);
          if (noise2(kx, ky) > 0.72) {
            ctx.fillStyle = "rgba(255,210,140,0.18)";
            ctx.fillRect(gx + 2, gy + 2, kolon - 10, katH - 14);
          }
        }
        ctx.fillStyle = "#12161a";
        ctx.fillRect(0, (ky + 1) * katH - 3, w, 3);
      }
      for (kx = 0; kx <= 8; kx++) {
        ctx.fillStyle = "#0e1216";
        ctx.fillRect(kx * kolon - 1.5, 0, 3, h);
      }
    }, 2048, 4096, 1, 1);
  }

  function asfaltDokusu() {
    return canvasTex(function (ctx, w) {
      var img = ctx.createImageData(w, w);
      var x, y, i, n, v;
      for (y = 0; y < w; y++) {
        for (x = 0; x < w; x++) {
          n = noise2(x * 0.15, y * 0.15);
          v = 38 + n * 28;
          i = (y * w + x) * 4;
          img.data[i] = v;
          img.data[i + 1] = v + 2;
          img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      ctx.strokeStyle = "rgba(200,190,150,0.12)";
      ctx.lineWidth = 3;
      for (i = 0; i < 8; i++) {
        ctx.strokeRect(40 + i * 20, 40 + i * 20, w - 80 - i * 40, w - 80 - i * 40);
      }
    }, 1024, 1024, 14, 14);
  }

  function plazaDokusu() {
    return canvasTex(function (ctx, w) {
      var tile = 64;
      var x, y, n;
      for (y = 0; y < w; y += tile) {
        for (x = 0; x < w; x += tile) {
          n = noise2(x * 0.1, y * 0.1);
          ctx.fillStyle = n > 0.5 ? "#5a665e" : "#505c56";
          ctx.fillRect(x, y, tile - 2, tile - 2);
          ctx.strokeStyle = "rgba(20,24,22,0.35)";
          ctx.strokeRect(x, y, tile - 2, tile - 2);
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fillRect(x + 4, y + 4, tile * 0.3, tile * 0.2);
        }
      }
    }, 1024, 1024, 8, 8);
  }

  function envKur() {
    var c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    var ctx = c.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#4d82a8");
    g.addColorStop(0.42, "#d4a878");
    g.addColorStop(0.55, "#8a9080");
    g.addColorStop(1, "#2a322e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    var sg = ctx.createRadialGradient(780, 160, 10, 780, 160, 180);
    sg.addColorStop(0, "rgba(255,244,210,0.95)");
    sg.addColorStop(0.3, "rgba(239,188,94,0.55)");
    sg.addColorStop(1, "rgba(239,188,94,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, 1024, 512);
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function extrudePolygon(pts, h, matOpts) {
    var shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    var i;
    for (i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    var pos = geo.attributes.position;
    for (i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i), pos.getZ(i), pos.getY(i));
    }
    pos.needsUpdate = true;
    if (geo.index) {
      var idx = geo.index.array;
      for (i = 0; i < idx.length; i += 3) {
        var tmp = idx[i + 1];
        idx[i + 1] = idx[i + 2];
        idx[i + 2] = tmp;
      }
      geo.index.needsUpdate = true;
    }
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(matOpts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function cepheGrup(kenar, disari) {
    var g = new THREE.Group();
    var mx = (kenar.a[0] + kenar.b[0]) / 2;
    var mz = (kenar.a[1] + kenar.b[1]) / 2;
    var d = disari == null ? 0.35 : disari;
    g.position.set(mx + kenar.ox * d, 0, mz + kenar.oy * d);
    var tx = kenar.dx / kenar.boy;
    var tz = kenar.dy / kenar.boy;
    var basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(-tx, 0, -tz),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(kenar.ox, 0, kenar.oy)
    );
    g.quaternion.setFromRotationMatrix(basis);
    return g;
  }

  function kule(x, z, w, d, h, govde, camRenk) {
    var grup = new THREE.Group();
    var beton = new THREE.MeshStandardMaterial({
      color: govde,
      metalness: 0.22,
      roughness: 0.55,
      envMap: envMap,
      envMapIntensity: 0.35
    });
    var gov = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h, d * 0.92), beton);
    gov.position.y = h / 2;
    gov.castShadow = true;
    gov.receiveShadow = true;
    grup.add(gov);

    var camTex = camCepheDokusu();
    camTex.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(4, Math.round(h / 10)));
    var camMat = new THREE.MeshPhysicalMaterial({
      map: camTex,
      color: camRenk,
      metalness: 0.35,
      roughness: 0.12,
      envMap: envMap,
      envMapIntensity: 1.15,
      clearcoat: 0.7,
      clearcoatRoughness: 0.15,
      reflectivity: 0.7,
      emissive: 0x081018,
      emissiveIntensity: 0.08
    });

    var faces = [
      [w / 2 + 0.06, 0, 0.12, d * 0.88],
      [-w / 2 - 0.06, 0, 0.12, d * 0.88],
      [0, d / 2 + 0.06, w * 0.88, 0.12],
      [0, -d / 2 - 0.06, w * 0.88, 0.12]
    ];
    faces.forEach(function (p) {
      var panel = new THREE.Mesh(new THREE.BoxGeometry(p[2], h * 0.96, p[3]), camMat);
      panel.position.set(p[0], h * 0.5, p[1]);
      panel.castShadow = true;
      panel.receiveShadow = true;
      grup.add(panel);
    });

    var kaide = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.08, 4.5, d * 1.08),
      new THREE.MeshStandardMaterial({
        color: 0x3a3e42, metalness: 0.3, roughness: 0.65,
        envMap: envMap, envMapIntensity: 0.25
      })
    );
    kaide.position.y = 2.25;
    kaide.castShadow = true;
    kaide.receiveShadow = true;
    grup.add(kaide);

    var tac = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.72, 3.8, d * 0.72),
      new THREE.MeshStandardMaterial({ color: 0x101214, metalness: 0.8, roughness: 0.25, envMap: envMap, envMapIntensity: 0.6 })
    );
    tac.position.y = h + 1.8;
    tac.castShadow = true;
    grup.add(tac);

    var mekanik = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.35, 2.4, d * 0.35),
      new THREE.MeshStandardMaterial({ color: 0x2a2e32, metalness: 0.7, roughness: 0.35 })
    );
    mekanik.position.set(w * 0.12, h + 5, d * 0.08);
    grup.add(mekanik);

    var anten = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.9, roughness: 0.2 })
    );
    anten.position.y = h + 10;
    grup.add(anten);

    var isik = new THREE.PointLight(0xffcc88, 0.45, 80, 2);
    isik.position.set(0, h + 5, 0);
    grup.add(isik);

    grup.position.set(x, 0, z);
    return grup;
  }

  function blok(x, z, w, d, h, renk) {
    var tex = camCepheDokusu();
    tex.repeat.set(Math.max(1, Math.round(w / 16)), Math.max(2, Math.round(h / 12)));
    var m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        map: tex,
        color: renk,
        metalness: 0.25,
        roughness: 0.45,
        envMap: envMap,
        envMapIntensity: 0.4
      })
    );
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function agac(x, z, olcek) {
    var s = olcek || 1;
    var g = new THREE.Group();
    var govde = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * s, 0.55 * s, 3.6 * s, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.95, metalness: 0.05 })
    );
    govde.position.y = 1.8 * s;
    govde.castShadow = true;
    g.add(govde);

    var yesil = new THREE.MeshStandardMaterial({
      color: 0x2f4a38, roughness: 0.78, metalness: 0.05,
      envMap: envMap, envMapIntensity: 0.15
    });
    [[0, 4.6, 0, 2.5], [0.7, 5.4, 0.3, 1.8], [-0.6, 5.2, -0.4, 1.7], [0.2, 6.2, -0.2, 1.4]].forEach(function (p) {
      var yaprak = new THREE.Mesh(new THREE.IcosahedronGeometry(p[3] * s, 1), yesil);
      yaprak.position.set(p[0] * s, p[1] * s, p[2] * s);
      yaprak.castShadow = true;
      yaprak.receiveShadow = true;
      g.add(yaprak);
    });
    g.position.set(x, 0, z);
    return g;
  }

  function camRengi(sicak, pay) {
    if (sicak || pay > 0.55) return { color: 0xff5530, emissive: 0xff2a0c, ei: 1.35 };
    if (pay > 0.28) return { color: 0xff8a3a, emissive: 0xd44a12, ei: 0.85 };
    if (pay > 0.08) return { color: 0xf0b85a, emissive: 0xa86a12, ei: 0.5 };
    return { color: 0x7ab4c8, emissive: 0x0c2434, ei: 0.14 };
  }

  function aciFark(a, b) {
    return Math.min((a - b + 360) % 360, (b - a + 360) % 360);
  }

  function enYakinYuz(normal) {
    var best = YUZ;
    var bestDiff = 1e9;
    var i;
    for (i = 0; i < KENAR.length; i++) {
      if (KENAR[i].boy < 12) continue;
      var d = aciFark(KENAR[i].dis, normal);
      if (d < bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    return best;
  }

  // Her cam kendi cephe azimutunu kullanır (pusula paneli ayrı; 3B gerçek yön)
  function camNormal(cam) {
    if (cam.userData.cepheDis != null && isFinite(cam.userData.cepheDis)) {
      return cam.userData.cepheDis;
    }
    return durum.normal;
  }

  function camMateryal() {
    return new THREE.MeshPhysicalMaterial({
      color: 0x7ab4c8,
      metalness: 0.15,
      roughness: 0.06,
      envMap: envMap,
      envMapIntensity: 1.2,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      reflectivity: 0.85,
      transparent: true,
      opacity: 0.92,
      emissive: 0x0c2434,
      emissiveIntensity: 0.12
    });
  }

  function isiGlowEkle(parent, localX, yh, gen, camH, meta) {
    var glow = new THREE.Mesh(
      new THREE.PlaneGeometry(gen * 0.92, camH * 0.88),
      new THREE.MeshBasicMaterial({
        color: 0xff5520,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    glow.position.set(localX, yh, 0.62);
    glow.userData = {
      bolme: meta.bolme,
      glow: true,
      cepheDis: meta.cepheDis,
      yuz: meta.yuz
    };
    parent.add(glow);
    camGroup.push(glow);
    return glow;
  }

  function cepheKur() {
    var kenar = KENAR[YUZ];
    var facade = cepheGrup(kenar, 0.5);
    scene.add(facade);

    // Cephe plakası — güneşin vurduğu yüzeyi tek kütle gibi okutur
    var plaka = new THREE.Mesh(
      new THREE.BoxGeometry(kenar.boy * 0.98, YUKSEKLIK * 0.92, 0.55),
      new THREE.MeshStandardMaterial({
        map: betonDokusu(),
        color: 0xe8ddd0,
        metalness: 0.12,
        roughness: 0.55,
        envMap: envMap,
        envMapIntensity: 0.28
      })
    );
    plaka.position.set(0, YUKSEKLIK * 0.5, -0.15);
    plaka.castShadow = true;
    plaka.receiveShadow = true;
    facade.add(plaka);

    // Kat bantları
    var bantMat = new THREE.MeshStandardMaterial({
      color: 0xcfc3b4, metalness: 0.2, roughness: 0.48,
      envMap: envMap, envMapIntensity: 0.25
    });
    var kb;
    for (kb = 0; kb <= KATLAR; kb++) {
      var by = 4.0 + kb * 5.45;
      var bant = new THREE.Mesh(
        new THREE.BoxGeometry(kenar.boy * 0.99, 0.22, 0.7),
        bantMat
      );
      bant.position.set(0, by, 0.05);
      bant.castShadow = true;
      facade.add(bant);
    }

    // Dikey kolonlar
    var kolonMat = new THREE.MeshStandardMaterial({
      color: 0xd4c8b8, metalness: 0.18, roughness: 0.5,
      envMap: envMap, envMapIntensity: 0.22
    });
    var kix;
    for (kix = 0; kix <= BOLME; kix++) {
      var kx = ((kix / BOLME) - 0.5) * kenar.boy;
      var kolon = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, YUKSEKLIK * 0.9, 0.85),
        kolonMat
      );
      kolon.position.set(kx, YUKSEKLIK * 0.48, 0.1);
      kolon.castShadow = true;
      facade.add(kolon);
    }

    var metal = new THREE.MeshStandardMaterial({
      color: 0x1c2228, metalness: 0.82, roughness: 0.28,
      envMap: envMap, envMapIntensity: 0.65
    });
    var metalAltin = new THREE.MeshStandardMaterial({
      color: 0x8a6a28, metalness: 0.7, roughness: 0.35,
      envMap: envMap, envMapIntensity: 0.5,
      emissive: 0x3a2808, emissiveIntensity: 0.12
    });
    var nicheMat = new THREE.MeshStandardMaterial({
      color: 0x0e1116, metalness: 0.25, roughness: 0.7
    });
    var spandrelMat = new THREE.MeshStandardMaterial({
      color: 0x2a3038, metalness: 0.45, roughness: 0.4,
      envMap: envMap, envMapIntensity: 0.35
    });

    var bolme, kat;
    for (bolme = 0; bolme < BOLME; bolme++) {
      for (kat = 0; kat < KATLAR; kat++) {
        var t0 = (bolme + 0.1) / BOLME;
        var t1 = (bolme + 0.9) / BOLME;
        var tm = (t0 + t1) / 2;
        var localX = (tm - 0.5) * kenar.boy;
        var gen = kenar.boy * (t1 - t0);
        var z0 = 4.15 + kat * 5.45;
        var z1 = z0 + 3.55;
        var yh = (z0 + z1) / 2;
        var hareketliSacak = true; // tüm cam sıralarında açılır saçak
        var sicakVurgu = bolme === HEDEF; // performans: nokta ışık tek sütunda
        var camH = z1 - z0;

        // Oda derinliği — camın arkası
        var oda = new THREE.Mesh(
          new THREE.BoxGeometry(gen * 0.92, camH * 0.92, 2.4),
          nicheMat
        );
        oda.position.set(localX, yh, -0.9);
        facade.add(oda);

        // Spandrel (kat arası panel)
        if (kat > 0) {
          var span = new THREE.Mesh(
            new THREE.BoxGeometry(gen * 0.96, 1.35, 0.35),
            spandrelMat
          );
          span.position.set(localX, z0 - 0.85, 0.25);
          span.castShadow = true;
          facade.add(span);
        }

        var niche = new THREE.Mesh(
          new THREE.BoxGeometry(gen + 0.55, camH + 0.55, 0.45),
          nicheMat
        );
        niche.position.set(localX, yh, 0.15);
        niche.castShadow = true;
        facade.add(niche);

        var frame = new THREE.Mesh(
          new THREE.BoxGeometry(gen + 0.32, camH + 0.32, 0.2),
          metalAltin
        );
        frame.position.set(localX, yh, 0.38);
        frame.castShadow = true;
        facade.add(frame);

        // Çift mullion ızgarası
        var mullV = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, camH * 0.9, 0.14),
          metal
        );
        mullV.position.set(localX, yh, 0.48);
        facade.add(mullV);
        var mullV2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, camH * 0.9, 0.1),
          metal
        );
        mullV2.position.set(localX - gen * 0.22, yh, 0.48);
        facade.add(mullV2);
        var mullV3 = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, camH * 0.9, 0.1),
          metal
        );
        mullV3.position.set(localX + gen * 0.22, yh, 0.48);
        facade.add(mullV3);
        var mullH = new THREE.Mesh(
          new THREE.BoxGeometry(gen * 0.86, 0.06, 0.12),
          metal
        );
        mullH.position.set(localX, yh, 0.48);
        facade.add(mullH);

        var cam = new THREE.Mesh(
          new THREE.BoxGeometry(gen * 0.86, camH * 0.8, 0.07),
          camMateryal()
        );
        cam.position.set(localX, yh, 0.55);
        cam.userData = { bolme: bolme, kat: kat, cepheDis: kenar.dis, yuz: YUZ };
        cam.castShadow = true;
        facade.add(cam);
        camGroup.push(cam);

        // İç perde / gölgelik silueti
        var perde = new THREE.Mesh(
          new THREE.BoxGeometry(gen * 0.5, camH * 0.55, 0.04),
          new THREE.MeshStandardMaterial({
            color: 0xc8b8a0, roughness: 0.85, metalness: 0.05,
            transparent: true, opacity: 0.35
          })
        );
        perde.position.set(localX - gen * 0.12, yh - 0.2, 0.35);
        facade.add(perde);

        if (sicakVurgu) {
          var heat = new THREE.PointLight(0xff5520, 0, 28, 2);
          heat.position.set(localX, yh, 2.8);
          facade.add(heat);
          heatLights.push(heat);
        }

        isiGlowEkle(facade, localX, yh, gen * 0.9, camH * 0.85, {
          bolme: bolme, cepheDis: kenar.dis, yuz: YUZ
        });

        // Solar Curtain — cam önünde inen panelli perde
        if (hareketliSacak) {
          var perdeH = camH * 0.96;
          var perdeGen = gen * 0.92;
          var perdeTex = solarPerdeDokusu();
          var perde = new THREE.Mesh(
            new THREE.BoxGeometry(perdeGen, perdeH, 0.05),
            new THREE.MeshStandardMaterial({
              map: perdeTex,
              color: 0xffffff,
              metalness: 0.35,
              roughness: 0.45,
              envMap: envMap,
              envMapIntensity: 0.4,
              emissive: 0x1a2818,
              emissiveIntensity: 0.12
            })
          );
          perde.geometry.translate(0, -perdeH / 2, 0);
          perde.position.set(localX, z1 - 0.05, 0.62);
          perde.userData = { bolme: bolme, hareketli: true, perde: true, yuz: YUZ };
          perde.scale.y = 0.04;
          perde.castShadow = true;
          facade.add(perde);
          sacakMeshler.push(perde);

          // Üst kasa / ray
          var ray = new THREE.Mesh(
            new THREE.BoxGeometry(perdeGen * 1.02, 0.14, 0.12),
            metalAltin
          );
          ray.position.set(localX, z1 + 0.02, 0.62);
          facade.add(ray);
        }
      }
    }

    // Zemin kat lobisi
    var lobi = new THREE.Mesh(
      new THREE.BoxGeometry(kenar.boy * 0.7, 3.8, 0.12),
      new THREE.MeshPhysicalMaterial({
        color: 0xa8c8d8,
        metalness: 0.2,
        roughness: 0.1,
        envMap: envMap,
        envMapIntensity: 1.2,
        clearcoat: 1,
        transparent: true,
        opacity: 0.85
      })
    );
    lobi.position.set(0, 2.2, 0.55);
    facade.add(lobi);

    var tMid = (HEDEF + 0.5) / BOLME;
    var hx = kenar.a[0] + kenar.dx * tMid;
    var hz = kenar.a[1] + kenar.dy * tMid;
    hedefIsaret = new THREE.Group();
    var halka = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.1, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0xe8b45a, transparent: true, opacity: 0.9 })
    );
    halka.rotation.x = Math.PI / 2;
    var cubuk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xe8b45a, transparent: true, opacity: 0.75 })
    );
    cubuk.position.y = 6;
    var top = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xff6a3a })
    );
    top.position.y = 12.2;
    var etiket = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x0e1210, transparent: true, opacity: 0.7, depthWrite: false })
    );
    etiket.position.set(0, 13.8, 0);
    hedefIsaret.add(halka, cubuk, top, etiket);
    hedefIsaret.position.set(hx + kenar.ox * 10, YUKSEKLIK * 0.45, hz + kenar.oy * 10);
    scene.add(hedefIsaret);

    var frameYan = new THREE.MeshStandardMaterial({
      color: 0x14181c, metalness: 0.75, roughness: 0.3, envMap: envMap, envMapIntensity: 0.45
    });

    // Diğer tüm cepheler: işlevsel cam + ısı glow + saçak
    KENAR.forEach(function (k2, idx) {
      if (idx === YUZ || k2.boy < 14) return;
      var yan = cepheGrup(k2, 0.55);
      scene.add(yan);
      var adet = Math.max(3, Math.min(12, Math.floor(k2.boy / 8)));
      var katAdet = KATLAR;
      var b, kat2;
      for (b = 0; b < adet; b++) {
        for (kat2 = 0; kat2 < katAdet; kat2++) {
          var t = (b + 0.5) / adet;
          var lx = (t - 0.5) * k2.boy;
          var z0 = 4.15 + kat2 * 5.45;
          var camH2 = 3.2;
          var yh2 = z0 + camH2 * 0.5;
          var gen2 = Math.min(8.0, k2.boy / adet * 0.72);
          var fr = new THREE.Mesh(new THREE.BoxGeometry(gen2 + 0.3, camH2 + 0.45, 0.18), frameYan);
          fr.position.set(lx, yh2, 0.16);
          fr.castShadow = true;
          yan.add(fr);

          var cam2 = new THREE.Mesh(
            new THREE.BoxGeometry(gen2, camH2 * 0.82, 0.08),
            camMateryal()
          );
          cam2.position.set(lx, yh2, 0.32);
          cam2.userData = { bolme: b, kat: kat2, cepheDis: k2.dis, yuz: idx };
          cam2.castShadow = true;
          yan.add(cam2);
          camGroup.push(cam2);

          isiGlowEkle(yan, lx, yh2, gen2, camH2 * 0.82, {
            bolme: b, cepheDis: k2.dis, yuz: idx
          });

          var perdeH2 = camH2 * 0.9;
          var perde2 = new THREE.Mesh(
            new THREE.BoxGeometry(gen2 * 0.9, perdeH2, 0.045),
            new THREE.MeshStandardMaterial({
              map: solarPerdeDokusu(),
              color: 0xffffff,
              metalness: 0.35,
              roughness: 0.45,
              envMap: envMap,
              envMapIntensity: 0.35,
              emissive: 0x1a2818,
              emissiveIntensity: 0.1
            })
          );
          perde2.geometry.translate(0, -perdeH2 / 2, 0);
          perde2.position.set(lx, z0 + camH2 - 0.08, 0.4);
          perde2.userData = { bolme: b, hareketli: true, perde: true, yuz: idx };
          perde2.scale.y = 0.04;
          perde2.castShadow = true;
          yan.add(perde2);
          sacakMeshler.push(perde2);
        }
      }
    });
  }

  function sunRayKur() {
    var i;
    for (i = 0; i < 6; i++) {
      var ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 + i * 0.3, 3.2 + i * 1.1, 170, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffc878,
          transparent: true,
          opacity: 0.03 + (5 - i) * 0.01,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      ray.visible = false;
      scene.add(ray);
      sunRays.push(ray);
    }
  }

  function skyShader() {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a2a38) },
        midColor: { value: new THREE.Color(0xc48a4a) },
        bottomColor: { value: new THREE.Color(0x2d3832) },
        offset: { value: 18 },
        exponent: { value: 0.5 },
        sunDir: { value: new THREE.Vector3(0.4, 0.7, 0.2) },
        sunStrength: { value: 1 }
      },
      vertexShader: [
        "varying vec3 vWorldPosition;",
        "void main(){",
        " vec4 wp = modelMatrix * vec4(position,1.0);",
        " vWorldPosition = wp.xyz;",
        " gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor;",
        "uniform float offset; uniform float exponent;",
        "uniform vec3 sunDir; uniform float sunStrength;",
        "varying vec3 vWorldPosition;",
        "void main(){",
        " float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;",
        " float t = max(pow(max(h, 0.0), exponent), 0.0);",
        " vec3 col = mix(bottomColor, midColor, clamp(h * 1.55 + 0.32, 0.0, 1.0));",
        " col = mix(col, topColor, t);",
        " vec3 dir = normalize(vWorldPosition);",
        " float sun = pow(max(dot(dir, normalize(sunDir)), 0.0), 28.0);",
        " float halo = pow(max(dot(dir, normalize(sunDir)), 0.0), 3.2);",
        " col += vec3(1.0, 0.82, 0.48) * sun * sunStrength;",
        " col += vec3(1.0, 0.55, 0.25) * halo * sunStrength * 0.24;",
        " gl_FragColor = vec4(col, 1.0);",
        "}"
      ].join("\n")
    });
  }

  function duvarlarKur(betonTex) {
    var duvarMat = new THREE.MeshStandardMaterial({
      map: betonTex,
      color: 0xe6dccf,
      metalness: 0.14,
      roughness: 0.56,
      envMap: envMap,
      envMapIntensity: 0.28
    });
    var bantMat = new THREE.MeshStandardMaterial({
      color: 0xc8bcae, metalness: 0.18, roughness: 0.5,
      envMap: envMap, envMapIntensity: 0.22
    });

    KENAR.forEach(function (kenar, idx) {
      if (idx === YUZ) return; // güneybatı cephe cepheKur'da
      var g = cepheGrup(kenar, 0.28);
      scene.add(g);

      var duvar = new THREE.Mesh(
        new THREE.BoxGeometry(kenar.boy * 0.995, YUKSEKLIK * 0.94, 0.7),
        duvarMat
      );
      duvar.position.set(0, YUKSEKLIK * 0.5, 0);
      duvar.castShadow = true;
      duvar.receiveShadow = true;
      g.add(duvar);

      // Kat bantları
      var k;
      for (k = 0; k <= KATLAR; k++) {
        var by = 3.8 + k * 5.5;
        var bant = new THREE.Mesh(
          new THREE.BoxGeometry(kenar.boy * 0.998, 0.28, 0.95),
          bantMat
        );
        bant.position.set(0, by, 0.15);
        bant.castShadow = true;
        g.add(bant);
      }

      // Köşe kolonları
      [-0.48, 0.48].forEach(function (ox) {
        var kolon = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, YUKSEKLIK * 0.95, 0.9),
          bantMat
        );
        kolon.position.set(ox * kenar.boy, YUKSEKLIK * 0.48, 0.2);
        kolon.castShadow = true;
        g.add(kolon);
      });
    });
  }

  function catiKur() {
    // Ana çatı döşemesi
    var cati = extrudePolygon(PTS, 1.4, {
      color: 0x2a2624, metalness: 0.4, roughness: 0.55,
      envMap: envMap, envMapIntensity: 0.35
    });
    cati.position.y = YUKSEKLIK;
    cati.scale.set(1.02, 1, 1.02);
    scene.add(cati);

    // Saçak / korniş — dışarı taşan kenar
    var kornis = extrudePolygon(PTS, 0.55, {
      color: 0x3a342e, metalness: 0.35, roughness: 0.45,
      envMap: envMap, envMapIntensity: 0.3
    });
    kornis.position.y = YUKSEKLIK + 1.35;
    kornis.scale.set(1.08, 1, 1.08);
    scene.add(kornis);

    // Parapet duvarları — çatı kenarında yükselen duvar
    KENAR.forEach(function (kenar) {
      var g = cepheGrup(kenar, 0.15);
      scene.add(g);
      var parapet = new THREE.Mesh(
        new THREE.BoxGeometry(kenar.boy * 0.98, 2.4, 0.45),
        new THREE.MeshStandardMaterial({
          color: 0x3e3832, metalness: 0.3, roughness: 0.5,
          envMap: envMap, envMapIntensity: 0.28
        })
      );
      parapet.position.set(0, YUKSEKLIK + 2.6, 0.1);
      parapet.castShadow = true;
      parapet.receiveShadow = true;
      g.add(parapet);

      // Parapet üst kapak
      var kapak = new THREE.Mesh(
        new THREE.BoxGeometry(kenar.boy * 0.99, 0.18, 0.6),
        new THREE.MeshStandardMaterial({
          color: 0x1a1816, metalness: 0.55, roughness: 0.35,
          envMap: envMap, envMapIntensity: 0.4
        })
      );
      kapak.position.set(0, YUKSEKLIK + 3.85, 0.1);
      kapak.castShadow = true;
      g.add(kapak);
    });

    // Çatı membran şeritleri
    var membranMat = new THREE.MeshStandardMaterial({
      color: 0x1e1c1a, metalness: 0.25, roughness: 0.7
    });
    [[-18, 8, 28, 14], [12, -14, 22, 16], [-8, -22, 18, 12], [22, 18, 16, 20]].forEach(function (p) {
      var serit = new THREE.Mesh(new THREE.BoxGeometry(p[2], 0.12, p[3]), membranMat);
      serit.position.set(ORTA.x + p[0], YUKSEKLIK + 1.5, ORTA.z + p[1]);
      serit.receiveShadow = true;
      scene.add(serit);
    });

    // Çatı ekipmanı
    [[-20, 10, 9, 2.6, 7], [15, -18, 11, 3.2, 8], [5, 25, 7, 2.2, 6], [-35, -5, 8, 2.8, 7],
     [28, 5, 6, 2.0, 5], [-5, 30, 10, 2.4, 6]].forEach(function (p) {
      var kutu = new THREE.Mesh(
        new THREE.BoxGeometry(p[2], p[3], p[4]),
        new THREE.MeshStandardMaterial({
          color: 0x2a3036, metalness: 0.7, roughness: 0.32,
          envMap: envMap, envMapIntensity: 0.45
        })
      );
      kutu.position.set(ORTA.x + p[0], YUKSEKLIK + 1.6 + p[3] / 2, ORTA.z + p[1]);
      kutu.castShadow = true;
      kutu.receiveShadow = true;
      scene.add(kutu);
    });

    // Havalandırma bacaları
    [[10, 12], [-25, 20], [20, -8]].forEach(function (p) {
      var baca = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.85, 3.5, 12),
        new THREE.MeshStandardMaterial({
          color: 0x3a4048, metalness: 0.8, roughness: 0.28,
          envMap: envMap, envMapIntensity: 0.5
        })
      );
      baca.position.set(ORTA.x + p[0], YUKSEKLIK + 3.4, ORTA.z + p[1]);
      baca.castShadow = true;
      scene.add(baca);
    });
  }

  function sehirKur() {
    // Güneş yolu (güneybatı) temiz — gölge düşüren gökdelen yok
    scene.add(kule(ORTA.x - 74, ORTA.z + 118, 30, 30, 142, 0xa8b4bc, 0x7a9eae));
    scene.add(kule(ORTA.x + 128, ORTA.z - 32, 24, 28, 96, 0xc4b8a6, 0x6f8fa0));
    scene.add(kule(ORTA.x + 84, ORTA.z + 96, 20, 20, 62, 0xb0a898, 0x628090));
    scene.add(kule(ORTA.x + 160, ORTA.z + 50, 18, 22, 78, 0xa8b0a4, 0x6a8ea0));
    scene.add(kule(ORTA.x + 40, ORTA.z + 150, 22, 22, 88, 0xb0b8c0, 0x7a9eb0));

    [
      [190, 130, 52, 30, 46, 0x748078],
      [220, -70, 40, 44, 62, 0x68726c],
      [-50, 210, 64, 28, 36, 0x707a73],
      [50, -200, 54, 32, 34, 0x646e68],
      [-160, 160, 38, 42, 48, 0x5e6862],
      [100, -160, 36, 28, 44, 0x68726a],
      [180, 40, 42, 28, 40, 0x6a746e]
    ].forEach(function (u) {
      scene.add(blok(ORTA.x + u[0], ORTA.z + u[1], u[2], u[3], u[4], u[5]));
    });

    [[-42, -72, 1], [-18, -88, 0.9], [12, -98, 1.15], [38, -82, 0.95],
     [58, -52, 1.05], [-74, 22, 1.2], [-90, 48, 0.85], [95, 34, 1.05],
     [72, -42, 1], [-30, 90, 1.1], [20, 70, 0.8], [48, 55, 0.9],
     [-55, -40, 1.0], [110, -20, 0.95]].forEach(function (p) {
      scene.add(agac(ORTA.x + p[0], ORTA.z + p[1], p[2]));
    });

    var yol = new THREE.Mesh(
      new THREE.RingGeometry(110, 126, 128),
      new THREE.MeshStandardMaterial({
        map: asfaltDokusu(),
        color: 0xffffff,
        roughness: 0.92,
        metalness: 0.05
      })
    );
    yol.rotation.x = -Math.PI / 2;
    yol.position.set(ORTA.x, 0.07, ORTA.z);
    yol.receiveShadow = true;
    scene.add(yol);

    var serit = new THREE.Mesh(
      new THREE.RingGeometry(117.4, 118.4, 128),
      new THREE.MeshBasicMaterial({ color: 0xc4b48a, transparent: true, opacity: 0.4 })
    );
    serit.rotation.x = -Math.PI / 2;
    serit.position.set(ORTA.x, 0.09, ORTA.z);
    scene.add(serit);

    var kuzey = new THREE.Mesh(
      new THREE.ConeGeometry(2.0, 5.5, 5),
      new THREE.MeshStandardMaterial({ color: 0xe8b45a, metalness: 0.5, roughness: 0.35, envMap: envMap, envMapIntensity: 0.5 })
    );
    kuzey.position.set(ORTA.x, 3.0, ORTA.z - 95);
    scene.add(kuzey);
  }

  function kur(container) {
    if (durum.hazir) return;
    containerEl = container;
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x24302c, 0.0012);

    envMap = envKur();
    scene.environment = envMap;

    camera = new THREE.PerspectiveCamera(34, 1, 0.4, 2800);
    var kenar = KENAR[YUZ];
    var hedefT = (HEDEF + 0.5) / BOLME;
    var hedefX = kenar.a[0] + kenar.dx * hedefT;
    var hedefZ = kenar.a[1] + kenar.dy * hedefT;
    camera.position.set(hedefX + kenar.ox * 175, 48, hedefZ + kenar.oy * 175);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: true
    });
    var dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(Math.min(Math.max(dpr, 1), 3));
    if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
      maxAnizo = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    if ("physicallyCorrectLights" in renderer) renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;cursor:grab";

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(hedefX + kenar.ox * 2, YUKSEKLIK * 0.38, hedefZ + kenar.oy * 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.048;
    controls.minDistance = 48;
    controls.maxDistance = 440;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = 0.1;
    controls.enablePan = false;

    hemi = new THREE.HemisphereLight(0xf0d8b0, 0x1a2420, 0.55);
    scene.add(hemi);

    rimLight = new THREE.DirectionalLight(0x8ec4d8, 0.42);
    rimLight.position.set(-150, 95, -80);
    scene.add(rimLight);

    fillLight = new THREE.DirectionalLight(0xffd8b0, 0.28);
    fillLight.position.set(90, 45, 130);
    scene.add(fillLight);

    sunLight = new THREE.DirectionalLight(0xffd29a, 1.65);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.camera.near = 8;
    sunLight.shadow.camera.far = 580;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.025;
    if ("radius" in sunLight.shadow) sunLight.shadow.radius = 1.8;
    scene.add(sunLight);
    scene.add(sunLight.target);

    sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9, 56, 56),
      new THREE.MeshBasicMaterial({ color: 0xffe8b8 })
    );
    scene.add(sunMesh);

    sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(24, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffa030, transparent: true, opacity: 0.2, depthWrite: false
      })
    );
    scene.add(sunGlow);

    skyMat = skyShader();
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1300, 72, 36), skyMat));

    var zemin = new THREE.Mesh(
      new THREE.CircleGeometry(580, 140),
      new THREE.MeshStandardMaterial({
        map: asfaltDokusu(),
        color: 0xffffff,
        roughness: 0.93,
        metalness: 0.04,
        envMap: envMap,
        envMapIntensity: 0.12
      })
    );
    zemin.rotation.x = -Math.PI / 2;
    zemin.receiveShadow = true;
    scene.add(zemin);

    var plaza = new THREE.Mesh(
      new THREE.CircleGeometry(110, 110),
      new THREE.MeshStandardMaterial({
        map: plazaDokusu(),
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.12,
        envMap: envMap,
        envMapIntensity: 0.25
      })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(ORTA.x, 0.06, ORTA.z);
    plaza.receiveShadow = true;
    scene.add(plaza);

    var yansima = new THREE.Mesh(
      new THREE.CircleGeometry(42, 80),
      new THREE.MeshPhysicalMaterial({
        color: 0x6a7e88,
        metalness: 0.9,
        roughness: 0.12,
        envMap: envMap,
        envMapIntensity: 1.4,
        transparent: true,
        opacity: 0.42,
        clearcoat: 1,
        clearcoatRoughness: 0.1
      })
    );
    yansima.rotation.x = -Math.PI / 2;
    yansima.position.set(ORTA.x + kenar.ox * 28, 0.09, ORTA.z + kenar.oy * 28);
    yansima.receiveShadow = true;
    scene.add(yansima);

    var betonTex = betonDokusu();
    scene.add(extrudePolygon(PTS, YUKSEKLIK, {
      map: betonTex,
      color: 0xffffff,
      metalness: 0.18,
      roughness: 0.58,
      envMap: envMap,
      envMapIntensity: 0.3
    }));

    var kaide = extrudePolygon(PTS, 1.8, {
      color: 0x2a2622, metalness: 0.25, roughness: 0.65,
      envMap: envMap, envMapIntensity: 0.2
    });
    kaide.scale.set(1.05, 1, 1.05);
    scene.add(kaide);

    duvarlarKur(betonTex);
    catiKur();
    sehirKur();
    cepheKur();
    sunRayKur();
    boyuta();
    durum.hazir = true;
    introT = 0;
    dongu();
  }

  function boyuta() {
    if (!containerEl || !renderer) return;
    var w = containerEl.clientWidth || 800;
    var h = containerEl.clientHeight || 600;
    var dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
    renderer.setPixelRatio(dpr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function guncelleGunes(gunes) {
    durum.gunes = gunes;
    var yon = gunesYon(gunes);
    var uzak = 270;
    sunLight.position.set(
      ORTA.x + yon.x * uzak,
      Math.max(14, yon.y * uzak),
      ORTA.z + yon.z * uzak
    );
    sunLight.target.position.set(ORTA.x, 30, ORTA.z);
    sunLight.target.updateMatrixWorld();
    sunMesh.position.copy(sunLight.position);
    sunGlow.position.copy(sunLight.position);

    var kenar = KENAR[durum.aktifYuz] || KENAR[YUZ];
    var hedef = {
      x: ORTA.x + kenar.ox * 22,
      y: YUKSEKLIK * 0.45,
      z: ORTA.z + kenar.oy * 22
    };
    sunRays.forEach(function (ray, i) {
      ray.position.set(
        (sunLight.position.x + hedef.x) / 2 + (i - 2.5) * 2.0,
        (sunLight.position.y + hedef.y) / 2,
        (sunLight.position.z + hedef.z) / 2 + (i - 2.5) * 1.3
      );
      ray.lookAt(hedef.x, hedef.y, hedef.z);
      ray.rotateX(Math.PI / 2);
    });

    var gece = gunes.yukseklik <= 0;
    sunLight.intensity = gece ? 0.05 : 0.6 + Math.min(1, gunes.yukseklik / 48) * 1.2;
    hemi.intensity = gece ? 0.16 : 0.42 + Math.min(0.28, gunes.yukseklik / 70);
    rimLight.intensity = gece ? 0.08 : 0.35;
    fillLight.intensity = gece ? 0.05 : 0.24;
    renderer.toneMappingExposure = gece ? 0.65 : 1.05 + Math.min(0.28, gunes.yukseklik / 90);
    sunMesh.visible = !gece;
    sunGlow.visible = !gece;
    sunRays.forEach(function (r) { r.visible = !gece && gunes.yukseklik > 6; });

    if (skyMat) {
      skyMat.uniforms.sunDir.value.set(yon.x, yon.y, yon.z);
      skyMat.uniforms.sunStrength.value = gece ? 0.04 : 0.85 + Math.min(0.55, gunes.yukseklik / 48);
      if (gunes.yukseklik > 38) {
        skyMat.uniforms.topColor.value.set(0x4d82a8);
        skyMat.uniforms.midColor.value.set(0xedc998);
        skyMat.uniforms.bottomColor.value.set(0x3a4a42);
      } else if (gunes.yukseklik > 8) {
        skyMat.uniforms.topColor.value.set(0x2a4058);
        skyMat.uniforms.midColor.value.set(0xd4924a);
        skyMat.uniforms.bottomColor.value.set(0x2d3832);
      } else {
        skyMat.uniforms.topColor.value.set(0x101820);
        skyMat.uniforms.midColor.value.set(0x6a3a28);
        skyMat.uniforms.bottomColor.value.set(0x1a211e);
      }
      scene.fog.color.copy(skyMat.uniforms.bottomColor.value);
    }
  }

  function hedefIsaretKonumla() {
    if (!hedefIsaret) return;
    var yuz = durum.aktifYuz;
    var kenar = KENAR[yuz] || KENAR[YUZ];
    var tMid = 0.5;
    var hx = kenar.a[0] + kenar.dx * tMid;
    var hz = kenar.a[1] + kenar.dy * tMid;
    hedefIsaret.position.set(
      hx + kenar.ox * 10,
      YUKSEKLIK * 0.45,
      hz + kenar.oy * 10
    );
  }

  function guncelleCamlar() {
    var G = k.Golge;
    var gunes = durum.gunes;
    var hotCount = 0;
    var pulse = Math.sin(clock.elapsedTime * 3.2);

    camGroup.forEach(function (cam) {
      var sacak = durum.sacakTaban + durum.sacakAnlik * durum.sacakEk;
      var normal = camNormal(cam);
      var sonuc = G.golgeMetre(gunes, sacak, normal);
      var sicak = sonuc.onde && sonuc.pay > (G.ayar && G.ayar.esik != null ? G.ayar.esik : 0.5);
      var pay = sonuc.pay || 0;
      if (sicak) hotCount += 1;

      if (cam.userData.glow) {
        // Tüm cephelerde ısı glow — güneş vuran cam kırmızı yanar
        if (sicak) {
          cam.material.opacity = 0.28 + pulse * 0.1;
          cam.material.color.setHex(0xff3a18);
        } else if (pay > 0.2) {
          cam.material.opacity = 0.1 + pay * 0.2;
          cam.material.color.setHex(0xffa030);
        } else {
          cam.material.opacity = 0;
        }
        return;
      }

      var r = camRengi(sicak, pay);
      cam.material.color.setHex(r.color);
      if (cam.material.emissive) {
        cam.material.emissive.setHex(r.emissive);
        cam.material.emissiveIntensity = r.ei + (sicak ? pulse * 0.15 : pay * 0.2);
      }
      // Kızaran cam biraz daha opak okunur
      if (cam.material.opacity != null) {
        cam.material.opacity = sicak ? 0.98 : (pay > 0.15 ? 0.94 : 0.88);
      }
    });

    heatLights.forEach(function (l) {
      l.intensity = hotCount > 0 ? 1.1 + pulse * 0.2 : 0;
    });

    sacakMeshler.forEach(function (s) {
      if (!s.userData.hareketli) return;
      if (s.userData.perde) {
        // Solar Curtain: yukarıda toplanmış → aşağı inik
        var hedefY = Math.max(0.04, 0.04 + durum.sacakAnlik * 0.96);
        s.scale.y += (hedefY - s.scale.y) * 0.12;
        if (s.material && s.material.emissiveIntensity != null) {
          s.material.emissiveIntensity = 0.08 + durum.sacakAnlik * 0.35;
        }
        return;
      }
      var hedef = Math.max(0.06, durum.sacakTaban + durum.sacakAnlik * Math.max(0.2, durum.sacakEk) * 1.7);
      s.scale.z = Math.max(0.06, hedef);
    });

    if (hedefIsaret) {
      hedefIsaret.rotation.y = clock.elapsedTime * 0.35;
      hedefIsaret.position.y = YUKSEKLIK * 0.48 + Math.sin(clock.elapsedTime * 1.4) * 1.2;
      var op = 0.55 + Math.sin(clock.elapsedTime * 2) * 0.2;
      hedefIsaret.children.forEach(function (c) {
        if (c.material && c.material.opacity != null) c.material.opacity = op;
      });
    }
  }

  function ayarla(opts) {
    if (!durum.hazir) return;
    durum.sacakHedef = opts.sacakVar ? 1 : 0;
    if (opts.sacakTaban != null) durum.sacakTaban = opts.sacakTaban;
    if (opts.sacakEk != null) durum.sacakEk = opts.sacakEk;
    if (opts.normal != null && isFinite(opts.normal)) {
      durum.normal = ((Number(opts.normal) % 360) + 360) % 360;
      durum.aktifYuz = enYakinYuz(durum.normal);
      hedefIsaretKonumla();
    }
    guncelleGunes(opts.gunes || durum.gunes);
    guncelleCamlar();
  }

  function dongu() {
    requestAnimationFrame(dongu);
    var dt = Math.min(0.05, clock.getDelta());
    introT += dt;
    durum.sacakAnlik += (durum.sacakHedef - durum.sacakAnlik) * Math.min(1, dt * 4.2);
    guncelleCamlar();

    if (introT < 3.8) {
      var t = introT / 3.8;
      var e = 1 - Math.pow(1 - t, 3);
      var kenar = KENAR[YUZ];
      var hedefT = (HEDEF + 0.5) / BOLME;
      var hx = kenar.a[0] + kenar.dx * hedefT;
      var hz = kenar.a[1] + kenar.dy * hedefT;
      var yan = { x: -kenar.oy, z: kenar.ox };
      var uzak = 240 - e * 70;
      var yanKay = (1 - e) * 48;
      camera.position.set(
        hx + kenar.ox * uzak + yan.x * yanKay,
        78 - e * 30,
        hz + kenar.oy * uzak + yan.z * yanKay
      );
      controls.target.set(hx + kenar.ox * 3, YUKSEKLIK * (0.48 - e * 0.1), hz + kenar.oy * 3);
    }

    if (sunGlow && sunGlow.visible) {
      sunGlow.material.opacity = 0.17 + Math.sin(clock.elapsedTime * 1.4) * 0.05;
      sunGlow.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.1) * 0.05);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", boyuta);

  k.Bina = {
    YUZ_NORMAL: KENAR[YUZ].dis,
    HEDEF: HEDEF,
    BOLME: BOLME,
    KATLAR: KATLAR,
    kur: kur,
    ayarla: ayarla,
    boyuta: boyuta
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
