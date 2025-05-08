import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.hashnode.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Ignore optional ws deps
    config.ignoreWarnings = [
      { module: /node_modules\/ws\/lib\// }
    ];
    return config;
  },
};

export default nextConfig;

