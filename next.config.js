/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 서버 액션 기본 바디 크기 제한(1MB)은 마스터데이터 엑셀 업로드에는 너무 작습니다.
    serverActions: { bodySizeLimit: '5mb' },
  },
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
