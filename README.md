# Gölge Saati

İstanbul’da batıya bakan bir cephede, güneşin hangi cama hangi saatte vurduğunu gösterir. Klima açılmaz. **[Solar Curtain](https://solarcurtain.co)** paneli camı gölgeler (ve elektrik üretir); klima daha kısa çalışır.

**Kategori:** Şehir verisi (OSM + güneş modeli; kişisel klima verisi tutulmaz).  
**Donanım / panel:** [solarcurtain.co](https://solarcurtain.co) — elektrik üreten akıllı perde (Türkiye).

## Etki (jüri özeti)

Örnek senaryo (1,2 kW × 5 daire × 50 sıcak gün):

- Brüt ≈ **1 000 kWh / yıl** → **400 kg CO₂** (× 0,4 kg/kWh)
- Ayak izi −7 kWh (yerel web + API + opsiyonel IoT) · sıçrama −50 kWh (%5)
- **Net ≈ 943 kWh / 377 kg CO₂**

Adımlar, varsayımlar ve kaynaklar: [`etki.html`](etki.html)

## Çalıştırma

```bash
python3 -m http.server 8755 --bind 127.0.0.1
```

Tarayıcı: http://127.0.0.1:8755 · Sunum: `/sunum.html` · Etki: `/etki.html`

Mac (Electron yok):

```bash
macos/kur.sh
```

**Jüri demosu:** uygulamada «Jüri demosu» — veya elle Ağustos → 14.30 → saçak aç.

## Geliştirme notu

Prototip kodu, vaka metninin paylaşılmasından sonraki hazırlık haftasında yazılmıştır. Bu Git deposu yarışma gününde bağlanmış / push edilmiştir; tek commit yığını «önceden hazır ürün getirme» anlamına gelmez. Hazır kütüphaneler: Three.js, Leaflet, Open-Meteo, OpenStreetMap/Overpass.

## Teknoloji

- Güneş: astronomik yükseklik / azimut (istemci)
- Bina / cephe: OpenStreetMap
- Hava: Open-Meteo
- Saçak: program + isteğe bağlı Wi‑Fi / Bluetooth
- CO₂ katsayısı: ~0,4 kg/kWh (TR şebeke yaklaşık; EEA / ülke elektrik emisyon faktörü bandı — ayrıntı `etki.html`)
