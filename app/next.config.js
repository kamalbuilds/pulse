/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Transpile packages that use ESM and need special handling
  transpilePackages: ['@arcium-hq/client', '@noble/curves', '@noble/hashes'],

  webpack: (config, { isServer, webpack }) => {
    // Handle node modules that don't work with webpack 5
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };

    if (isServer) {
      // On server side, exclude these packages completely
      config.externals = config.externals || [];
      config.externals.push({
        '@arcium-hq/client': 'commonjs @arcium-hq/client',
        '@noble/curves': 'commonjs @noble/curves',
        '@noble/hashes': 'commonjs @noble/hashes',
      });
    }

    // Prevent webpack from mangling BigInt operations in crypto libraries
    config.optimization = config.optimization || {};
    config.optimization.minimize = false; // Disable minification temporarily to test

    // Add plugin to handle process polyfill
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
      })
    );

    return config;
  },
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    NEXT_PUBLIC_ARCIUM_NETWORK: process.env.NEXT_PUBLIC_ARCIUM_NETWORK || 'testnet',
  }
};

module.exports = nextConfig; 