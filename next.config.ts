import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep screens you've visited (and fully prefetched ones) in the browser so
    // switching between modules and tabs doesn't wait on the server. Saving
    // anything revalidates the data, so an edit is never followed by stale screens.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
