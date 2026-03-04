/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita perda de formatação/CSS após mudanças: desativa cache do webpack no dev
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },
};

export default nextConfig;
