import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Anexos e documentos são enviados por server actions (limite padrão: 1 MB).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
