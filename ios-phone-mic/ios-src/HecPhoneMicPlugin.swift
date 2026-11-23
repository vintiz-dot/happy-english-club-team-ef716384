// HEC Phone Mic - the teacher's iPhone as the class recorder's teacher
// microphone, recording with the screen locked (23 Nov 2026).
//
// This plugin is ONLY a microphone. The phone page of the school site
// (/teacher/recorder/phone), running inside this app, reads the audio from
// here and does everything else exactly as in Safari: PhoneTeacherTrack cuts
// the chunks on the laptop's timeline, encodes FLAC, registers, uploads,
// reads back and confirms them as the signed-in teacher
// (src/lib/recorder/nativeMic.ts reads this plugin). No recording rule, no
// key and no server call lives in Swift.
//
// Why native: a web page loses getUserMedia when the screen locks. iOS's own
// audio engine keeps recording behind a locked screen when the app has the
// `audio` background mode and the engine was started while the app was in
// front (the teacher's Record tap).
//
// The audio waits here until the page reads it (HecBatchStore: memory, then
// files), so nothing is lost while the web view is paused. Each batch carries
// the wall-clock time its last sample was heard, so it is placed where it was
// heard, however late it is read.

import Foundation
import AVFoundation
import UIKit
import Capacitor

@objc(HecPhoneMicPlugin)
public class HecPhoneMicPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HecPhoneMicPlugin"
    public let jsName = "HecPhoneMic"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    /// What the page receives: 16-bit, 48 kHz, mono (the recorder's format for the teacher track).
    static let outRate: Double = 48000
    private let outFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: HecPhoneMicPlugin.outRate, channels: 1, interleaved: true)!

    private var engine = AVAudioEngine()
    private var converter: AVAudioConverter?
    private let store = HecBatchStore()
    /// The teacher pressed Record and has not stopped: restart after a call, a route change, a media reset.
    private var wantRunning = false
    private var observing = false
    private var lastError: String?

    // MARK: calls from the page

    @objc func start(_ call: CAPPluginCall) {
        let keepScreenOn = call.getBool("keepScreenOn") ?? true
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                guard granted else { call.reject("microphone_denied"); return }
                do {
                    self.wantRunning = true
                    try self.startEngine()
                    // The screen need not stay on (locking is fine now), but not locking by itself is kinder while teaching.
                    UIApplication.shared.isIdleTimerDisabled = keepScreenOn
                    call.resolve(self.statusDict())
                } catch {
                    self.lastError = error.localizedDescription
                    self.store.event("error", detail: error.localizedDescription)
                    call.reject("start_failed: \(error.localizedDescription)")
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.wantRunning = false
            self.stopEngine()
            try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
            UIApplication.shared.isIdleTimerDisabled = false
            call.resolve(self.statusDict())
        }
    }

    /// The batches after `after`, at most `max`; the ones up to `after` are let go (the page has them).
    @objc func read(_ call: CAPPluginCall) {
        let after = call.getInt("after") ?? -1
        let max = Swift.max(1, Swift.min(call.getInt("max") ?? 40, 200))
        let r = store.read(after: after, max: max)
        call.resolve([
            "batches": r.batches.map { b -> [String: Any] in
                ["seq": b.seq, "endUnixMs": b.endUnixMs, "sampleRate": Int(HecPhoneMicPlugin.outRate), "frames": b.frames, "b64": b.data.base64EncodedString()]
            },
            "events": r.events.map { e -> [String: Any] in ["kind": e.kind, "atUnixMs": e.atUnixMs, "detail": e.detail ?? NSNull()] },
            "running": engine.isRunning,
            "waiting": r.waiting,
        ])
    }

    @objc func status(_ call: CAPPluginCall) { call.resolve(statusDict()) }

    private func statusDict() -> [String: Any] {
        let p: String
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: p = "granted"
        case .denied: p = "denied"
        default: p = "undetermined"
        }
        return ["running": engine.isRunning, "permission": p, "waiting": store.waiting, "lastError": lastError ?? NSNull(), "sampleRate": Int(HecPhoneMicPlugin.outRate)]
    }

    // MARK: the engine

    private func startEngine() throws {
        if engine.isRunning { return }
        let session = AVAudioSession.sharedInstance()
        // playAndRecord keeps recording in the background; .measurement turns off iOS's voice processing and
        // automatic gain (as the web recorder asks for echoCancellation/noiseSuppression/autoGainControl false);
        // mixWithOthers lets the teacher still play class audio from the phone.
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.mixWithOthers, .allowBluetooth, .defaultToSpeaker])
        try? session.setPreferredSampleRate(HecPhoneMicPlugin.outRate)
        try? session.setPreferredIOBufferDuration(0.02)
        try session.setActive(true)
        observeOnce()

        let input = engine.inputNode
        let inFormat = input.outputFormat(forBus: 0)
        guard inFormat.sampleRate > 0, inFormat.channelCount > 0 else {
            throw NSError(domain: "HecPhoneMic", code: 1, userInfo: [NSLocalizedDescriptionKey: "no microphone input"])
        }
        converter = AVAudioConverter(from: inFormat, to: outFormat)
        input.removeTap(onBus: 0)
        // About 0.1 s a buffer at 48 kHz.
        input.installTap(onBus: 0, bufferSize: 4800, format: inFormat) { [weak self] buffer, when in
            self?.handle(buffer, when)
        }
        engine.prepare()
        try engine.start()
        lastError = nil
    }

    private func stopEngine() {
        engine.inputNode.removeTap(onBus: 0)
        if engine.isRunning { engine.stop() }
    }

    /// Runs on the audio tap's thread: convert to 48 kHz Int16 and keep it, stamped.
    private func handle(_ buffer: AVAudioPCMBuffer, _ when: AVAudioTime) {
        guard let converter = converter, buffer.frameLength > 0 else { return }
        // Wall-clock time of the buffer's first sample: now, less how long ago the hardware heard it.
        let nowWall = Date().timeIntervalSince1970
        var startWall = nowWall - Double(buffer.frameLength) / buffer.format.sampleRate
        if when.isHostTimeValid {
            let age = AVAudioTime.seconds(forHostTime: mach_absolute_time()) - AVAudioTime.seconds(forHostTime: when.hostTime)
            if age >= 0 && age < 5 { startWall = nowWall - age }
        }
        let ratio = outFormat.sampleRate / buffer.format.sampleRate
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio + 64)
        guard let out = AVAudioPCMBuffer(pcmFormat: outFormat, frameCapacity: capacity) else { return }
        var fed = false
        var err: NSError?
        let status = converter.convert(to: out, error: &err) { _, outStatus in
            if fed { outStatus.pointee = .noDataNow; return nil }
            fed = true
            outStatus.pointee = .haveData
            return buffer
        }
        if status == .error || out.frameLength == 0 {
            if let e = err { store.event("error", detail: e.localizedDescription) }
            return
        }
        let frames = Int(out.frameLength)
        guard let ch = out.int16ChannelData else { return }
        let data = Data(bytes: ch[0], count: frames * 2)
        let endWall = startWall + Double(frames) / outFormat.sampleRate
        store.append(endUnixMs: endWall * 1000, frames: frames, data: data)
    }

    // MARK: interruptions (a call, Siri), route changes, media services reset

    private func observeOnce() {
        if observing { return }
        observing = true
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(onInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        nc.addObserver(self, selector: #selector(onRouteChange(_:)), name: AVAudioSession.routeChangeNotification, object: nil)
        nc.addObserver(self, selector: #selector(onMediaReset(_:)), name: AVAudioSession.mediaServicesWereResetNotification, object: nil)
        nc.addObserver(self, selector: #selector(onEngineConfig(_:)), name: .AVAudioEngineConfigurationChange, object: nil)
    }

    @objc private func onInterruption(_ n: Notification) {
        guard let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            store.event("interrupted", detail: nil)
        } else {
            store.event("resumed", detail: nil)
            restartSoon()
        }
    }

    @objc private func onRouteChange(_ n: Notification) {
        guard let raw = n.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: raw) else { return }
        if reason == .newDeviceAvailable || reason == .oldDeviceUnavailable {
            store.event("route_changed", detail: String(describing: reason.rawValue))
            restartSoon()
        }
    }

    @objc private func onEngineConfig(_ n: Notification) {
        guard (n.object as AnyObject?) === engine else { return }
        restartSoon()
    }

    @objc private func onMediaReset(_ n: Notification) {
        // The engine is gone with the media services: a new one.
        DispatchQueue.main.async {
            self.engine = AVAudioEngine()
            self.restartSoon()
        }
    }

    private func restartSoon() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            guard self.wantRunning else { return }
            self.stopEngine()
            do {
                try self.startEngine()
                self.store.event("restarted", detail: nil)
            } catch {
                self.lastError = error.localizedDescription
                self.store.event("error", detail: "could not restart: \(error.localizedDescription)")
            }
        }
    }
}
