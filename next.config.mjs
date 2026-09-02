/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    // Lint is run as its own CI/step; do not fail production builds on it.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
