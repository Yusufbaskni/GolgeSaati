(function () {
  var G = globalThis.Golge;
  var B = globalThis.Bina;
  var S = globalThis.Senaryo;
  var E = globalThis.Ekler;
  var BLE = globalThis.BleSacak;
  var WIFI = globalThis.WifiSacak;

  var durum = {
    binaId: "is-kuleleri",
    sacak: 0.05,
    ek: 0.6,
    pencere: 1.5,
    normal: 238,
    daire: 40,
    guc: 1.2,
    lat: 41.0815,
    lon: 29.0114,
    yerAd: "",
    yer: "",
    engel: 8,
    bulut: 0.12,
    kalib: 0,
    fiyat: 3.5,
    maliyet: 18000,
    katsayi: 0.4,
    camId: "cift",
    shgc: 0.65,
    webhook: "",
    sacakVar: false,
    saat: 14.5,
    havaSicaklik: null
  };

  var ay = G.AYLAR[2];
  var sonRapor = null;

  var kok = document.getElementById("sahneKok");
  var aylar = document.getElementById("aylar");
  var saatGirdi = document.getElementById("saat");
  var saatYazi = document.getElementById("saatYazi");
  var cumle = document.getElementById("cumle");
  var ciplakSaat = document.getElementById("ciplakSaat");
  var sacakSaat = document.getElementById("sacakSaat");
  var farkSaat = document.getElementById("farkSaat");
  var yilKwh = document.getElementById("yilKwh");
  var rakamKaynak = document.getElementById("rakamKaynak");
  var netEtkiEl = document.getElementById("netEtki");
  var karbon = document.getElementById("karbon");
  var maliyetYazi = document.getElementById("maliyetYazi");
  var konumYazi = document.getElementById("konumYazi");
  var seritGun = document.getElementById("seritGun");
  var sacakDugme = document.getElementById("sacak");
  var durumYazi = document.getElementById("durumYazi");
  var dereceYazi = document.getElementById("dereceYazi");
  var dereceDolgu = document.getElementById("dereceDolgu");
  var dereceIsaret = document.getElementById("dereceIsaret");
  var dereceCiplak = document.getElementById("dereceCiplak");
  var dereceSacak = document.getElementById("dereceSacak");
  var dereceFark = document.getElementById("dereceFark");
  var binaSec = document.getElementById("binaSec");
  var markaUst = document.getElementById("markaUst");
  var markaAlt = document.getElementById("markaAlt");
  var panelBaslik = document.getElementById("panelBaslik");
  var sacakEtiketSayi = document.getElementById("sacakEtiketSayi");
  var yilEtiket = document.getElementById("yilEtiket");
  var kalibNot = document.getElementById("kalibNot");
  var paylasNot = document.getElementById("paylasNot");
  var senaryoListe = document.getElementById("senaryoListe");
  var konumAra = document.getElementById("konumAra");
  var konumSonuc = document.getElementById("konumSonuc");
  var konumDurum = document.getElementById("konumDurum");
  var yonYazi = document.getElementById("yonYazi");
  var hudYonYazi = document.getElementById("hudYonYazi");
  var pusula = document.getElementById("pusula");
  var pusulaOk = document.getElementById("pusulaOk");
  var pusulaGunes = document.getElementById("pusulaGunes");
  var pusulaYonler = document.getElementById("pusulaYonler");
  var pusulaNot = document.getElementById("pusulaNot");
  var programDurum = document.getElementById("programDurum");
  var programListe = document.getElementById("programListe");
  var programSonraki = document.getElementById("programSonraki");
  var dilimler = [];
  var pusulaSurukleniyor = false;
  var sonBildirimAnahtar = "";
  var sonBleOtomatik = null;
  var bleDurumEl = document.getElementById("bleDurum");
  var bleNot = document.getElementById("bleNot");
  var wifiDurumEl = document.getElementById("wifiDurum");
  var wifiNot = document.getElementById("wifiNot");
  var sonWifiOtomatik = null;

  var alanlar = {
    pEk: "ekCm",
    pSacak: "sacakCm",
    pPencere: "pencere",
    pNormal: "normal",
    pDaire: "daire",
    pGuc: "guc",
    pLat: "lat",
    pLon: "lon",
    pEngel: "engel",
    pBulut: "bulut",
    pKalib: "kalib",
    pFiyat: "fiyat",
    pMaliyet: "maliyet",
    pKatsayi: "katsayi"
  };

  function ekCm() { return Math.round(durum.ek * 100); }
  function sacakCm() { return Math.round(durum.sacak * 100); }
  function sacakMetre() { return durum.sacak + (durum.sacakVar ? durum.ek : 0); }

  function yonAdi(azimut) {
    var a = ((azimut % 360) + 360) % 360;
    var adlar = [
      "Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu",
      "Güney", "Güneybatı", "Batı", "Kuzeybatı"
    ];
    return adlar[Math.round(a / 45) % 8];
  }

  function normalNormalize(n) {
    n = Math.round(Number(n));
    if (!isFinite(n)) n = 0;
    return ((n % 360) + 360) % 360;
  }

  function pusulaGuncelle(gunesAzimut) {
    var n = normalNormalize(durum.normal);
    durum.normal = n;
    var yazi = yonAdi(n) + " · " + n + "°";
    if (yonYazi) yonYazi.textContent = yazi;
    if (hudYonYazi) hudYonYazi.textContent = yazi;
    if (pusulaOk) pusulaOk.style.transform = "rotate(" + n + "deg)";
    if (pusula) {
      pusula.setAttribute("aria-valuenow", String(n));
      pusula.setAttribute("aria-valuetext", yazi);
    }
    if (pusulaGunes) {
      if (gunesAzimut == null || !isFinite(gunesAzimut)) {
        pusulaGunes.style.opacity = "0.25";
      } else {
        var rad = (gunesAzimut - 90) * Math.PI / 180;
        var r = 48;
        var x = Math.cos(rad) * r;
        var y = Math.sin(rad) * r;
        pusulaGunes.style.opacity = "1";
        pusulaGunes.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      }
    }
    if (pusulaYonler) {
      Array.prototype.forEach.call(pusulaYonler.querySelectorAll("button"), function (b) {
        var hedef = Number(b.dataset.yon);
        var fark = Math.min(Math.abs(n - hedef), 360 - Math.abs(n - hedef));
        b.setAttribute("aria-pressed", fark <= 22.5 ? "true" : "false");
      });
    }
  }

  function normalAyarla(n, kaynak) {
    durum.normal = normalNormalize(n);
    durum.binaId = "ozel";
    if (binaSec) binaSec.value = "ozel";
    document.getElementById("pNormal").value = String(durum.normal);
    if (pusulaNot && kaynak) pusulaNot.textContent = kaynak;
    ciz();
  }

  function pusulaAcidan(clientX, clientY) {
    if (!pusula) return durum.normal;
    var rect = pusula.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = clientX - cx;
    var dy = clientY - cy;
    // 0° = kuzey (yukarı), saat yönünde
    var deg = Math.atan2(dx, -dy) * 180 / Math.PI;
    return normalNormalize(deg);
  }

  // Dış hava tahmini (°C) — hava API yoksa mevsim + saat
  function tahminiHava(gun, saat) {
    var yaz = Math.sin(2 * Math.PI * (gun - 80) / 365);
    var taban = 9 + 16 * Math.max(0, yaz) + 3 * Math.min(0, yaz);
    var ogle = Math.sin(Math.PI * Math.max(0, Math.min(1, (saat - 6) / 13)));
    return taban + 5.5 * ogle;
  }

  /**
   * Cam dış yüzeyi (°C) — sol-air yaklaşımı:
   * T ≈ T_hava + küçük ofset + (doğrudan ışınım × SHGC × güneşlenen pay)
   * Saçak farkı yalnızca pay farkından gelir; abartılı 15–20° sıçrama yok.
   */
  function camDerece(gunes, sacakM) {
    var g = G.golgeMetre(gunes, sacakM, durum.normal);
    var Tdis = durum.havaSicaklik != null && isFinite(durum.havaSicaklik)
      ? durum.havaSicaklik
      : tahminiHava(ay.gun, durum.saat);
    var shgc = durum.shgc != null ? durum.shgc : 0.65;
    var bulut = Math.max(0, Math.min(0.85, durum.bulut || 0));
    var altRad = Math.max(0, gunes.yukseklik) * Math.PI / 180;
    var gama = (gunes.azimut - durum.normal) * Math.PI / 180;
    while (gama > Math.PI) gama -= 2 * Math.PI;
    while (gama < -Math.PI) gama += 2 * Math.PI;
    var cosG = Math.cos(gama);
    var sinAlt = Math.sin(altRad);

    // Düşey cepheye düşen doğrudan ışınım (0–1)
    var isinim = 0;
    if (gunes.yukseklik > 2 && cosG > 0.05) {
      isinim = Math.max(0, cosG) * sinAlt;
      isinim *= (1 - 0.78 * bulut);
    }

    var pay = g.onde ? g.pay : 0;
    // Diffüz / gökyüzü: saçaklı camda da az ısınma
    var diffuz = 0.9 * shgc * (1 - 0.55 * bulut) * Math.max(0, sinAlt);
    // Doğrudan güneşte SHGC=1 için hava üstü ~16°C; SHGC ile ölçek
    var dogrudan = 16 * shgc * isinim * pay;
    var T = Tdis + 0.6 + diffuz + dogrudan;
    // Fiziksel makul bant: dış hava −1 … +20
    T = Math.max(Tdis - 1, Math.min(Tdis + 20, T));
    return Math.round(T * 10) / 10;
  }

  function dereceYuzde(deg) {
    var Tdis = durum.havaSicaklik != null && isFinite(durum.havaSicaklik)
      ? durum.havaSicaklik
      : tahminiHava(ay.gun, durum.saat);
    var lo = Tdis - 2;
    var hi = Tdis + 18;
    return Math.max(0, Math.min(100, ((deg - lo) / (hi - lo)) * 100));
  }

  function gunesAyarla() {
    G.ayarla({
      lat: durum.lat,
      lon: durum.lon,
      normal: durum.normal,
      pencere: durum.pencere,
      engel: durum.engel,
      bulut: durum.bulut,
      kalibrasyonSaat: durum.kalib
    });
  }

  function raporKur(gunlukFark, yil) {
    var tlNet = yil.netTl != null ? yil.netTl : yil.yilTl;
    var geri = durum.maliyet > 0 && tlNet > 0
      ? (durum.maliyet / tlNet).toFixed(1).replace(".", ",") + " yıl"
      : "—";
    yil.geriOdemeYil = geri;
    var bina = S.binaBul(durum.binaId);
    sonRapor = {
      bina: durum.yerAd || bina.ad,
      yer: durum.yer || bina.yer,
      lat: durum.lat,
      lon: durum.lon,
      normal: durum.normal,
      pencere: durum.pencere,
      ekCm: ekCm(),
      engel: durum.engel,
      bulut: durum.bulut,
      daire: durum.daire,
      guc: durum.guc,
      fiyat: durum.fiyat,
      maliyet: durum.maliyet,
      gunlukFark: gunlukFark,
      yilKwh: yil.yilKwh,
      yilCo2: yil.yilCo2,
      yilTl: yil.yilTl,
      brutKwh: yil.brutKwh,
      aracKwh: yil.aracKwh,
      motorKwh: yil.motorKwh,
      sicramaOran: yil.sicramaOran,
      sicramaKwh: yil.sicramaKwh,
      netKwh: yil.netKwh,
      netCo2: yil.netCo2,
      netTl: yil.netTl,
      geriOdeme: geri,
      aylik: yil.aylik
    };
    return sonRapor;
  }

  function durumPaket() {
    return {
      binaId: durum.binaId,
      sacak: durum.sacak,
      ek: durum.ek,
      pencere: durum.pencere,
      normal: durum.normal,
      daire: durum.daire,
      guc: durum.guc,
      lat: durum.lat,
      lon: durum.lon,
      yerAd: durum.yerAd,
      yer: durum.yer,
      engel: durum.engel,
      bulut: durum.bulut,
      kalib: durum.kalib,
      fiyat: durum.fiyat,
      maliyet: durum.maliyet,
      katsayi: durum.katsayi,
      camId: durum.camId,
      shgc: durum.shgc,
      webhook: durum.webhook,
      sacakVar: durum.sacakVar,
      saat: durum.saat,
      ayId: ay.id
    };
  }

  function durumUygula(p) {
    if (!p) return;
    Object.keys(durum).forEach(function (k) {
      if (p[k] != null) durum[k] = p[k];
    });
    if (p.ayId) {
      var bulunan = G.AYLAR.filter(function (m) { return m.id === p.ayId; })[0];
      if (bulunan) ay = bulunan;
    }
    formDoldur();
  }

  function formDoldur() {
    document.getElementById("pEk").value = String(ekCm());
    document.getElementById("pSacak").value = String(sacakCm());
    document.getElementById("pPencere").value = String(durum.pencere);
    document.getElementById("pNormal").value = String(normalNormalize(durum.normal));
    document.getElementById("pDaire").value = String(durum.daire);
    document.getElementById("pGuc").value = String(durum.guc);
    document.getElementById("pLat").value = String(Number(durum.lat.toFixed(6)));
    document.getElementById("pLon").value = String(Number(durum.lon.toFixed(6)));
    document.getElementById("pEngel").value = String(durum.engel);
    document.getElementById("pBulut").value = String(durum.bulut);
    document.getElementById("pKalib").value = String(durum.kalib);
    document.getElementById("pFiyat").value = String(durum.fiyat);
    document.getElementById("pMaliyet").value = String(durum.maliyet);
    document.getElementById("pKatsayi").value = String(durum.katsayi);
    var pCam = document.getElementById("pCam");
    if (pCam) pCam.value = durum.camId || "cift";
    var pWebhook = document.getElementById("pWebhook");
    if (pWebhook) pWebhook.value = durum.webhook || "";
    saatGirdi.value = String(durum.saat);
    if (binaSec) binaSec.value = durum.binaId;
    haritaGuncelle();
  }

  function formOku() {
    durum.ek = Number(document.getElementById("pEk").value) / 100;
    durum.sacak = Number(document.getElementById("pSacak").value) / 100;
    durum.pencere = Number(document.getElementById("pPencere").value);
    durum.normal = normalNormalize(document.getElementById("pNormal").value);
    durum.daire = Number(document.getElementById("pDaire").value);
    durum.guc = Number(document.getElementById("pGuc").value);
    durum.lat = Number(document.getElementById("pLat").value);
    durum.lon = Number(document.getElementById("pLon").value);
    durum.engel = Number(document.getElementById("pEngel").value);
    durum.bulut = Number(document.getElementById("pBulut").value);
    durum.kalib = Number(document.getElementById("pKalib").value);
    durum.fiyat = Number(document.getElementById("pFiyat").value);
    durum.maliyet = Number(document.getElementById("pMaliyet").value);
    durum.katsayi = Number(document.getElementById("pKatsayi").value);
    var pCam = document.getElementById("pCam");
    if (pCam && E) {
      durum.camId = pCam.value;
      durum.shgc = E.camBul(durum.camId).shgc;
    }
    var pWebhook = document.getElementById("pWebhook");
    if (pWebhook) durum.webhook = pWebhook.value.trim();
  }

  function etiketGuncelle() {
    var b = S.binaBul(durum.binaId);
    var yer = durum.yer || b.yer;
    var ad = durum.yerAd || b.ad;
    if (markaUst) markaUst.textContent = (yer.split(",")[0] || "Konum") + " · Şehir verisi";
    if (markaAlt) {
      markaAlt.textContent = ad + " · " + yer +
        (durum.binaId === "is-kuleleri" && !durum.yerAd ? " · OSM 3B" : " · sayısal model");
    }
    if (panelBaslik) panelBaslik.textContent = ad + " · tüm camlar";
    if (konumAra && durum.yerAd) konumAra.value = durum.yerAd;
  }

  function binaUygula(id, koruOzel) {
    var b = S.binaBul(id);
    durum.binaId = b.id;
    if (!(koruOzel && id === "ozel")) {
      durum.lat = b.lat;
      durum.lon = b.lon;
      durum.normal = b.normal;
      durum.sacak = b.sacak;
      durum.ek = b.ek;
      durum.pencere = b.pencere;
      durum.daire = b.daire;
      durum.guc = b.guc;
      durum.engel = b.engel;
      durum.bulut = b.bulut;
      if (id !== "ozel") {
        durum.yerAd = "";
        durum.yer = "";
        if (konumAra) konumAra.value = "";
      }
    }
    etiketGuncelle();
    formDoldur();
  }

  function konumUygula(secim) {
    if (!secim || !isFinite(secim.lat) || !isFinite(secim.lon)) return;
    durum.lat = Math.round(secim.lat * 1e6) / 1e6;
    durum.lon = Math.round(secim.lon * 1e6) / 1e6;
    durum.yerAd = secim.ad || S.kisaltAd(secim.yer) || "Seçilen konum";
    durum.yer = secim.yer || durum.yerAd;
    durum.binaId = "ozel";
    if (binaSec) binaSec.value = "ozel";
    formDoldur();
    etiketGuncelle();
    if (konumSonuc) {
      konumSonuc.innerHTML = "";
      konumSonuc.hidden = true;
    }
    if (konumDurum) {
      konumDurum.textContent = durum.yerAd + " · " + durum.lat.toFixed(5) + ", " + durum.lon.toFixed(5);
    }
    ciz();
  }

  function konumSonucGoster(liste) {
    if (!konumSonuc) return;
    konumSonuc.innerHTML = "";
    if (!liste || !liste.length) {
      konumSonuc.hidden = true;
      if (konumDurum) konumDurum.textContent = "Sonuç bulunamadı · farklı bir adres dene";
      return;
    }
    liste.forEach(function (item) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = "<strong>" + item.ad + "</strong>" + item.yer;
      btn.addEventListener("click", function () { konumUygula(item); });
      li.appendChild(btn);
      konumSonuc.appendChild(li);
    });
    konumSonuc.hidden = false;
    if (konumDurum) konumDurum.textContent = liste.length + " sonuç · birini seç";
  }

  function konumAraBaslat() {
    var q = konumAra ? konumAra.value : "";
    if (konumDurum) konumDurum.textContent = "Aranıyor…";
    S.adresAra(q).then(konumSonucGoster).catch(function (e) {
      if (konumSonuc) { konumSonuc.hidden = true; konumSonuc.innerHTML = ""; }
      if (konumDurum) konumDurum.textContent = e.message || "Arama başarısız";
    });
  }

  function senaryoListeYenile() {
    if (!senaryoListe) return;
    var liste = S.okuListe();
    senaryoListe.innerHTML = "";
    if (!liste.length) {
      var o = document.createElement("option");
      o.value = "";
      o.textContent = "Kayıt yok";
      senaryoListe.appendChild(o);
      return;
    }
    liste.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.ad + " · " + new Date(s.tarih).toLocaleDateString("tr-TR");
      senaryoListe.appendChild(o);
    });
  }

  function kurBinalar() {
    S.BINALAR.forEach(function (b) {
      var o = document.createElement("option");
      o.value = b.id;
      o.textContent = b.ad + " — " + b.yer;
      binaSec.appendChild(o);
    });
  }

  function kurSerit() {
    var t;
    for (t = 6; t <= 20.001; t += 0.25) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.saat = String(Math.round(t * 4) / 4);
      b.title = G.saatYazi(t);
      b.addEventListener("click", function () {
        durum.saat = Number(this.dataset.saat);
        saatGirdi.value = String(durum.saat);
        ciz();
      });
      seritGun.appendChild(b);
      dilimler.push(b);
    }
  }

  function kurAylar() {
    G.AYLAR.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = m.ad;
      b.addEventListener("click", function () {
        ay = m;
        ciz();
      });
      aylar.appendChild(b);
    });
  }

  function saatAralikta(saat, aralik) {
    return saat >= aralik[0] && saat < aralik[1];
  }

  function programKur(ciplak, simdi) {
    if (!programDurum || !programListe) return;
    programListe.innerHTML = "";

    if (!ciplak.length) {
      programDurum.textContent = "Bugün saçak açmaya gerek yok";
      programDurum.className = "program-durum kapali";
      if (programSonraki) programSonraki.textContent = "Doğrudan güneş camı ısıtmıyor.";
      return null;
    }

    var simdiAcik = ciplak.some(function (a) { return saatAralikta(simdi, a); });
    var aktif = null;
    var i;
    for (i = 0; i < ciplak.length; i++) {
      if (saatAralikta(simdi, ciplak[i])) { aktif = ciplak[i]; break; }
    }

    ciplak.forEach(function (a, idx) {
      var liAc = document.createElement("li");
      liAc.innerHTML = '<span class="etiket">Aç</span><strong>' + G.saatYazi(a[0]) + "</strong>";
      programListe.appendChild(liAc);
      var liKap = document.createElement("li");
      liKap.innerHTML = '<span class="etiket kapat">Kapat</span><strong>' + G.saatYazi(a[1]) +
        "</strong> <span style=\"color:var(--soluk);font-size:12px\">· dilim " + (idx + 1) + "</span>";
      programListe.appendChild(liKap);
    });

    if (simdiAcik && aktif) {
      programDurum.textContent = "Şimdi saçağı AÇIK tut · kapanış " + G.saatYazi(aktif[1]);
      programDurum.className = "program-durum ac";
      if (programSonraki) {
        programSonraki.textContent = "Açık aralık: " + G.saatYazi(aktif[0]) + "–" + G.saatYazi(aktif[1]) +
          (durum.sacakVar ? " · saçak şu an açık" : " · henüz açılmadı");
      }
    } else {
      var sonraki = null;
      for (i = 0; i < ciplak.length; i++) {
        if (simdi < ciplak[i][0]) { sonraki = ciplak[i]; break; }
      }
      if (sonraki) {
        programDurum.textContent = "Saçağı " + G.saatYazi(sonraki[0]) + " gibi aç";
        programDurum.className = "program-durum ac";
        if (programSonraki) {
          programSonraki.textContent = "Açık kalacak: " + G.saatYazi(sonraki[0]) + "–" + G.saatYazi(sonraki[1]);
        }
      } else {
        programDurum.textContent = "Bugünün saçak pencereleri bitti";
        programDurum.className = "program-durum kapali";
        if (programSonraki) {
          programSonraki.textContent = "İlk açılış sabah " + G.saatYazi(ciplak[0][0]) + " idi.";
        }
      }
    }

    return {
      simdiAcik: simdiAcik,
      araliklar: ciplak,
      aktif: aktif
    };
  }

  function programBildir(prog, ayAd) {
    if (!prog || !prog.simdiAcik || durum.sacakVar) return;
    var anahtar = ayAd + "-" + (prog.aktif ? prog.aktif[0] : "");
    if (anahtar === sonBildirimAnahtar) return;
    sonBildirimAnahtar = anahtar;
    var baslik = "Saçağı aç";
    var govde = ayAd + " · " + G.saatYazi(prog.aktif[0]) + "–" + G.saatYazi(prog.aktif[1]) +
      " arasında saçak açık olmalı.";
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      try { new Notification(baslik, { body: govde, tag: "golge-sacak" }); } catch (e) {}
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (p) {
        if (p === "granted") {
          try { new Notification(baslik, { body: govde, tag: "golge-sacak" }); } catch (e) {}
        }
      });
    }
  }

  function karsilastirCiz() {
    var tb = document.querySelector("#karsilastirTablo tbody");
    if (!tb || !E) return;
    var liste = E.sacakKarsilastir(G, durum, ay.gun);
    tb.innerHTML = "";
    liste.forEach(function (row) {
      var tr = document.createElement("tr");
      if (Math.round(durum.ek * 100) === row.cm) tr.className = "secili";
      tr.innerHTML = "<td>" + row.cm + " cm</td><td>" +
        row.gunlukFark.toFixed(1).replace(".", ",") + " sa</td><td>" +
        Math.round(row.yilKwh).toLocaleString("tr-TR") + "</td><td>" +
        Math.round(row.yilTl).toLocaleString("tr-TR") + "</td><td></td>";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Seç";
      btn.addEventListener("click", function () {
        durum.ek = row.ek;
        document.getElementById("pEk").value = String(row.cm);
        durum.binaId = "ozel";
        if (binaSec) binaSec.value = "ozel";
        ciz();
      });
      tr.lastChild.appendChild(btn);
      tb.appendChild(tr);
    });
  }

  function kisUyariCiz() {
    var el = document.getElementById("kisUyari");
    if (!el || !E) return;
    var u = E.kisUyarisi(G, durum);
    if (u.aktif) {
      el.hidden = false;
      el.textContent = u.metin;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function olculenKalibre() {
    var el = document.getElementById("pOlculen");
    if (!el || el.value === "") return;
    var olculen = Number(el.value);
    if (!isFinite(olculen)) return;
    gunesAyarla();
    G.ayarla({ kalibrasyonSaat: 0 });
    var model = G.gunlukSaat(ay.gun, durum.sacak, durum.normal);
    durum.kalib = Math.round((olculen - model) * 10) / 10;
    document.getElementById("pKalib").value = String(durum.kalib);
    if (kalibNot) {
      kalibNot.textContent = "Kalibrasyon " + durum.kalib + " sa/gün · model " +
        model.toFixed(1) + " → ölçülen " + olculen.toFixed(1);
    }
  }

  function ciz() {
    formOku();
    gunesAyarla();

    var gunes = G.konum(ay.gun, durum.saat);
    saatYazi.textContent = G.saatYazi(durum.saat);
    konumYazi.textContent =
      "Güneş  " + gunes.yukseklik.toFixed(0) + "°  ·  azimut  " + gunes.azimut.toFixed(0) + "°  ·  " +
      durum.lat.toFixed(2) + "°N";
    pusulaGuncelle(gunes.azimut);

    B.ayarla({
      gun: ay.gun,
      saat: durum.saat,
      sacakVar: durum.sacakVar,
      gunes: gunes,
      sacakTaban: durum.sacak,
      sacakEk: durum.ek
    });

    var ciplak = G.araliklar(ay.gun, durum.sacak, durum.normal);
    var ortulu = G.araliklar(ay.gun, durum.sacak + durum.ek, durum.normal);
    var saatCiplakGoster = G.saatToplam(ciplak);
    var saatOrtuluGoster = G.saatToplam(ortulu);
    var fark = Math.max(0, saatCiplakGoster - saatOrtuluGoster);

    var yil = G.yillikEtki(durum.sacak, durum.sacak + durum.ek, durum.normal, {
      guc: durum.guc,
      daire: durum.daire,
      katsayi: durum.katsayi,
      fiyat: durum.fiyat,
      shgc: durum.shgc
    });
    var rapor = raporKur(fark, yil);
    karsilastirCiz();
    kisUyariCiz();

    ciplakSaat.textContent = saatCiplakGoster.toFixed(1).replace(".", ",") + " sa";
    sacakSaat.textContent = saatOrtuluGoster.toFixed(1).replace(".", ",") + " sa";
    farkSaat.textContent = fark.toFixed(1).replace(".", ",") + " sa";
    yilKwh.textContent = Math.round(yil.yilKwh).toLocaleString("tr-TR") + " kWh";
    if (sacakEtiketSayi) sacakEtiketSayi.textContent = ekCm() + " cm saçak";
    if (yilEtiket) yilEtiket.textContent = "~" + yil.sicakGun + " sıcak gün";
    karbon.textContent =
      "Brüt " + Math.round(yil.yilCo2).toLocaleString("tr-TR") + " kg CO₂ / yıl  ·  " +
      Math.round(yil.yilTl).toLocaleString("tr-TR") + " TL / yıl";
    if (netEtkiEl) {
      netEtkiEl.textContent =
        "Net " + Math.round(yil.netKwh).toLocaleString("tr-TR") + " kWh / yıl  ·  " +
        Math.round(yil.netCo2).toLocaleString("tr-TR") + " kg CO₂  ·  " +
        Math.round(yil.netTl).toLocaleString("tr-TR") + " TL  " +
        "(ayak izi −" + Math.round(yil.aracKwh + yil.motorKwh) +
        " · sıçrama −" + Math.round(yil.sicramaKwh) + " kWh)";
    }
    if (maliyetYazi) {
      maliyetYazi.textContent = durum.maliyet > 0
        ? "Yatırım " + durum.maliyet.toLocaleString("tr-TR") + " TL → geri ödeme ~" + rapor.geriOdeme
        : "Yatırım girilmedi · geri ödeme hesaplanamaz";
    }
    if (rakamKaynak) {
      rakamKaynak.textContent =
        "Kaynak · Günlük fark: güneş/saçak modeli (" + durum.lat.toFixed(2) + "°N) · " +
        "Brüt ≈ " + fark.toFixed(1).replace(".", ",") + " sa × " +
        String(durum.guc).replace(".", ",") + " kW × " + durum.daire +
        " daire × ~" + yil.sicakGun + " sıcak gün (SHGC " +
        (durum.shgc != null ? String(durum.shgc).replace(".", ",") : "0,65") + ") · " +
        "Net = brüt − " + yil.aracKwh + "−" + yil.motorKwh +
        " (araç/IoT) − %" + Math.round(yil.sicramaOran * 100) +
        " sıçrama · CO₂: " + String(durum.katsayi).replace(".", ",") +
        " kg/kWh · OSM + Open-Meteo · etki.html";
    }

    var dCiplak = camDerece(gunes, durum.sacak);
    var dSacak = camDerece(gunes, durum.sacak + durum.ek);
    var dSimdi = durum.sacakVar ? dSacak : dCiplak;
    var dFark = Math.max(0, dCiplak - dSacak);
    var pct = dereceYuzde(dSimdi);
    if (dereceYazi) dereceYazi.textContent = dSimdi.toFixed(1).replace(".", ",") + "°";
    var TdisGoster = durum.havaSicaklik != null && isFinite(durum.havaSicaklik)
      ? durum.havaSicaklik
      : tahminiHava(ay.gun, durum.saat);
    var dereceMin = document.getElementById("dereceMin");
    var dereceMid = document.getElementById("dereceMid");
    var dereceMax = document.getElementById("dereceMax");
    var dereceNot = document.getElementById("dereceNot");
    if (dereceMin) dereceMin.textContent = Math.round(TdisGoster - 2) + "°";
    if (dereceMid) dereceMid.textContent = Math.round(TdisGoster + 7) + "°";
    if (dereceMax) dereceMax.textContent = Math.round(TdisGoster + 18) + "°";
    if (dereceNot) {
      dereceNot.textContent = "Dış hava ~" + TdisGoster.toFixed(0).replace(".", ",") +
        "°C · saçak farkı " + dFark.toFixed(1).replace(".", ",") +
        "° (SHGC " + (durum.shgc != null ? durum.shgc : 0.65) + ")";
    }
    if (dereceDolgu) {
      dereceDolgu.style.width = pct + "%";
      dereceDolgu.classList.toggle("soguk", dSimdi < TdisGoster + 4);
      dereceDolgu.classList.toggle("ilik", dSimdi >= TdisGoster + 4 && dSimdi < TdisGoster + 10);
      dereceDolgu.classList.toggle("sicak", dSimdi >= TdisGoster + 10);
    }
    if (dereceIsaret) dereceIsaret.style.left = pct + "%";
    if (dereceCiplak) dereceCiplak.textContent = dCiplak.toFixed(1).replace(".", ",") + "°";
    if (dereceSacak) dereceSacak.textContent = dSacak.toFixed(1).replace(".", ",") + "°";
    if (dereceFark) dereceFark.textContent = "−" + dFark.toFixed(1).replace(".", ",") + "°";
    document.body.classList.toggle("derece-dusuk", durum.sacakVar && dFark > 0.8);

    var sonra = ortulu.length ? G.aralikYazi(ortulu) : "pencereye inmez";
    var bina = S.binaBul(durum.binaId);
    var sira = (B.BOLME || 8) + " cam sırasının tamamı";
    if (durum.sacakVar) {
      cumle.textContent = ekCm() + " cm saçak " + sira + " üzerinde açık. Güneş aralığı: " + sonra + ". " + (bina.not || "");
    } else {
      cumle.textContent = ay.ad + " · " + sira + " çıplak: " + G.aralikYazi(ciplak) +
        ". +" + ekCm() + " cm saçak bunu " + sonra + " aralığına indirir.";
    }

    var prog = programKur(ciplak, durum.saat);
    programBildir(prog, ay.ad);
    cihazOtomatikSur(prog);

    sacakDugme.setAttribute("aria-pressed", durum.sacakVar ? "true" : "false");
    sacakDugme.querySelector(".sacak-etiket").textContent =
      durum.sacakVar ? "Tüm saçakları kaldır" : ("Tüm camlara " + ekCm() + " cm saçak");
    if (prog && prog.simdiAcik && !durum.sacakVar) {
      sacakDugme.querySelector(".sacak-ipucu").textContent =
        "Şimdi aç · " + G.saatYazi(prog.aktif[0]) + "–" + G.saatYazi(prog.aktif[1]);
    } else if (prog && !prog.simdiAcik && prog.araliklar.length) {
      var sonrakiAc = null;
      prog.araliklar.forEach(function (a) {
        if (durum.saat < a[0] && sonrakiAc == null) sonrakiAc = a;
      });
      sacakDugme.querySelector(".sacak-ipucu").textContent = sonrakiAc
        ? "Sonraki açılış " + G.saatYazi(sonrakiAc[0])
        : (durum.sacakVar ? "Camlar soğudu · gölge uzadı" : "Bugün bitti");
    } else {
      sacakDugme.querySelector(".sacak-ipucu").textContent =
        durum.sacakVar ? "Camlar soğudu · gölge uzadı" : "Klima saatini geciktir";
    }
    if (durumYazi) {
      if (prog && prog.simdiAcik && !durum.sacakVar) {
        durumYazi.textContent = "Saçağı aç · " + G.saatYazi(prog.aktif[0]) + "–" + G.saatYazi(prog.aktif[1]);
        durumYazi.classList.add("aktif");
      } else {
        durumYazi.textContent = durum.sacakVar ? (ekCm() + " cm saçak aktif") : "Çıplak cam";
        durumYazi.classList.toggle("aktif", durum.sacakVar);
      }
    }
    document.body.classList.toggle("sacak-aktif", durum.sacakVar);
    document.body.classList.toggle("sacak-gerekli", !!(prog && prog.simdiAcik && !durum.sacakVar));

    dilimler.forEach(function (b) {
      var an = Number(b.dataset.saat);
      var g = G.konum(ay.gun, an);
      var acGerek = G.sicakMi(g, durum.sacak, durum.normal);
      b.classList.toggle("sicak", G.sicakMi(g, sacakMetre(), durum.normal));
      b.classList.toggle("ac", acGerek);
      b.classList.toggle("simdi", Math.round(an * 4) === Math.round(durum.saat * 4));
      b.title = G.saatYazi(an) + (acGerek ? " · saçak açık olmalı" : "");
    });

    Array.prototype.forEach.call(aylar.children, function (b, i) {
      b.setAttribute("aria-pressed", G.AYLAR[i].id === ay.id ? "true" : "false");
    });
  }

  var harita = null;
  var haritaIsaret = null;
  var demoZamanlayici = [];
  var demoCalisiyor = false;

  function haritaGuncelle() {
    if (!harita || typeof L === "undefined") return;
    harita.setView([durum.lat, durum.lon], harita.getZoom() || 16);
    if (haritaIsaret) haritaIsaret.setLatLng([durum.lat, durum.lon]);
    else haritaIsaret = L.marker([durum.lat, durum.lon]).addTo(harita);
  }

  function haritaKur() {
    var el = document.getElementById("harita");
    if (!el || typeof L === "undefined") {
      var not = document.getElementById("haritaNot");
      if (not) not.textContent = "Harita yüklenemedi · internet / Leaflet gerekir.";
      return;
    }
    harita = L.map(el, { zoomControl: true, attributionControl: true }).setView([durum.lat, durum.lon], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(harita);
    haritaIsaret = L.marker([durum.lat, durum.lon]).addTo(harita);
    harita.on("click", function (e) {
      konumUygula({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        ad: "Harita konumu",
        yer: e.latlng.lat.toFixed(5) + ", " + e.latlng.lng.toFixed(5)
      });
      var hn = document.getElementById("haritaNot");
      if (hn) hn.textContent = "Konum seçildi · OSM cephe yönünü deneyebilirsin.";
    });
    document.querySelector(".harita-katman").addEventListener("toggle", function () {
      if (this.open) setTimeout(function () { harita.invalidateSize(); }, 120);
    });
  }

  function kurCamlar() {
    var pCam = document.getElementById("pCam");
    if (!pCam || !E) return;
    E.CAM_TIPLERI.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.ad + " · SHGC " + c.shgc;
      pCam.appendChild(o);
    });
    pCam.value = durum.camId;
    pCam.addEventListener("change", function () {
      durum.camId = pCam.value;
      durum.shgc = E.camBul(durum.camId).shgc;
      ciz();
    });
  }

  function demoDurdur() {
    demoCalisiyor = false;
    demoZamanlayici.forEach(clearTimeout);
    demoZamanlayici = [];
    document.body.classList.remove("demo-aktif");
    var perde = document.getElementById("demoPerde");
    if (perde) perde.hidden = true;
  }

  function demoBaslat() {
    demoDurdur();
    demoCalisiyor = true;
    document.body.classList.add("demo-aktif");
    var perde = document.getElementById("demoPerde");
    var adimEl = document.getElementById("demoAdim");
    if (perde) perde.hidden = false;

    var adimlar = [
      { t: 0, metin: "Gölge Saati · cephede klima saatini kısaltır", fn: function () {
        binaUygula("is-kuleleri"); durum.saat = 14.5; durum.sacakVar = false; ay = G.AYLAR[2]; ciz();
      }},
      { t: 7000, metin: "Güneş camı ısıtıyor · çıplak cephe", fn: function () {
        durum.saat = 15; durum.sacakVar = false; ciz();
      }},
      { t: 14000, metin: "60 cm saçak · gölge uzar, cam soğur", fn: function () {
        durum.sacakVar = true; ciz();
      }},
      { t: 22000, metin: "Pusula: camın baktığı yön hesabı belirler", fn: function () {
        normalAyarla(225, "Demo: güneybatı cephe");
      }},
      { t: 30000, metin: "Saçak programı: ne zaman aç, ne zaman kapat", fn: function () {
        durum.sacakVar = false; durum.saat = 11; ciz();
      }},
      { t: 38000, metin: "Yıllık kWh, TL ve CO₂ · geri ödeme", fn: function () {
        durum.saat = 14.5; durum.sacakVar = true; ciz();
      }},
      { t: 46000, metin: "40–100 cm saçak seçeneklerini karşılaştır", fn: function () {
        var kutu = document.getElementById("sacakKarsilastir");
        if (kutu) kutu.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }},
      { t: 54000, metin: "Şehir verisi + gölge = ölçülebilir sürdürülebilirlik", fn: function () {
        durum.sacakVar = true; ciz();
      }},
      { t: 62000, metin: "", fn: function () { demoDurdur(); } }
    ];

    adimlar.forEach(function (a) {
      demoZamanlayici.push(setTimeout(function () {
        if (!demoCalisiyor) return;
        if (adimEl && a.metin) adimEl.textContent = a.metin;
        if (a.fn) a.fn();
      }, a.t));
    });
  }

  kurCamlar();
  kurBinalar();
  kurAylar();
  kurSerit();
  haritaKur();

  var urlDurum = S.urlOku();
  if (urlDurum && urlDurum.binaId) {
    durumUygula(urlDurum);
    binaUygula(durum.binaId, true);
    durumUygula(urlDurum);
  } else {
    binaUygula("is-kuleleri");
  }

  formDoldur();
  senaryoListeYenile();
  B.kur(kok);
  ciz();

  function bleDurumYaz(d) {
    if (!bleDurumEl) return;
    if (d.bagli) {
      bleDurumEl.textContent = "Bağlı · " + (d.ad || "saçak") + (d.kaynak ? " (" + d.kaynak + ")" : "");
      bleDurumEl.classList.add("bagli");
    } else {
      bleDurumEl.textContent = "Bağlı değil";
      bleDurumEl.classList.remove("bagli");
    }
  }

  function wifiDurumYaz(d) {
    if (!wifiDurumEl) return;
    if (d.url) {
      wifiDurumEl.textContent = (d.bagli ? "Çevrimiçi · " : "Kayıtlı · ") +
        (d.ad ? d.ad + " · " : "") + d.url +
        (d.sonDurum ? " · " + (d.sonDurum === "open" ? "AÇIK" : "KAPALI") : "");
      wifiDurumEl.classList.toggle("bagli", !!d.bagli);
    } else {
      wifiDurumEl.textContent = "Adres yok";
      wifiDurumEl.classList.remove("bagli");
    }
  }

  function bleKomut(action, sessiz) {
    if (!BLE || !BLE.durum.bagli) return Promise.resolve(null);
    return BLE.komutGonder(action).then(function (r) {
      if (bleNot && !sessiz) {
        bleNot.textContent = (action === "open" ? "Saçak AÇILDI" : "Saçak KAPANDI") +
          " · " + (r.kaynak || "");
      }
      return r;
    }).catch(function (e) {
      if (bleNot) bleNot.textContent = e.message || "Bluetooth komutu başarısız";
      return null;
    });
  }

  function wifiKomut(action, sessiz) {
    if (!WIFI || !WIFI.durum.url) return Promise.resolve(null);
    return WIFI.komutGonder(action).then(function (r) {
      wifiDurumYaz(WIFI.durum);
      if (wifiNot && !sessiz) {
        wifiNot.textContent = (action === "open" ? "Wi‑Fi saçak AÇILDI" : action === "close" ? "Wi‑Fi saçak KAPANDI" : "Durum alındı") +
          " · " + WIFI.durum.url;
      }
      return r;
    }).catch(function (e) {
      wifiDurumYaz(WIFI.durum);
      if (wifiNot) wifiNot.textContent = e.message || "Wi‑Fi komutu başarısız";
      return null;
    });
  }

  // Önce Wi‑Fi, olmazsa Bluetooth
  function cihazKomut(action, sessiz) {
    return wifiKomut(action, sessiz).then(function (r) {
      if (r) return r;
      return bleKomut(action, sessiz);
    });
  }

  function cihazOtomatikSur(prog) {
    if (!prog) return;
    var hedef = prog.simdiAcik ? "open" : "close";
    var wifiOk = WIFI && WIFI.durum.url && WIFI.durum.otomatik;
    var bleOk = BLE && BLE.durum.bagli && BLE.durum.otomatik;
    if (!wifiOk && !bleOk) return;

    if (wifiOk) {
      if (sonWifiOtomatik === hedef) {
        /* wifi already sent */
      } else {
        sonWifiOtomatik = hedef;
        wifiKomut(hedef, false).then(function (r) {
          if (!r) return;
          if (hedef === "open" && !durum.sacakVar) { durum.sacakVar = true; ciz(); }
          else if (hedef === "close" && durum.sacakVar) { durum.sacakVar = false; ciz(); }
        });
      }
    }
    if (bleOk) {
      if (sonBleOtomatik === hedef) return;
      sonBleOtomatik = hedef;
      bleKomut(hedef, false).then(function (r) {
        if (!r) return;
        if (hedef === "open" && !durum.sacakVar) { durum.sacakVar = true; ciz(); }
        else if (hedef === "close" && durum.sacakVar) { durum.sacakVar = false; ciz(); }
      });
    }
  }

  if (BLE) {
    BLE.onDurum(bleDurumYaz);
    bleDurumYaz(BLE.durum);
  }
  if (WIFI) {
    WIFI.onDurum(wifiDurumYaz);
    wifiDurumYaz(WIFI.durum);
    var pWifiUrl = document.getElementById("pWifiUrl");
    if (pWifiUrl) pWifiUrl.value = WIFI.durum.url.replace(/^https?:\/\//i, "");
    var wifiOtomatikEl = document.getElementById("wifiOtomatik");
    if (wifiOtomatikEl) wifiOtomatikEl.checked = WIFI.durum.otomatik;
  }

  sacakDugme.addEventListener("click", function () {
    durum.sacakVar = !durum.sacakVar;
    cihazKomut(durum.sacakVar ? "open" : "close", false);
    ciz();
  });
  saatGirdi.addEventListener("input", function () {
    durum.saat = Number(saatGirdi.value);
    ciz();
  });
  binaSec.addEventListener("change", function () {
    binaUygula(binaSec.value);
    ciz();
  });

  Object.keys(alanlar).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", function () {
      if (id === "pLat" || id === "pLon" || id === "pNormal" || id === "pEk" || id === "pSacak") {
        durum.binaId = "ozel";
        binaSec.value = "ozel";
      }
      ciz();
    });
  });

  document.getElementById("pOlculen").addEventListener("change", function () {
    olculenKalibre();
    ciz();
  });

  if (pusulaYonler) {
    pusulaYonler.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-yon]");
      if (!b) return;
      normalAyarla(b.dataset.yon, "Cam " + yonAdi(Number(b.dataset.yon)) + " yönüne bakıyor.");
    });
  }

  if (pusula) {
    pusula.addEventListener("pointerdown", function (e) {
      pusulaSurukleniyor = true;
      pusula.setPointerCapture(e.pointerId);
      normalAyarla(pusulaAcidan(e.clientX, e.clientY), "Cam yönü pusuladan ayarlandı.");
    });
    pusula.addEventListener("pointermove", function (e) {
      if (!pusulaSurukleniyor) return;
      normalAyarla(pusulaAcidan(e.clientX, e.clientY), "Cam yönü pusuladan ayarlandı.");
    });
    function pusulaBirak(e) {
      if (!pusulaSurukleniyor) return;
      pusulaSurukleniyor = false;
      try { pusula.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    pusula.addEventListener("pointerup", pusulaBirak);
    pusula.addEventListener("pointercancel", pusulaBirak);
    pusula.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        normalAyarla(durum.normal - 5, "Cam yönü klavye ile ayarlandı.");
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        normalAyarla(durum.normal + 5, "Cam yönü klavye ile ayarlandı.");
      }
    });
  }

  document.getElementById("btnCihazPusula").addEventListener("click", function () {
    function dinle() {
      if (pusulaNot) pusulaNot.textContent = "Cihazı cama paralel tut · pusula okuyor…";
      window.addEventListener("deviceorientationabsolute", onOri, true);
      window.addEventListener("deviceorientation", onOri, true);
    }
    function onOri(e) {
      var heading = null;
      if (typeof e.webkitCompassHeading === "number") heading = e.webkitCompassHeading;
      else if (typeof e.alpha === "number") {
        // alpha: cihazın Z etrafı; absolute ise 0≈kuzey. Cam yönü ≈ cihazın baktığı yön.
        heading = e.absolute === false ? (360 - e.alpha) : (360 - e.alpha);
      }
      if (heading == null || !isFinite(heading)) return;
      window.removeEventListener("deviceorientationabsolute", onOri, true);
      window.removeEventListener("deviceorientation", onOri, true);
      normalAyarla(heading, "Cihaz pusulası: cam " + yonAdi(heading) + " (" + normalNormalize(heading) + "°).");
    }
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === "granted") dinle();
        else if (pusulaNot) pusulaNot.textContent = "Pusula izni reddedildi.";
      }).catch(function () {
        if (pusulaNot) pusulaNot.textContent = "Pusula izni alınamadı.";
      });
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      dinle();
      setTimeout(function () {
        if (pusulaNot && /pusula okuyor/.test(pusulaNot.textContent || "")) {
          pusulaNot.textContent = "Cihaz pusulası yok · K/D/G/B düğmelerini veya pusulayı kullan.";
        }
      }, 3500);
    } else if (pusulaNot) {
      pusulaNot.textContent = "Bu cihazda pusula yok · yön düğmelerini kullan.";
    }
  });

  document.getElementById("btnKonumAra").addEventListener("click", konumAraBaslat);
  if (konumAra) {
    konumAra.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        konumAraBaslat();
      }
    });
  }

  document.getElementById("btnKonumGps").addEventListener("click", function () {
    if (konumDurum) konumDurum.textContent = "Konum isteniyor… (izin ver)";
    S.konumumuAl().then(function (pos) {
      if (pos.ad && pos.kaynak === "ip") {
        konumUygula(pos);
        if (konumDurum) {
          konumDurum.textContent = "Yaklaşık IP konumu kullanıldı" +
            (pos.uyari ? " · GPS: " + pos.uyari : "") +
            " · " + pos.lat.toFixed(4) + ", " + pos.lon.toFixed(4);
        }
        return null;
      }
      return S.tersGeocode(pos.lat, pos.lon).catch(function () {
        return {
          lat: pos.lat,
          lon: pos.lon,
          ad: pos.kaynak === "mac" ? "Mac konum" : "GPS konum",
          yer: pos.lat.toFixed(5) + ", " + pos.lon.toFixed(5)
        };
      }).then(function (secim) {
        konumUygula(secim);
        if (konumDurum) {
          konumDurum.textContent = (secim.ad || "Konum") + " · " +
            pos.lat.toFixed(5) + ", " + pos.lon.toFixed(5) +
            (pos.kaynak ? " · " + pos.kaynak : "");
        }
      });
    }).catch(function (e) {
      if (konumDurum) konumDurum.textContent = e.message || "Konum alınamadı";
    });
  });

  document.getElementById("btnKaydet").addEventListener("click", function () {
    var ad = document.getElementById("senaryoAd").value.trim();
    S.kaydet(ad, durumPaket());
    senaryoListeYenile();
    if (paylasNot) paylasNot.textContent = "Senaryo kaydedildi.";
  });

  document.getElementById("btnPaylas").addEventListener("click", function () {
    var url = S.urlYaz(durumPaket());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (paylasNot) paylasNot.textContent = "Bağlantı panoya kopyalandı.";
      }).catch(function () {
        if (paylasNot) paylasNot.textContent = url;
      });
    } else if (paylasNot) {
      paylasNot.textContent = url;
    }
  });

  document.getElementById("btnCsv").addEventListener("click", function () {
    ciz();
    if (!sonRapor) return;
    S.indir("golge-saati-" + durum.binaId + ".csv", S.csvUret(sonRapor), "text/csv;charset=utf-8");
    if (paylasNot) paylasNot.textContent = "CSV indirildi.";
  });

  document.getElementById("btnPdf").addEventListener("click", function () {
    ciz();
    if (!sonRapor) return;
    var ok = S.pdfYazdir(sonRapor);
    if (paylasNot) paylasNot.textContent = ok ? "Yazdır penceresi açıldı · PDF olarak kaydedebilirsin." : "Açılır pencere engellendi.";
  });

  document.getElementById("btnYukle").addEventListener("click", function () {
    var id = senaryoListe.value;
    var kayit = S.okuListe().filter(function (s) { return s.id === id; })[0];
    if (!kayit) return;
    durumUygula(kayit.durum);
    formDoldur();
    ciz();
    if (paylasNot) paylasNot.textContent = "Yüklendi: " + kayit.ad;
  });

  document.getElementById("btnSil").addEventListener("click", function () {
    if (!senaryoListe.value) return;
    S.sil(senaryoListe.value);
    senaryoListeYenile();
    if (paylasNot) paylasNot.textContent = "Silindi.";
  });

  document.getElementById("btnIcal").addEventListener("click", function () {
    ciz();
    var ciplak = G.araliklar(ay.gun, durum.sacak, durum.normal);
    if (!ciplak.length) {
      if (paylasNot) paylasNot.textContent = "Bu ay için saçak aralığı yok.";
      return;
    }
    var ics = E.icalUret({
      baslik: "Saçak · " + (durum.yerAd || S.binaBul(durum.binaId).ad),
      araliklar: ciplak,
      gunSay: 14,
      lat: durum.lat,
      lon: durum.lon
    });
    S.indir("golge-saati-sacak.ics", ics, "text/calendar;charset=utf-8");
    if (paylasNot) paylasNot.textContent = "14 günlük saçak takvimi indirildi.";
  });

  document.getElementById("btnHava").addEventListener("click", function () {
    var hd = document.getElementById("havaDurum");
    if (hd) hd.textContent = "Hava alınıyor…";
    E.havaCek(durum.lat, durum.lon).then(function (h) {
      durum.bulut = h.bulut;
      if (h.sicaklik != null && isFinite(h.sicaklik)) durum.havaSicaklik = h.sicaklik;
      document.getElementById("pBulut").value = String(h.bulut);
      if (hd) {
        hd.textContent = "Bugün " +
          (h.sicaklik != null ? Math.round(h.sicaklik) + "°C" : "—") +
          " · bulut %" + Math.round(h.bulutHam || h.bulut * 100) +
          " · model bulut " + h.bulut +
          (h.max != null ? " · max " + Math.round(h.max) + "°C" : "");
      }
      ciz();
    }).catch(function (e) {
      if (hd) hd.textContent = e.message || "Hava alınamadı";
    });
  });

  // Açılışta sessizce gerçek hava al (derece modeli için)
  if (E && E.havaCek) {
    E.havaCek(durum.lat, durum.lon).then(function (h) {
      if (h.sicaklik != null && isFinite(h.sicaklik)) durum.havaSicaklik = h.sicaklik;
      if (h.bulut != null) {
        durum.bulut = h.bulut;
        var pb = document.getElementById("pBulut");
        if (pb) pb.value = String(h.bulut);
      }
      var hd0 = document.getElementById("havaDurum");
      if (hd0 && h.sicaklik != null) {
        hd0.textContent = "Bugün ~" + Math.round(h.sicaklik) + "°C · bulut %" +
          Math.round(h.bulutHam || h.bulut * 100) + " (otomatik)";
      }
      ciz();
    }).catch(function () {});
  }

  document.getElementById("btnHaritaCephe").addEventListener("click", function () {
    var hn = document.getElementById("haritaNot");
    if (hn) hn.textContent = "OSM bina kenarı okunuyor…";
    E.overpassBina(durum.lat, durum.lon).then(function (b) {
      if (b.normal != null) normalAyarla(b.normal, "OSM cephe ≈ " + yonAdi(b.normal) + " (" + b.normal + "°)");
      if (hn) hn.textContent = (b.ad || "Bina") + " · cephe " + (b.normal != null ? b.normal + "°" : "?");
    }).catch(function (e) {
      if (hn) hn.textContent = e.message || "Cephe alınamadı";
    });
  });

  function otoIslem(action) {
    formOku();
    var paket = E.otomasyonPaket(action, durum);
    var otoNot = document.getElementById("otoNot");
    var url = durum.webhook || document.getElementById("pWebhook").value.trim();
    durum.webhook = url;
    if (!url) {
      if (otoNot) otoNot.textContent = "JSON hazır · webhook yok. Konu: " + paket.topic;
      return paket;
    }
    if (otoNot) otoNot.textContent = "Gönderiliyor…";
    E.otomasyonGonder(url, paket).then(function () {
      if (otoNot) otoNot.textContent = "Gönderildi · " + paket.topic;
    }).catch(function (e) {
      if (otoNot) otoNot.textContent = e.message || "Gönderilemedi";
    });
    return paket;
  }

  document.getElementById("btnWifiTest").addEventListener("click", function () {
    if (!WIFI) return;
    var pWifiUrl = document.getElementById("pWifiUrl");
    WIFI.urlAyarla(pWifiUrl ? pWifiUrl.value : "");
    if (wifiNot) wifiNot.textContent = "Wi‑Fi deneniyor…";
    WIFI.testBaglantı().then(function () {
      wifiDurumYaz(WIFI.durum);
      if (wifiNot) wifiNot.textContent = "Bağlantı OK · " + WIFI.durum.url;
    }).catch(function (e) {
      wifiDurumYaz(WIFI.durum);
      if (wifiNot) wifiNot.textContent = e.message || "Bağlantı yok";
    });
  });
  document.getElementById("btnWifiAc").addEventListener("click", function () {
    var pWifiUrl = document.getElementById("pWifiUrl");
    if (WIFI && pWifiUrl) WIFI.urlAyarla(pWifiUrl.value);
    wifiKomut("open").then(function (r) {
      if (r && !durum.sacakVar) { durum.sacakVar = true; ciz(); }
    });
  });
  document.getElementById("btnWifiKapat").addEventListener("click", function () {
    var pWifiUrl = document.getElementById("pWifiUrl");
    if (WIFI && pWifiUrl) WIFI.urlAyarla(pWifiUrl.value);
    wifiKomut("close").then(function (r) {
      if (r && durum.sacakVar) { durum.sacakVar = false; ciz(); }
    });
  });
  var wifiOtomatik = document.getElementById("wifiOtomatik");
  if (wifiOtomatik && WIFI) {
    wifiOtomatik.addEventListener("change", function () {
      WIFI.otomatikAyarla(wifiOtomatik.checked);
      sonWifiOtomatik = null;
      if (wifiNot) wifiNot.textContent = wifiOtomatik.checked
        ? "Otomatik Wi‑Fi sürüş açık"
        : "Otomatik Wi‑Fi kapalı";
    });
  }
  var pWifiUrlInput = document.getElementById("pWifiUrl");
  if (pWifiUrlInput && WIFI) {
    pWifiUrlInput.addEventListener("change", function () {
      WIFI.urlAyarla(pWifiUrlInput.value);
      wifiDurumYaz(WIFI.durum);
    });
  }

  document.getElementById("btnBleBaglan").addEventListener("click", function () {
    if (!BLE) return;
    if (bleNot) bleNot.textContent = "Bluetooth taranıyor…";
    BLE.baglan().then(function (d) {
      bleDurumYaz(d);
      if (bleNot) {
        bleNot.textContent = d.kaynak === "sanal"
          ? "Sanal saçak bağlandı · demo komutları çalışır"
          : "Bağlandı · OPEN/CLOSE komutları hazır";
      }
    }).catch(function (e) {
      if (bleNot) bleNot.textContent = e.message || "Bağlanamadı";
    });
  });
  document.getElementById("btnBleKopar").addEventListener("click", function () {
    if (!BLE) return;
    BLE.kopar().then(function () {
      if (bleNot) bleNot.textContent = "Bağlantı kesildi";
    });
  });
  document.getElementById("btnBleAc").addEventListener("click", function () {
    bleKomut("open").then(function () {
      if (!durum.sacakVar) { durum.sacakVar = true; ciz(); }
    });
  });
  document.getElementById("btnBleKapat").addEventListener("click", function () {
    bleKomut("close").then(function () {
      if (durum.sacakVar) { durum.sacakVar = false; ciz(); }
    });
  });
  var bleOtomatik = document.getElementById("bleOtomatik");
  if (bleOtomatik && BLE) {
    bleOtomatik.addEventListener("change", function () {
      BLE.otomatikAyarla(bleOtomatik.checked);
      sonBleOtomatik = null;
      if (bleNot) bleNot.textContent = bleOtomatik.checked
        ? "Otomatik Bluetooth sürüş açık"
        : "Otomatik sürüş kapalı · sadece elle";
    });
  }

  document.getElementById("btnOtoAc").addEventListener("click", function () {
    otoIslem("open");
    cihazKomut("open", true);
  });
  document.getElementById("btnOtoKapat").addEventListener("click", function () {
    otoIslem("close");
    cihazKomut("close", true);
  });
  document.getElementById("btnOtoKopya").addEventListener("click", function () {
    var paket = E.otomasyonPaket(durum.sacakVar ? "open" : "close", durum);
    var txt = JSON.stringify(paket, null, 2);
    var otoNot = document.getElementById("otoNot");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        if (otoNot) otoNot.textContent = "JSON panoya kopyalandı · " + paket.topic;
      });
    } else if (otoNot) otoNot.textContent = txt;
  });

  document.getElementById("btnDemo").addEventListener("click", demoBaslat);
  document.getElementById("btnDemoDur").addEventListener("click", demoDurdur);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && demoCalisiyor) demoDurdur();
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.target && e.target.closest && e.target.closest("input, select, a, button, textarea")) return;
    durum.saat = Math.max(6, Math.min(20, durum.saat + (e.key === "ArrowRight" ? 0.25 : -0.25)));
    saatGirdi.value = String(durum.saat);
    ciz();
  });
})();
