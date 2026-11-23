(function (k) {
  var ayar = {
    lat: 41.01,
    lon: 29.0,
    normal: 238,
    pencere: 1.5,
    esik: 0.5,
    engel: 0,
    bulut: 0.15,
    kalibrasyonSaat: 0
  };

  var AYLAR = [
    { id: "ocak", ad: "Oca", gun: 15, gunSay: 31, sicak: 0 },
    { id: "subat", ad: "Şub", gun: 45, gunSay: 28, sicak: 0 },
    { id: "mart", ad: "Mar", gun: 74, gunSay: 31, sicak: 0.05 },
    { id: "nisan", ad: "Nis", gun: 105, gunSay: 30, sicak: 0.15 },
    { id: "mayis", ad: "May", gun: 135, gunSay: 31, sicak: 0.35 },
    { id: "haziran", ad: "Haz", gun: 166, gunSay: 30, sicak: 0.75 },
    { id: "temmuz", ad: "Tem", gun: 196, gunSay: 31, sicak: 1 },
    { id: "agustos", ad: "Ağu", gun: 227, gunSay: 31, sicak: 1 },
    { id: "eylul", ad: "Eyl", gun: 258, gunSay: 30, sicak: 0.7 },
    { id: "ekim", ad: "Eki", gun: 288, gunSay: 31, sicak: 0.25 },
    { id: "kasim", ad: "Kas", gun: 319, gunSay: 30, sicak: 0.05 },
    { id: "aralik", ad: "Ara", gun: 349, gunSay: 31, sicak: 0 }
  ];

  var YAZ_AYLARI = AYLAR.filter(function (m) {
    return m.id === "haziran" || m.id === "temmuz" || m.id === "agustos" || m.id === "eylul";
  });

  function sinir(n) {
    return Math.max(-1, Math.min(1, n));
  }

  function derece(rad) {
    return rad * 180 / Math.PI;
  }

  function ayarla(opts) {
    if (!opts) return;
    Object.keys(opts).forEach(function (k) {
      if (opts[k] != null && ayar[k] !== undefined) ayar[k] = Number(opts[k]);
    });
  }

  function konum(gun, saat) {
    var dec = 23.45 * Math.PI / 180 * Math.sin(2 * Math.PI / 365 * (gun - 81));
    var lat = ayar.lat * Math.PI / 180;
    // TRT = UTC+3 (yaz saati yok); standart meridyen 45°D · boylam düzeltmesi
    var saatAcisi = saat - 12 - (ayar.lon - 45) / 15;
    var H = Math.PI / 180 * 15 * saatAcisi;
    var sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
    var alt = Math.asin(sinir(sinAlt));
    var x = Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat);
    var azGuney = Math.atan2(Math.sin(H), x);
    var az = (Math.PI + azGuney + 2 * Math.PI) % (2 * Math.PI);
    return { yukseklik: derece(alt), azimut: derece(az) };
  }

  function golgeMetre(gunes, sacak, normal) {
    if (gunes.yukseklik <= 0) return { onde: false, golge: 0, pay: 0, engel: false };
    if (ayar.engel > 0 && gunes.yukseklik < ayar.engel) {
      return { onde: false, golge: 0, pay: 0, engel: true };
    }
    var yon = normal == null ? ayar.normal : normal;
    var gama = (gunes.azimut - yon) * Math.PI / 180;
    while (gama > Math.PI) gama -= 2 * Math.PI;
    while (gama < -Math.PI) gama += 2 * Math.PI;
    var onde = Math.cos(gama) > 0.05;
    if (!onde) return { onde: false, golge: 0, pay: 0, engel: false };
    var profil = Math.atan(Math.tan(gunes.yukseklik * Math.PI / 180) / Math.cos(gama));
    var golge = sacak * Math.tan(profil);
    if (!isFinite(golge) || golge < 0) golge = 0;
    var pay = Math.max(0, Math.min(1, 1 - golge / ayar.pencere));
    return { onde: true, golge: golge, pay: pay, engel: false };
  }

  function sicakMi(gunes, sacak, normal) {
    var g = golgeMetre(gunes, sacak, normal);
    return g.onde && g.pay > ayar.esik;
  }

  function saatYazi(saat) {
    var h = Math.floor(saat);
    var m = Math.round((saat - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    var mm = m < 10 ? "0" + m : String(m);
    return h + "." + mm;
  }

  function araliklar(gun, sacak, normal) {
    var acik = [];
    var bas = null;
    var adim = 1 / 6;
    var saat;
    for (saat = 5; saat <= 21.001; saat += adim) {
      var g = konum(gun, saat);
      var sicak = sicakMi(g, sacak, normal);
      if (sicak && bas === null) bas = saat;
      if (!sicak && bas !== null) {
        acik.push([bas, saat]);
        bas = null;
      }
    }
    if (bas !== null) acik.push([bas, 21]);
    return acik;
  }

  function saatToplam(liste) {
    var n = 0;
    var i;
    for (i = 0; i < liste.length; i++) n += liste[i][1] - liste[i][0];
    return n;
  }

  function aralikYazi(liste) {
    if (!liste.length) return "doğrudan güneş yok";
    return liste.map(function (a) { return saatYazi(a[0]) + "–" + saatYazi(a[1]); }).join(", ");
  }

  function gunlukSaat(gun, sacak, normal) {
    var ham = saatToplam(araliklar(gun, sacak, normal));
    var bulutKes = 1 - Math.max(0, Math.min(0.6, ayar.bulut));
    return Math.max(0, ham * bulutKes + ayar.kalibrasyonSaat);
  }

  function yillikEtki(sacakCiplak, sacakOrtulu, normal, opts) {
    opts = opts || {};
    var guc = opts.guc != null ? opts.guc : 1.2;
    var daire = opts.daire != null ? opts.daire : 5;
    var katsayi = opts.katsayi != null ? opts.katsayi : 0.4;
    var fiyat = opts.fiyat != null ? opts.fiyat : 3.5;
    var shgc = opts.shgc != null ? opts.shgc : 0.65;
    var shgcCarpan = shgc / 0.65;
    var toplamCiplak = 0;
    var toplamOrtulu = 0;
    var sicakGun = 0;
    var aylik = [];

    AYLAR.forEach(function (m) {
      var c = gunlukSaat(m.gun, sacakCiplak, normal);
      var o = gunlukSaat(m.gun, sacakOrtulu, normal);
      var fark = Math.max(0, c - o);
      var efektifGun = m.gunSay * m.sicak;
      var kwh = fark * guc * daire * efektifGun * shgcCarpan;
      toplamCiplak += c * efektifGun;
      toplamOrtulu += o * efektifGun;
      sicakGun += efektifGun;
      aylik.push({
        id: m.id, ad: m.ad, ciplak: c, ortulu: o, fark: fark,
        efektifGun: efektifGun, kwh: kwh
      });
    });

    var yilFarkSaat = Math.max(0, toplamCiplak - toplamOrtulu);
    var yilKwh = yilFarkSaat * guc * daire;
    // aylik already weighted by efektifGun inside kwh; recompute consistent:
    yilKwh = aylik.reduce(function (s, a) { return s + a.kwh; }, 0);

    var brutKwh = yilKwh;
    // Araç ayak izi: yerel istemci + seyrek API (~5 kWh/yıl) + opsiyonel IoT motor (~2)
    var aracKwh = opts.aracKwh != null ? opts.aracKwh : 5;
    var motorKwh = opts.motorKwh != null ? opts.motorKwh : 2;
    // Sıçrama: kazanımın bir kısmı konfor/setpoint ile geri alınır (varsayılan %5)
    var sicramaOran = opts.sicramaOran != null ? opts.sicramaOran : 0.05;
    var sicramaKwh = brutKwh * sicramaOran;
    var netKwh = Math.max(0, brutKwh - aracKwh - motorKwh - sicramaKwh);
    var netCo2 = netKwh * katsayi;
    var netTl = netKwh * fiyat;

    return {
      aylik: aylik,
      sicakGun: Math.round(sicakGun),
      yilFarkSaat: yilFarkSaat,
      yilKwh: yilKwh,
      yilCo2: yilKwh * katsayi,
      yilTl: yilKwh * fiyat,
      brutKwh: brutKwh,
      aracKwh: aracKwh,
      motorKwh: motorKwh,
      sicramaOran: sicramaOran,
      sicramaKwh: sicramaKwh,
      netKwh: netKwh,
      netCo2: netCo2,
      netTl: netTl,
      geriOdemeYil: null
    };
  }

  k.Golge = {
    ayar: ayar,
    ayarla: ayarla,
    AYLAR: YAZ_AYLARI,
    AYLAR_YIL: AYLAR,
    konum: konum,
    golgeMetre: golgeMetre,
    sicakMi: sicakMi,
    araliklar: araliklar,
    saatToplam: saatToplam,
    aralikYazi: aralikYazi,
    saatYazi: saatYazi,
    gunlukSaat: gunlukSaat,
    yillikEtki: yillikEtki
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
