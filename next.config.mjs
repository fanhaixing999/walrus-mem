/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',      // 开启纯静态导出，这是布署在 Walrus Sites 的硬性前提
  images: {
    unoptimized: true,   // 静态导出环境下必须关闭图片优化
  },
};

export default nextConfig;
