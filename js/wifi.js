(function (k) {
  var DEPO = "golge-saati-wifi-sacak";

  var durum = {
    url: "",
    bagli: false,
    sonDurum: null, // open | close | unknown
    sonMs: 0,
    otomatik: true,
    ad: ""
  };

  var dinleyiciler = [];

  function bildir() {
    dinleyiciler.forEach(function (fn) {
      try { fn(Object.assign({}, durum)); } catch (e) {}
    });
  }

  function onDurum(fn) { dinleyiciler.push(fn); }

  function okuKayit() {
    try {
      var ham = localStorage.getItem(DEPO);
      if (!ham) return;
      var d = JSON.parse(ham);
      if (d.url) durum.url = String(d.url);
      if (d.otomatik != null) durum.otomatik = !!d.otomatik;
      if (d.ad) durum.ad = String(d.ad);
    } catch (e) {}
  }

  function yazKayit() {
    try {
      localStorage.setItem(DEPO, JSON.stringify({
        url: durum.url,
        otomatik: durum.otomatik,
        ad: durum.ad
      }));
    } catch (e) {}
  }

  function normalizeUrl(raw) {
    var u = String(raw || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "http://" + u;
    return u.replace(/\/+$/, "");
  }

  function urlAyarla(raw) {
    durum.url = normalizeUrl(raw);
    yazKayit();
    bildir();
    return durum.url;
  }

  function otomatikAyarla(v) {
    durum.otomatik = !!v;
    yazKayit();
    bildir();
  }

  function endpoint(action) {
    var base = durum.url;
    if (!base) throw new Error("Wi‑Fi adresi yok");
    // Desteklenen yollar: /sacak/open|close|status  veya  /open|/close|/status
    if (action === "open") return base + "/sacak/open";
    if (action === "close") return base + "/sacak/close";
    return base + "/sacak/status";
  }

  function iste(action, alternatif) {
    var url = alternatif || endpoint(action);
    return fetch(url, {
      method: action === "status" ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*"
      },
      body: action === "status" ? undefined : JSON.stringify({ action: action, source: "golge-saati" }),
      mode: "cors",
      cache: "no-store"
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      var ct = r.headers.get("content-type") || "";
      if (ct.indexOf("json") >= 0) return r.json();
      return r.text().then(function (t) { return { ok: true, raw: t }; });
    });
  }

  function komutGonder(action) {
    if (!durum.url) {
      return Promise.reject(new Error("Önce Wi‑Fi saçak adresini gir (örn. 192.168.1.50)"));
    }
    return iste(action).catch(function () {
      // Eski / basit firmware: /open /close
      var base = durum.url;
      var yol = action === "open" ? "/open" : action === "close" ? "/close" : "/status";
      return iste(action, base + yol);
    }).then(function (data) {
      durum.bagli = true;
      durum.sonMs = Date.now();
      if (action === "open" || action === "close") durum.sonDurum = action;
      else if (data && (data.state === "open" || data.state === "close")) durum.sonDurum = data.state;
      if (data && data.name) durum.ad = data.name;
      yazKayit();
      bildir();
      return { ok: true, action: action, kaynak: "wifi", data: data };
    }).catch(function (e) {
      durum.bagli = false;
      bildir();
      var msg = e && e.message ? e.message : "Wi‑Fi komutu başarısız";
      if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
        msg = "Wi‑Fi saçağa ulaşılamadı · aynı ağda mı? CORS açık mı?";
      }
      return Promise.reject(new Error(msg));
    });
  }

  function testBaglantı() {
    return komutGonder("status").catch(function () {
      // status yoksa kısa ping: GET base/
      return fetch(durum.url + "/", { method: "GET", mode: "cors", cache: "no-store" })
        .then(function (r) {
          durum.bagli = r.ok;
          durum.sonMs = Date.now();
          bildir();
          if (!r.ok) throw new Error("HTTP " + r.status);
          return { ok: true, action: "ping", kaynak: "wifi" };
        });
    });
  }

  function ac() { return komutGonder("open"); }
  function kapat() { return komutGonder("close"); }

  okuKayit();

  k.WifiSacak = {
    durum: durum,
    onDurum: onDurum,
    urlAyarla: urlAyarla,
    otomatikAyarla: otomatikAyarla,
    testBaglantı: testBaglantı,
    komutGonder: komutGonder,
    ac: ac,
    kapat: kapat
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
