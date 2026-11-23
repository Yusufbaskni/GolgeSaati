(function (k) {
  // Nordic UART Service — ESP32 / nRF saçak sürücüleri için yaygın
  var NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  var NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // uygulamadan cihaza yaz
  var NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // cihazdan bildir

  var durum = {
    bagli: false,
    ad: "",
    kaynak: null, // web | mac | sanal
    sonKomut: null,
    otomatik: true
  };

  var webDevice = null;
  var webChar = null;
  var dinleyiciler = [];

  function bildir() {
    dinleyiciler.forEach(function (fn) {
      try { fn(Object.assign({}, durum)); } catch (e) {}
    });
  }

  function onDurum(fn) {
    dinleyiciler.push(fn);
  }

  function macBridgeVar() {
    return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.golgeBle);
  }

  function webBleVar() {
    return typeof navigator !== "undefined" && !!navigator.bluetooth;
  }

  function encodeKomut(action) {
    var metin = action === "open" ? "OPEN\n" : action === "close" ? "CLOSE\n" : "STATUS\n";
    return new TextEncoder().encode(metin);
  }

  function baglanWeb() {
    return navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: "Golge" },
        { namePrefix: "Gölge" },
        { namePrefix: "Sacak" },
        { namePrefix: "Saçak" },
        { services: [NUS_SERVICE] }
      ],
      optionalServices: [NUS_SERVICE]
    }).then(function (device) {
      webDevice = device;
      device.addEventListener("gattserverdisconnected", function () {
        durum.bagli = false;
        durum.ad = "";
        webChar = null;
        bildir();
      });
      return device.gatt.connect();
    }).then(function (server) {
      return server.getPrimaryService(NUS_SERVICE);
    }).then(function (service) {
      return service.getCharacteristic(NUS_RX);
    }).then(function (ch) {
      webChar = ch;
      durum.bagli = true;
      durum.ad = (webDevice && webDevice.name) || "BLE saçak";
      durum.kaynak = "web";
      bildir();
      return durum;
    });
  }

  function baglanMac() {
    return new Promise(function (resolve, reject) {
      if (!macBridgeVar()) {
        reject(new Error("Mac Bluetooth köprüsü yok"));
        return;
      }
      var bitti = false;
      var timer = setTimeout(function () {
        if (bitti) return;
        bitti = true;
        window.__golgeBleCb = null;
        reject(new Error("Bluetooth zaman aşımı · cihaz açık ve yakında mı?"));
      }, 25000);
      window.__golgeBleCb = function (msg) {
        if (bitti) return;
        if (!msg) return;
        if (msg.type === "connected") {
          bitti = true;
          clearTimeout(timer);
          window.__golgeBleCb = null;
          durum.bagli = true;
          durum.ad = msg.name || "Mac BLE saçak";
          durum.kaynak = "mac";
          bildir();
          resolve(durum);
        } else if (msg.type === "error") {
          bitti = true;
          clearTimeout(timer);
          window.__golgeBleCb = null;
          reject(new Error(msg.message || "Bluetooth bağlanamadı"));
        } else if (msg.type === "disconnected") {
          durum.bagli = false;
          durum.ad = "";
          bildir();
        } else if (msg.type === "status") {
          durum.bagli = !!msg.connected;
          if (msg.name) durum.ad = msg.name;
          bildir();
        }
      };
      try {
        window.webkit.messageHandlers.golgeBle.postMessage({ action: "scanConnect" });
      } catch (e) {
        bitti = true;
        clearTimeout(timer);
        reject(new Error("Bluetooth çağrılamadı"));
      }
    });
  }

  function baglanSanal() {
    durum.bagli = true;
    durum.ad = "Sanal saçak (demo)";
    durum.kaynak = "sanal";
    bildir();
    return Promise.resolve(durum);
  }

  function baglan() {
    if (macBridgeVar()) return baglanMac().catch(function () { return baglanSanal(); });
    if (webBleVar()) {
      return baglanWeb().catch(function (e) {
        // kullanıcı iptal ettiyse sanal önerme
        if (e && e.name === "NotFoundError") return baglanSanal();
        return Promise.reject(e);
      });
    }
    return baglanSanal();
  }

  function kopar() {
    if (durum.kaynak === "web" && webDevice && webDevice.gatt && webDevice.gatt.connected) {
      webDevice.gatt.disconnect();
    }
    if (durum.kaynak === "mac" && macBridgeVar()) {
      try { window.webkit.messageHandlers.golgeBle.postMessage({ action: "disconnect" }); } catch (e) {}
    }
    webDevice = null;
    webChar = null;
    durum.bagli = false;
    durum.ad = "";
    durum.kaynak = null;
    bildir();
    return Promise.resolve();
  }

  function komutGonder(action) {
    if (!durum.bagli) {
      return Promise.reject(new Error("Önce Bluetooth saçağa bağlan"));
    }
    durum.sonKomut = action;
    bildir();

    if (durum.kaynak === "sanal") {
      return Promise.resolve({ ok: true, action: action, kaynak: "sanal" });
    }

    if (durum.kaynak === "web") {
      if (!webChar) return Promise.reject(new Error("BLE karakteristik yok"));
      return webChar.writeValueWithoutResponse
        ? webChar.writeValueWithoutResponse(encodeKomut(action)).then(function () {
          return { ok: true, action: action, kaynak: "web" };
        })
        : webChar.writeValue(encodeKomut(action)).then(function () {
          return { ok: true, action: action, kaynak: "web" };
        });
    }

    if (durum.kaynak === "mac" && macBridgeVar()) {
      return new Promise(function (resolve, reject) {
        var bitti = false;
        var timer = setTimeout(function () {
          if (bitti) return;
          bitti = true;
          reject(new Error("Komut zaman aşımı"));
        }, 8000);
        var onceki = window.__golgeBleCb;
        window.__golgeBleCb = function (msg) {
          if (onceki) onceki(msg);
          if (!msg || bitti) return;
          if (msg.type === "commandOk" && msg.action === action) {
            bitti = true;
            clearTimeout(timer);
            window.__golgeBleCb = onceki || null;
            resolve({ ok: true, action: action, kaynak: "mac" });
          } else if (msg.type === "error") {
            bitti = true;
            clearTimeout(timer);
            window.__golgeBleCb = onceki || null;
            reject(new Error(msg.message || "Komut başarısız"));
          }
        };
        try {
          window.webkit.messageHandlers.golgeBle.postMessage({ action: "command", command: action });
        } catch (e) {
          bitti = true;
          clearTimeout(timer);
          reject(e);
        }
      });
    }

    return Promise.reject(new Error("Bilinmeyen BLE kaynağı"));
  }

  function ac() { return komutGonder("open"); }
  function kapat() { return komutGonder("close"); }

  function otomatikAyarla(v) {
    durum.otomatik = !!v;
    bildir();
  }

  window.__golgeBle = function (msg) {
    if (typeof window.__golgeBleCb === "function") window.__golgeBleCb(msg);
    if (msg && msg.type === "disconnected") {
      durum.bagli = false;
      durum.ad = "";
      bildir();
    }
  };

  k.BleSacak = {
    NUS_SERVICE: NUS_SERVICE,
    durum: durum,
    onDurum: onDurum,
    baglan: baglan,
    kopar: kopar,
    ac: ac,
    kapat: kapat,
    komutGonder: komutGonder,
    otomatikAyarla: otomatikAyarla,
    macBridgeVar: macBridgeVar,
    webBleVar: webBleVar
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
