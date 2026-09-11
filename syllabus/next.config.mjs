/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run separately; don't block prototype builds on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
