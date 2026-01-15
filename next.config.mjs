/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/consulta-cnae',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
