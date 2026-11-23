(function (k) {
  var DEPO = "golge-saati-senaryolar";

  var BINALAR = [
    {
      id: "is-kuleleri",
      ad: "İş Kuleleri",
      yer: "Levent, İstanbul",
      lat: 41.0815,
      lon: 29.0114,
      normal: 238,
      sacak: 0.05,
      ek: 0.6,
      pencere: 1.5,
      daire: 40,
      guc: 1.2,
      engel: 8,
      bulut: 0.12,
      not: "OSM 3B · tüm cephe camlarında hareketli saçak (8 sıra)"
    },
    {
      id: "maslak",
      ad: "Maslak ofis",
      yer: "Maslak, İstanbul",
      lat: 41.1102,
      lon: 29.0201,
      normal: 225,
      sacak: 0.1,
      ek: 0.8,
      pencere: 1.6,
      daire: 12,
      guc: 1.5,
      engel: 18,
      bulut: 0.15,
      not: "Yoğun komşu kule gölgesi · örnek senaryo"
    },
    {
      id: "kadikoy",
      ad: "Kadıköy konut",
      yer: "Kadıköy, İstanbul",
      lat: 40.9902,
      lon: 29.0292,
      normal: 180,
      sacak: 0.2,
      ek: 0.5,
      pencere: 1.4,
      daire: 8,
      guc: 1.0,
      engel: 5,
      bulut: 0.18,
      not: "Güney cephe · düşük engel"
    },
    {
      id: "ankara",
      ad: "Çankaya ofis",
      yer: "Çankaya, Ankara",
      lat: 39.903,
      lon: 32.859,
      normal: 200,
      sacak: 0.15,
      ek: 0.7,
      pencere: 1.5,
      daire: 6,
      guc: 1.3,
      engel: 4,
      bulut: 0.1,
      not: "Farklı enlem · yaz kuraklığı yüksek"
    },
    {
      id: "ozel",
      ad: "Özel konum",
      yer: "Elle ayar",
      lat: 41.01,
      lon: 29.0,
      normal: 225,
      sacak: 0.1,
      ek: 0.6,
      pencere: 1.5,
      daire: 5,
      guc: 1.2,
      engel: 0,
      bulut: 0.15,
      not: "Enlem, cephe ve maliyetleri kendin gir"
    }
  ];

  function binaBul(id) {
    var i;
    for (i = 0; i < BINALAR.length; i++) {
      if (BINALAR[i].id === id) return BINALAR[i];
    }
    return BINALAR[0];
  }

  function okuListe() {
    try {
      var ham = localStorage.getItem(DEPO);
      return ham ? JSON.parse(ham) : [];
    } catch (e) {
      return [];
    }
  }

  function yazListe(liste) {
    try {
      localStorage.setItem(DEPO, JSON.stringify(liste));
      return true;
    } catch (e) {
      return false;
    }
  }

  function kaydet(ad, durum) {
    var liste = okuListe();
    var kayit = {
      id: "s-" + Date.now(),
      ad: ad || ("Senaryo " + (liste.length + 1)),
      tarih: new Date().toISOString(),
      durum: durum
    };
    liste.unshift(kayit);
    if (liste.length > 20) liste = liste.slice(0, 20);
    yazListe(liste);
    return kayit;
  }

  function sil(id) {
    yazListe(okuListe().filter(function (s) { return s.id !== id; }));
  }

  function urlYaz(durum) {
    var q = new URLSearchParams();
    Object.keys(durum).forEach(function (k) {
      if (durum[k] == null || typeof durum[k] === "object") return;
      q.set(k, String(durum[k]));
    });
    var url = location.pathname + "?" + q.toString() + location.hash;
    try {
      history.replaceState(null, "", url);
    } catch (e) {}
    return location.href;
  }

  function urlOku() {
    var q = new URLSearchParams(location.search);
    if (![].slice.call(q.keys()).length) return null;
    var out = {};
    q.forEach(function (v, k) {
      var n = Number(v);
      out[k] = v === "true" ? true : v === "false" ? false : (isFinite(n) && v !== "" ? n : v);
    });
    return out;
  }

  function csvSatir(degerler) {
    return degerler.map(function (d) {
      var s = String(d == null ? "" : d);
      if (/[",;\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(";");
  }

  function csvUret(rapor) {
    var satirlar = [
      csvSatir(["Alan", "Değer"]),
      csvSatir(["Bina", rapor.bina]),
      csvSatir(["Yer", rapor.yer]),
      csvSatir(["Enlem", rapor.lat]),
      csvSatir(["Cephe azimut °", rapor.normal]),
      csvSatir(["Saçak cm", rapor.ekCm]),
      csvSatir(["Günlük fark sa", rapor.gunlukFark]),
      csvSatir(["Brüt yıllık kWh", Math.round(rapor.yilKwh)]),
      csvSatir(["Brüt yıllık CO2 kg", Math.round(rapor.yilCo2)]),
      csvSatir(["Brüt yıllık TL", Math.round(rapor.yilTl)]),
      csvSatir(["Araç ayak izi kWh", rapor.aracKwh != null ? rapor.aracKwh : 5]),
      csvSatir(["IoT motor kWh", rapor.motorKwh != null ? rapor.motorKwh : 2]),
      csvSatir(["Sıçrama kWh", Math.round(rapor.sicramaKwh != null ? rapor.sicramaKwh : rapor.yilKwh * 0.05)]),
      csvSatir(["Net yıllık kWh", Math.round(rapor.netKwh != null ? rapor.netKwh : rapor.yilKwh * 0.95)]),
      csvSatir(["Net yıllık CO2 kg", Math.round(rapor.netCo2 != null ? rapor.netCo2 : rapor.yilCo2 * 0.95)]),
      csvSatir(["Net yıllık TL", Math.round(rapor.netTl != null ? rapor.netTl : rapor.yilTl * 0.95)]),
      csvSatir(["Geri ödeme yıl", rapor.geriOdeme]),
      csvSatir([]),
      csvSatir(["Ay", "Çıplak sa", "Saçaklı sa", "Fark sa", "Efektif gün", "kWh"])
    ];
    (rapor.aylik || []).forEach(function (a) {
      satirlar.push(csvSatir([
        a.ad,
        a.ciplak.toFixed(2),
        a.ortulu.toFixed(2),
        a.fark.toFixed(2),
        a.efektifGun.toFixed(1),
        a.kwh.toFixed(1)
      ]));
    });
    return satirlar.join("\n");
  }

  function indir(ad, icerik, tip) {
    var blob = new Blob([icerik], { type: tip || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = ad;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  function pdfYazdir(rapor) {
    var w = window.open("", "_blank", "width=820,height=900");
    if (!w) return false;
    var aylikSatir = (rapor.aylik || []).map(function (a) {
      return "<tr><td>" + a.ad + "</td><td>" + a.ciplak.toFixed(1) + "</td><td>" +
        a.ortulu.toFixed(1) + "</td><td>" + a.fark.toFixed(1) + "</td><td>" +
        Math.round(a.kwh) + "</td></tr>";
    }).join("");
    w.document.write(
      "<!DOCTYPE html><html lang=tr><head><meta charset=utf-8><title>Gölge Saati Rapor</title>" +
      "<style>body{font-family:Georgia,serif;color:#121612;padding:32px;max-width:720px;margin:auto}" +
      "h1{font-size:28px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;letter-spacing:.12em;text-transform:uppercase;color:#666}" +
      "table{width:100%;border-collapse:collapse;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:8px 4px;text-align:left}" +
      "td:not(:first-child),th:not(:first-child){text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}" +
      ".kutu{border:1px solid #ddd;padding:12px}.buyuk{font-size:28px;margin:4px 0 0}" +
      "@media print{button{display:none}}</style></head><body>" +
      "<button onclick='print()'>Yazdır / PDF kaydet</button>" +
      "<h1>Gölge Saati</h1><p>" + rapor.bina + " · " + rapor.yer + "</p>" +
      "<div class=grid>" +
      "<div class=kutu><div>Brüt tasarruf</div><div class=buyuk>" + Math.round(rapor.yilKwh).toLocaleString("tr-TR") + " kWh</div></div>" +
      "<div class=kutu><div>Net tasarruf</div><div class=buyuk>" + Math.round(rapor.netKwh != null ? rapor.netKwh : rapor.yilKwh).toLocaleString("tr-TR") + " kWh</div></div>" +
      "<div class=kutu><div>Net CO₂</div><div class=buyuk>" + Math.round(rapor.netCo2 != null ? rapor.netCo2 : rapor.yilCo2).toLocaleString("tr-TR") + " kg</div></div>" +
      "<div class=kutu><div>Geri ödeme</div><div class=buyuk>" + rapor.geriOdeme + "</div></div>" +
      "</div>" +
      "<h2>Net etki</h2><p>Brüt " + Math.round(rapor.yilKwh).toLocaleString("tr-TR") +
      " kWh − araç " + (rapor.aracKwh != null ? rapor.aracKwh : 5) +
      " − IoT " + (rapor.motorKwh != null ? rapor.motorKwh : 2) +
      " − sıçrama " + Math.round(rapor.sicramaKwh != null ? rapor.sicramaKwh : rapor.yilKwh * 0.05) +
      " (%" + Math.round((rapor.sicramaOran != null ? rapor.sicramaOran : 0.05) * 100) +
      ") = <strong>net " + Math.round(rapor.netKwh != null ? rapor.netKwh : rapor.yilKwh).toLocaleString("tr-TR") +
      " kWh / " + Math.round(rapor.netCo2 != null ? rapor.netCo2 : rapor.yilCo2).toLocaleString("tr-TR") +
      " kg CO₂</strong>. Yerel web (kalıcı sunucu yok); sıçrama = konfor/setpoint varsayımı.</p>" +
      "<h2>Parametreler</h2><p>Saçak +" + rapor.ekCm + " cm · pencere " + rapor.pencere +
      " m · cephe " + rapor.normal + "° · enlem " + rapor.lat +
      " · engel " + rapor.engel + "° · bulut %" + Math.round(rapor.bulut * 100) +
      " · " + rapor.daire + " daire × " + rapor.guc + " kW · " + rapor.fiyat + " TL/kWh" +
      (rapor.maliyet > 0 ? " · yatırım " + rapor.maliyet.toLocaleString("tr-TR") + " TL" : "") +
      "</p>" +
      "<h2>Aylık etki</h2><table><thead><tr><th>Ay</th><th>Çıplak</th><th>Saçak</th><th>Fark</th><th>kWh</th></tr></thead><tbody>" +
      aylikSatir + "</tbody></table>" +
      "<p style='margin-top:28px;color:#888;font-size:12px'>Örnek model · net etki düşülmüş · OpenStreetMap · Gölge Saati</p>" +
      "</body></html>"
    );
    w.document.close();
    return true;
  }

  function kisaltAd(display) {
    if (!display) return "Seçilen konum";
    var parca = String(display).split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    // En fazla 2 parça · uzun kampüs adresleri başlığı bozmasın
    var kisa = parca.slice(0, Math.min(2, parca.length)).join(", ");
    if (kisa.length > 56) kisa = kisa.slice(0, 53).trim() + "…";
    return kisa;
  }

  function adresAra(sorgu) {
    var q = String(sorgu || "").trim();
    if (q.length < 3) {
      return Promise.reject(new Error("En az 3 karakter yaz"));
    }
    var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=tr&countrycodes=tr&q=" +
      encodeURIComponent(q);
    return fetch(url, {
      headers: { Accept: "application/json" }
    }).then(function (r) {
      if (!r.ok) throw new Error("Arama servisi yanıt vermedi");
      return r.json();
    }).then(function (liste) {
      return (liste || []).map(function (item) {
        return {
          lat: Number(item.lat),
          lon: Number(item.lon),
          ad: kisaltAd(item.display_name),
          yer: item.display_name,
          tip: item.type || item.class || ""
        };
      });
    });
  }

  function tersGeocode(lat, lon) {
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=tr&lat=" +
      encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lon);
    return fetch(url, {
      headers: { Accept: "application/json" }
    }).then(function (r) {
      if (!r.ok) throw new Error("Adres çözülemedi");
      return r.json();
    }).then(function (item) {
      return {
        lat: Number(lat),
        lon: Number(lon),
        ad: kisaltAd(item.display_name),
        yer: item.display_name || (lat + ", " + lon)
      };
    });
  }

  function gpsHataYazi(err) {
    if (!err) return "Konum alınamadı";
    if (err.code === 1) return "Konum izni reddedildi · Sistem Ayarları → Gizlilik → Konum Servisleri";
    if (err.code === 2) return "Konum şu an kullanılamıyor · Wi‑Fi / GPS aç";
    if (err.code === 3) return "Konum zaman aşımı";
    return err.message || "Konum alınamadı";
  }

  function gpsTek(opts) {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("Tarayıcı konum desteklemiyor"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            dogruluk: pos.coords.accuracy,
            kaynak: "gps"
          });
        },
        function (err) { reject(err); },
        opts
      );
    });
  }

  function gpsAl() {
    return gpsTek({ enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 })
      .catch(function () {
        return gpsTek({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      })
      .catch(function (err) {
        return Promise.reject(new Error(gpsHataYazi(err)));
      });
  }

  function ipKonumAl() {
    return fetch("https://get.geojs.io/v1/ip/geo.json", { headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("IP konum servisi yanıt vermedi");
        return r.json();
      })
      .then(function (d) {
        var lat = Number(d.latitude);
        var lon = Number(d.longitude);
        if (!isFinite(lat) || !isFinite(lon)) throw new Error("IP konum geçersiz");
        return {
          lat: lat,
          lon: lon,
          dogruluk: 5000,
          kaynak: "ip",
          ad: d.city ? (d.city + (d.region ? ", " + d.region : "")) : "Yaklaşık IP konumu",
          yer: [d.city, d.region, d.country].filter(Boolean).join(", ") || (lat + ", " + lon)
        };
      });
  }

  function macKonumAl() {
    return new Promise(function (resolve, reject) {
      var bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.golgeKonum;
      if (!bridge) {
        reject(new Error("Mac konum köprüsü yok"));
        return;
      }
      var bitti = false;
      var timer = setTimeout(function () {
        if (bitti) return;
        bitti = true;
        window.__golgeKonumCb = null;
        reject(new Error("Mac konum zaman aşımı · Konum Servisleri açık mı?"));
      }, 18000);
      window.__golgeKonumCb = function (lat, lon, err) {
        if (bitti) return;
        bitti = true;
        clearTimeout(timer);
        window.__golgeKonumCb = null;
        if (err) reject(new Error(err));
        else resolve({ lat: Number(lat), lon: Number(lon), dogruluk: 50, kaynak: "mac" });
      };
      try {
        bridge.postMessage({ action: "locate" });
      } catch (e) {
        bitti = true;
        clearTimeout(timer);
        window.__golgeKonumCb = null;
        reject(new Error("Mac konum çağrılamadı"));
      }
    });
  }

  // Native Mac köprüsü buraya yazar
  window.__golgeKonum = function (lat, lon, err) {
    if (typeof window.__golgeKonumCb === "function") window.__golgeKonumCb(lat, lon, err);
  };

  function konumumuAl() {
    return macKonumAl()
      .catch(function () { return gpsAl(); })
      .catch(function (gpsErr) {
        return ipKonumAl().then(function (ip) {
          ip.uyari = gpsErr && gpsErr.message ? gpsErr.message : null;
          return ip;
        });
      });
  }

  k.Senaryo = {
    BINALAR: BINALAR,
    binaBul: binaBul,
    kaydet: kaydet,
    sil: sil,
    okuListe: okuListe,
    urlYaz: urlYaz,
    urlOku: urlOku,
    csvUret: csvUret,
    indir: indir,
    pdfYazdir: pdfYazdir,
    adresAra: adresAra,
    tersGeocode: tersGeocode,
    gpsAl: gpsAl,
    ipKonumAl: ipKonumAl,
    konumumuAl: konumumuAl,
    kisaltAd: kisaltAd
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
