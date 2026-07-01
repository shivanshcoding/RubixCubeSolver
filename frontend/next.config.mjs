/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize heavy barrel files like react-icons to prevent compilation bottlenecks
    optimizePackageImports: ["react-icons"],
  },
  // Isolate Turbopack to the current directory to prevent it from traversing the parent WEBD directory
  // which causes infinite watching/compiling due to the outer package-lock.json
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
