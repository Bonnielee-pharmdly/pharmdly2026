/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 관리자 마스터데이터 화면의 제품 사진은 Supabase Storage(공개 버킷)에 올라갑니다.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
