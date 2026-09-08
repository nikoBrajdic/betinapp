/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors now fail the build. The codebase typechecks clean, and since a
  // push to main deploys straight to production, the build is the only gate
  // there is. Was `typescript: { ignoreBuildErrors: true }`, which meant a
  // green build said nothing about type safety.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
