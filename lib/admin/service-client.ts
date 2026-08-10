import 'server-only';
import { createClient } from '@supabase/supabase-js';

// service_role 키를 쓰는 관리자 전용 클라이언트. RLS 를 우회하므로
// 절대 클라이언트 컴포넌트에서 import 하면 안 됩니다. ('server-only' 가 이를 강제)
// 이 클라이언트를 쓰기 전에는 반드시 requireAdmin() 으로 관리자 인증을 먼저 검증하세요.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
