// Writes a soft foreground (subject) mask for a photo with Apple's Vision framework (macOS 14+).
// usage: swift subject_mask.swift in.webp out-mask.png
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil)!
let cg = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([req])
guard let obs = req.results?.first else { print("no subject"); exit(1) }
print("instances:", obs.allInstances.count)
let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let ci = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
let out = URL(fileURLWithPath: args[2])
try ctx.writePNGRepresentation(of: ci, to: out, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
print("ok", cg.width, cg.height)
