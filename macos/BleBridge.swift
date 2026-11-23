import CoreBluetooth
import Foundation
import WebKit

final class BleBridge: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private let nusService = CBUUID(string: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
    private let nusRx = CBUUID(string: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E")

    private weak var webView: WKWebView?
    private var central: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var rxChar: CBCharacteristic?
    private var pendingCommand: String?
    private var scanning = false
    private var connectDeadline: Date?

    init(webView: WKWebView?) {
        self.webView = webView
        super.init()
        central = CBCentralManager(delegate: self, queue: .main)
    }

    func handle(_ body: [String: Any]) {
        let action = body["action"] as? String ?? ""
        switch action {
        case "scanConnect":
            startScan()
        case "disconnect":
            disconnect()
        case "command":
            let cmd = body["command"] as? String ?? ""
            sendCommand(cmd)
        default:
            push(["type": "error", "message": "Bilinmeyen BLE komutu"])
        }
    }

    private func startScan() {
        guard central.state == .poweredOn else {
            push(["type": "error", "message": "Bluetooth kapalı · Sistem Ayarları’ndan aç"])
            return
        }
        scanning = true
        connectDeadline = Date().addingTimeInterval(20)
        peripheral = nil
        rxChar = nil
        central.stopScan()
        central.scanForPeripherals(withServices: [nusService], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        // İsim filtreli tarama da yap (servis reklam etmeyen cihazlar)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self = self, self.scanning else { return }
            self.central.scanForPeripherals(withServices: nil, options: nil)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
            guard let self = self, self.scanning else { return }
            self.scanning = false
            self.central.stopScan()
            if self.peripheral == nil {
                self.push(["type": "error", "message": "Solar Curtain bulunamadı · GolgeSaati / NUS cihazını aç"])
            }
        }
    }

    private func disconnect() {
        scanning = false
        central.stopScan()
        if let p = peripheral {
            central.cancelPeripheralConnection(p)
        }
        peripheral = nil
        rxChar = nil
        push(["type": "disconnected"])
    }

    private func sendCommand(_ action: String) {
        guard let p = peripheral, let ch = rxChar else {
            push(["type": "error", "message": "Perde bağlı değil"])
            return
        }
        let text = action == "open" ? "OPEN\n" : action == "close" ? "CLOSE\n" : "STATUS\n"
        guard let data = text.data(using: .utf8) else { return }
        pendingCommand = action
        let type: CBCharacteristicWriteType = ch.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
        p.writeValue(data, for: ch, type: type)
        if type == .withoutResponse {
            push(["type": "commandOk", "action": action])
            pendingCommand = nil
        }
    }

    private func isTargetName(_ name: String?) -> Bool {
        guard let n = name?.lowercased() else { return false }
        return n.contains("golge") || n.contains("gölge") || n.contains("sacak") || n.contains("saçak") || n.contains("shade")
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state != .poweredOn && scanning {
            scanning = false
            push(["type": "error", "message": "Bluetooth kullanılamıyor"])
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
        let services = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID]
        let hasNus = services?.contains(nusService) == true
        guard hasNus || isTargetName(name) else { return }
        scanning = false
        central.stopScan()
        self.peripheral = peripheral
        peripheral.delegate = self
        central.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices([nusService])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        push(["type": "error", "message": error?.localizedDescription ?? "Bağlantı başarısız"])
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        self.peripheral = nil
        rxChar = nil
        push(["type": "disconnected"])
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            push(["type": "error", "message": error.localizedDescription])
            return
        }
        guard let service = peripheral.services?.first(where: { $0.uuid == nusService }) else {
            push(["type": "error", "message": "NUS servisi yok"])
            return
        }
        peripheral.discoverCharacteristics([nusRx], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            push(["type": "error", "message": error.localizedDescription])
            return
        }
        rxChar = service.characteristics?.first(where: { $0.uuid == nusRx })
        guard rxChar != nil else {
            push(["type": "error", "message": "Yazma karakteristiği yok"])
            return
        }
        push(["type": "connected", "name": peripheral.name ?? "BLE Solar Curtain"])
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            push(["type": "error", "message": error.localizedDescription])
            pendingCommand = nil
            return
        }
        if let action = pendingCommand {
            push(["type": "commandOk", "action": action])
            pendingCommand = nil
        }
    }

    private func push(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict) else { return }
        let b64 = data.base64EncodedString()
        let js = "window.__golgeBle && window.__golgeBle(JSON.parse(atob('\(b64)')))"
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}
