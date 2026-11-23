import Cocoa
import CoreLocation
import Darwin
import WebKit

private let appDelegate = GolgeDelegate()

final class GolgeDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
    var window: NSWindow?
    var webView: WKWebView?
    var serverFD: Int32 = -1
    var locationManager: CLLocationManager?
    var locating = false
    var bleBridge: BleBridge?

    func applicationDidFinishLaunching(_ notification: Notification) {
        signal(SIGPIPE, SIG_IGN)
        let root = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)
        let port = startServer(root: root)
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.userContentController.add(self, name: "golgeKonum")
        config.userContentController.add(self, name: "golgeBle")
        let web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = self
        web.wantsLayer = true
        if #available(macOS 13.3, *) {
            web.isInspectable = true
        }
        webView = web
        bleBridge = BleBridge(webView: web)
        let ekran = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1680, height: 1050)
        let genislik = min(1680, max(1280, ekran.width * 0.88))
        let yukseklik = min(1050, max(820, ekran.height * 0.88))
        let pencere = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: genislik, height: yukseklik),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        pencere.title = "Gölge Saati"
        pencere.minSize = NSSize(width: 1100, height: 720)
        pencere.backgroundColor = NSColor(srgbRed: 0x0c / 255, green: 0x10 / 255, blue: 0x0e / 255, alpha: 1)
        pencere.contentView = web
        pencere.center()
        pencere.setFrameAutosaveName("GolgeSaatiWindow")
        pencere.makeKeyAndOrderFront(nil)
        window = pencere
        NSApp.activate(ignoringOtherApps: true)
        if let url = URL(string: "http://127.0.0.1:\(port)/") {
            web.load(URLRequest(url: url))
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    @available(macOS 27.0, *)
    func webView(
        _ webView: WKWebView,
        requestGeolocationPermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.grant)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "golgeKonum" {
            startNativeLocation()
            return
        }
        if message.name == "golgeBle" {
            let body = message.body as? [String: Any] ?? [:]
            bleBridge?.handle(body)
        }
    }

    private func startNativeLocation() {
        DispatchQueue.main.async {
            if self.locationManager == nil {
                let lm = CLLocationManager()
                lm.delegate = self
                lm.desiredAccuracy = kCLLocationAccuracyHundredMeters
                self.locationManager = lm
            }
            guard let lm = self.locationManager else { return }
            self.locating = true
            let status: CLAuthorizationStatus
            if #available(macOS 11.0, *) {
                status = lm.authorizationStatus
            } else {
                status = CLLocationManager.authorizationStatus()
            }
            switch status {
            case .notDetermined:
                lm.requestWhenInUseAuthorization()
            case .authorizedAlways, .authorized:
                lm.requestLocation()
            case .denied, .restricted:
                self.pushLocationError("Konum izni yok · Sistem Ayarları → Gizlilik → Konum Servisleri → Gölge Saati")
                self.locating = false
            @unknown default:
                lm.requestWhenInUseAuthorization()
            }
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        guard locating else { return }
        if status == .authorizedAlways || status == .authorized {
            manager.requestLocation()
        } else if status == .denied || status == .restricted {
            pushLocationError("Konum izni reddedildi")
            locating = false
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        locating = false
        guard let loc = locations.last else {
            pushLocationError("Konum alınamadı")
            return
        }
        let lat = loc.coordinate.latitude
        let lon = loc.coordinate.longitude
        let js = String(format: "window.__golgeKonum && window.__golgeKonum(%.6f, %.6f, null)", lat, lon)
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locating = false
        pushLocationError(error.localizedDescription)
    }

    private func pushLocationError(_ message: String) {
        let escaped = message
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: " ")
        let js = "window.__golgeKonum && window.__golgeKonum(null, null, '\(escaped)')"
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    private func startServer(root: URL) -> UInt16 {
        let fd = Darwin.socket(AF_INET, SOCK_STREAM, 0)
        if fd < 0 { return 0 }
        var yes: Int32 = 1
        Darwin.setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout.size(ofValue: yes)))
        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = 0
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")
        let bound = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        if bound != 0 { Darwin.close(fd); return 0 }
        Darwin.listen(fd, 16)
        var boundAddr = sockaddr_in()
        var length = socklen_t(MemoryLayout<sockaddr_in>.size)
        _ = withUnsafeMutablePointer(to: &boundAddr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.getsockname(fd, $0, &length)
            }
        }
        serverFD = fd
        let rootPath = root.path
        DispatchQueue.global().async {
            while true {
                let client = Darwin.accept(fd, nil, nil)
                if client < 0 { continue }
                self.serve(client: client, rootPath: rootPath)
                Darwin.close(client)
            }
        }
        return UInt16(bigEndian: boundAddr.sin_port)
    }

    private func serve(client: Int32, rootPath: String) {
        var buffer = Data()
        var tmp = [UInt8](repeating: 0, count: 4096)
        while buffer.count < 8192 {
            let n = Darwin.recv(client, &tmp, tmp.count, 0)
            if n <= 0 { return }
            buffer.append(contentsOf: tmp.prefix(n))
            if buffer.range(of: Data([13, 10, 13, 10])) != nil { break }
        }
        guard let text = String(data: buffer, encoding: .isoLatin1),
              let line = text.split(separator: "\r\n", maxSplits: 1, omittingEmptySubsequences: false).first else { return }
        let bits = line.split(separator: " ")
        guard bits.count >= 2, bits[0] == "GET" else { return }
        var path = String(bits[1])
        if let q = path.firstIndex(of: "?") { path = String(path[..<q]) }
        path = path.removingPercentEncoding ?? path
        if path == "/" { path = "/index.html" }
        let parts = path.split(separator: "/").map(String.init)
        if parts.contains(where: { $0 == ".." || $0 == "." }) { return }
        var url = URL(fileURLWithPath: rootPath, isDirectory: true)
        parts.forEach { url.appendPathComponent($0) }
        guard let body = try? Data(contentsOf: url) else { return }
        let ext = url.pathExtension.lowercased()
        let type = ext == "css" ? "text/css" : (ext == "js" ? "text/javascript" : "text/html; charset=utf-8")
        let head = "HTTP/1.1 200 OK\r\nContent-Type: \(type)\r\nContent-Length: \(body.count)\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n"
        var data = Data(head.utf8)
        data.append(body)
        data.withUnsafeBytes { raw in
            guard let base = raw.baseAddress else { return }
            var sent = 0
            while sent < data.count {
                let n = Darwin.send(client, base.advanced(by: sent), data.count - sent, 0)
                if n <= 0 { break }
                sent += n
            }
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
app.delegate = appDelegate
app.run()
