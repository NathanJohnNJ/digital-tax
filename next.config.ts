import type { NextConfig } from "next";
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {hostname: "avatars.githubusercontent.com"}
    ]
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx']
};

const withMDX = createMDX({
  extension: /\.mdx?$/
});

export default withMDX(nextConfig);
