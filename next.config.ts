import type { NextConfig } from "next";
import createMDX from '@next/mdx';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {hostname: "avatars.githubusercontent.com"}
    ]
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  allowedDevOrigins: ['192.168.0.123']
};

const withMDX = createMDX({
  extension: /\.mdx?$/
});

export default withMDX(nextConfig);
