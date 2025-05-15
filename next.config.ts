
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // typescript: {
  //   ignoreBuildErrors: true, // Removing to enforce type checking
  // },
  // eslint: {
  //   ignoreDuringBuilds: true, // Removing to enforce linting
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
