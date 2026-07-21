import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // serverExternalPackages previously held @huggingface/transformers and
  // onnxruntime-node to keep Turbopack from bundling the native ONNX binary.
  // Embeddings moved to the Gemini API, so both dependencies are gone and the
  // serverless function no longer carries ~349 MB of native code.
};

export default nextConfig;
