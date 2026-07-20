import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/heavy server deps that must not be bundled by Turbopack.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
