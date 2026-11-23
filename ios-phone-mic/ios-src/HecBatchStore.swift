// The audio the page has not read yet (HecPhoneMicPlugin). In memory up to
// `memoryLimit`, then one file a batch in Caches, so a lesson recorded with
// the web view paused (locked phone) is kept whole: 48 kHz 16-bit mono is
// about 5.8 MB a minute, about 520 MB for 90 minutes.
//
// A batch is let go once the page has read past it (read(after:)). Files left
// by an earlier run are removed when the app starts: their recording's state
// lived in that run's page, so nothing could place them.

import Foundation

final class HecBatchStore {
    struct Batch { let seq: Int; let endUnixMs: Double; let frames: Int; let data: Data }
    struct Event { let kind: String; let atUnixMs: Double; let detail: String? }
    private struct Entry { let seq: Int; let endUnixMs: Double; let frames: Int; var data: Data?; var file: URL? }

    private let lock = NSLock()
    private var entries: [Entry] = []
    private var events: [Event] = []
    private var nextSeq = 0
    private var memoryBytes = 0
    private let memoryLimit = 8 * 1024 * 1024
    private let dir: URL

    init() {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        dir = caches.appendingPathComponent("hec-phone-mic", isDirectory: true)
        try? FileManager.default.removeItem(at: dir)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    var waiting: Int { lock.lock(); defer { lock.unlock() }; return entries.count }

    func append(endUnixMs: Double, frames: Int, data: Data) {
        lock.lock(); defer { lock.unlock() }
        let seq = nextSeq
        nextSeq += 1
        if memoryBytes + data.count <= memoryLimit {
            entries.append(Entry(seq: seq, endUnixMs: endUnixMs, frames: frames, data: data, file: nil))
            memoryBytes += data.count
        } else {
            let url = dir.appendingPathComponent("\(seq).pcm")
            do {
                try data.write(to: url, options: [.atomic])
                entries.append(Entry(seq: seq, endUnixMs: endUnixMs, frames: frames, data: nil, file: url))
            } catch {
                // The disk is full: kept in memory rather than lost (iOS may end the app if this grows without end).
                entries.append(Entry(seq: seq, endUnixMs: endUnixMs, frames: frames, data: data, file: nil))
                memoryBytes += data.count
                events.append(Event(kind: "error", atUnixMs: Date().timeIntervalSince1970 * 1000, detail: "the phone's storage is full"))
            }
        }
    }

    func event(_ kind: String, detail: String?) {
        lock.lock(); defer { lock.unlock() }
        events.append(Event(kind: kind, atUnixMs: Date().timeIntervalSince1970 * 1000, detail: detail))
    }

    func read(after: Int, max: Int) -> (batches: [Batch], events: [Event], waiting: Int) {
        lock.lock(); defer { lock.unlock() }
        // Let go of what the page already has.
        while let first = entries.first, first.seq <= after {
            if let d = first.data { memoryBytes -= d.count }
            if let f = first.file { try? FileManager.default.removeItem(at: f) }
            entries.removeFirst()
        }
        var out: [Batch] = []
        for e in entries.prefix(max) {
            if let d = e.data { out.append(Batch(seq: e.seq, endUnixMs: e.endUnixMs, frames: e.frames, data: d)) }
            else if let f = e.file, let d = try? Data(contentsOf: f) { out.append(Batch(seq: e.seq, endUnixMs: e.endUnixMs, frames: e.frames, data: d)) }
        }
        let ev = events
        events = []
        return (out, ev, entries.count - out.count)
    }
}
