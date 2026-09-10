/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep type errors fatal. Actions also gates deployments on lint and tests.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
