(function (k) {
  var SACAK_SECENEK = [
    { ek: 0.4, ad: "Zebra açık" },
    { ek: 0.6, ad: "Zebra" },
    { ek: 0.8, ad: "Blackout" },
    { ek: 1.0, ad: "Blackout tam" }
  ];
  var CAM_TIPLERI = [
    { id: "tek", ad: "Tek cam", shgc: 0.85 },
    { id: "cift", ad: "Çift cam", shgc: 0.65 },
    { id: "lowe", ad: "Low-E çift", shgc: 0.40 },
    { id: "uc", ad: "Üçlü Low-E", shgc: 0.28 }
  ];

  function camBul(id) {
    var i;
    for (i = 0; i < CAM_TIPLERI.length; i++) {
      if (CAM_TIPLERI[i].id === id) return CAM_TIPLERI[i];
    }
    return CAM_TIPLERI[1];
  }

  function havaCek(lat, lon) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon) +
      "&current=temperature_2m,cloud_cover,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,cloud_cover_mean" +
      "&timezone=Europe%2FIstanbul&forecast_days=1";
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Hava servisi yanıt vermedi");
      return r.json();
    }).then(function (data) {
      var cur = data.current || {};
      var cloud = (cur.cloud_cover != null ? cur.cloud_cover : 30) / 100;
      return {
        sicaklik: cur.temperature_2m,
        bulut: Math.round(Math.min(0.55, Math.max(0.05, cloud * 0.7)) * 100) / 100,
        bulutHam: cur.cloud_cover,
        kod: cur.weather_code,
        max: data.daily && data.daily.temperature_2m_max ? data.daily.temperature_2m_max[0] : null,
        min: data.daily && data.daily.temperature_2m_min ? data.daily.temperature_2m_min[0] : null
      };
    });
  }

  function sacakKarsilastir(G, durum, ayGun) {
    var taban = durum.sacak;
    var normal = durum.normal;
    return SACAK_SECENEK.map(function (sec) {
      var ek = typeof sec === "number" ? sec : sec.ek;
      var ad = typeof sec === "number" ? (Math.round(ek * 100) + " cm") : sec.ad;
      var ciplak = G.saatToplam(G.araliklar(ayGun, taban, normal));
      var ortulu = G.saatToplam(G.araliklar(ayGun, taban + ek, normal));
      var fark = Math.max(0, ciplak - ortulu);
      var yil = G.yillikEtki(taban, taban + ek, normal, {
        guc: durum.guc,
        daire: durum.daire,
        katsayi: durum.katsayi,
        fiyat: durum.fiyat,
        shgc: durum.shgc
      });
      return {
        cm: Math.round(ek * 100),
        ad: ad,
        ek: ek,
        gunlukFark: fark,
        yilKwh: yil.yilKwh,
        yilTl: yil.yilTl,
        yilCo2: yil.yilCo2
      };
    });
  }

  function kisUyarisi(G, durum) {
    var normal = durum.normal;
    var guneyce = Math.cos((normal - 180) * Math.PI / 180) > 0.3;
    if (!guneyce) {
      return { aktif: false, metin: "Cephe güneye bakmıyor · kış güneş kaybı düşük." };
    }
    var kis = G.AYLAR_YIL.filter(function (m) {
      return m.id === "kasim" || m.id === "aralik" || m.id === "ocak" || m.id === "subat";
    });
    var kayipSaat = 0;
    kis.forEach(function (m) {
      var c = G.gunlukSaat(m.gun, durum.sacak, normal);
      var o = G.gunlukSaat(m.gun, durum.sacak + durum.ek, normal);
      kayipSaat += Math.max(0, c - o) * m.gunSay * 0.35;
    });
    var isiKw = 0.08 * (durum.shgc != null ? durum.shgc : 0.65);
    var kayipKwh = kayipSaat * isiKw * durum.daire;
    var kayipTl = kayipKwh * durum.fiyat * 0.7;
    return {
      aktif: kayipKwh > 20,
      kayipKwh: kayipKwh,
      kayipTl: kayipTl,
      metin: kayipKwh > 20
        ? ("Kış uyarısı: sürekli inik perde ~" + Math.round(kayipKwh) + " kWh pasif ısı kaçırabilir (~" +
          Math.round(kayipTl) + " TL). Kışın Solar Curtain’i kaldırmak önerilir.")
        : "Kış güneş kaybı kabul edilebilir seviyede."
    };
  }

  function icsEsc(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function icsTarih(d, saat) {
    var x = new Date(d.getTime());
    var h = Math.floor(saat);
    var m = Math.round((saat - h) * 60);
    x.setHours(h, m, 0, 0);
    function p(n) { return n < 10 ? "0" + n : String(n); }
    return x.getFullYear() + p(x.getMonth() + 1) + p(x.getDate()) + "T" +
      p(x.getHours()) + p(x.getMinutes()) + "00";
  }

  function icalUret(opts) {
    opts = opts || {};
    var baslik = opts.baslik || "Gölge Saati · Solar Curtain";
    var araliklar = opts.araliklar || [];
    var gunSay = opts.gunSay || 14;
    var lat = opts.lat;
    var lon = opts.lon;
    var satirlar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Golge Saati//TR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];
    var bugun = new Date();
    var g;
    for (g = 0; g < gunSay; g++) {
      var gun = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() + g);
      araliklar.forEach(function (a, idx) {
        var uid = "golge-" + gun.getTime() + "-" + idx + "@golgesaati";
        satirlar.push("BEGIN:VEVENT");
        satirlar.push("UID:" + uid);
        satirlar.push("DTSTAMP:" + icsTarih(bugun, 12));
        satirlar.push("DTSTART:" + icsTarih(gun, a[0]));
        satirlar.push("DTEND:" + icsTarih(gun, a[1]));
        satirlar.push("SUMMARY:" + icsEsc(baslik + " AÇIK"));
        satirlar.push("DESCRIPTION:" + icsEsc("Perdeyi inik tut · Gölge Saati · Solar Curtain"));
        if (lat != null && lon != null) {
          satirlar.push("GEO:" + lat + ";" + lon);
        }
        satirlar.push("END:VEVENT");
      });
    }
    satirlar.push("END:VCALENDAR");
    return satirlar.join("\r\n");
  }

  function otomasyonPaket(action, durum, ekstra) {
    return {
      source: "golge-saati",
      action: action,
      ts: new Date().toISOString(),
      topic: "golge-saati/sacak/" + action,
      lat: durum.lat,
      lon: durum.lon,
      normal: durum.normal,
      ekCm: Math.round(durum.ek * 100),
      yer: durum.yerAd || durum.yer || "",
      extra: ekstra || null
    };
  }

  function otomasyonGonder(url, paket) {
    if (!url) return Promise.reject(new Error("Webhook URL yok"));
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paket)
    }).then(function (r) {
      if (!r.ok) throw new Error("Webhook " + r.status);
      return true;
    });
  }

  function binaKenarNormal(coords) {
    // coords: [[lon,lat],...] ring — en uzun kenarın dışa bakan azimutu (yaklaşık)
    if (!coords || coords.length < 2) return null;
    var best = null;
    var bestLen = -1;
    var i;
    for (i = 0; i < coords.length - 1; i++) {
      var a = coords[i];
      var b = coords[i + 1];
      var dlon = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180);
      var dlat = b[1] - a[1];
      var len = dlon * dlon + dlat * dlat;
      if (len > bestLen) {
        bestLen = len;
        // kenar yönü (doğu of north), dış normal ≈ kenar + 90°
        var bearing = Math.atan2(dlon, dlat) * 180 / Math.PI;
        var normal = (bearing + 90 + 360) % 360;
        best = normal;
      }
    }
    return best == null ? null : Math.round(best);
  }

  function overpassBina(lat, lon) {
    var q = "[out:json][timeout:15];(way(around:40," + lat + "," + lon + ")[building];);out geom 1;";
    var url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(q);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Bina verisi alınamadı");
      return r.json();
    }).then(function (data) {
      var el = data.elements && data.elements[0];
      if (!el || !el.geometry) throw new Error("Yakında bina bulunamadı");
      var coords = el.geometry.map(function (p) { return [p.lon, p.lat]; });
      if (coords.length && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
        coords.push(coords[0]);
      }
      return {
        normal: binaKenarNormal(coords),
        ad: (el.tags && (el.tags.name || el.tags["addr:street"])) || "OSM bina",
        geometry: coords
      };
    });
  }

  k.Ekler = {
    SACAK_SECENEK: SACAK_SECENEK,
    CAM_TIPLERI: CAM_TIPLERI,
    camBul: camBul,
    havaCek: havaCek,
    sacakKarsilastir: sacakKarsilastir,
    kisUyarisi: kisUyarisi,
    icalUret: icalUret,
    otomasyonPaket: otomasyonPaket,
    otomasyonGonder: otomasyonGonder,
    overpassBina: overpassBina,
    binaKenarNormal: binaKenarNormal
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
