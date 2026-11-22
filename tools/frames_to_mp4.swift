// 22.11.2026: JPG frames -> H.264 mp4 (macOS AVFoundation, no extra tools). swiftc -O tools/frames_to_mp4.swift -o /tmp/frames_to_mp4
// usage: frames_to_mp4 <framesDir> <fps> <out.mp4>
import Foundation
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count == 4, let fps = Int32(args[2]) else { print("usage: frames_to_mp4 <dir> <fps> <out.mp4>"); exit(1) }
let dir = URL(fileURLWithPath: args[1]); let outURL = URL(fileURLWithPath: args[3])
let files = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".jpg") }.sorted()
guard let first = NSImage(contentsOf: dir.appendingPathComponent(files[0])), let rep = first.representations.first else { print("no frames"); exit(1) }
let w = rep.pixelsWide, h = rep.pixelsHigh
try? FileManager.default.removeItem(at: outURL)
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_500_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h])
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)

func buffer(_ url: URL) -> CVPixelBuffer? {
  guard let img = NSImage(contentsOf: url), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
  var pb: CVPixelBuffer?
  CVPixelBufferCreate(kCFAllocatorDefault, w, h, kCVPixelFormatType_32ARGB, nil, &pb)
  guard let b = pb else { return nil }
  CVPixelBufferLockBaseAddress(b, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(b), width: w, height: h, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(b), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)
  ctx?.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  CVPixelBufferUnlockBaseAddress(b, [])
  return b
}
for (i, f) in files.enumerated() {
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.01) }
  if let b = buffer(dir.appendingPathComponent(f)) { adaptor.append(b, withPresentationTime: CMTime(value: Int64(i), timescale: fps)) }
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
print("mp4", files.count, "frames", writer.status == .completed ? "ok" : "failed: \(String(describing: writer.error))")
