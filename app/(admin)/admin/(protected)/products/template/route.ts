import { requireAdmin } from '@/lib/admin/auth';
import { buildTemplateWorkbook } from '@/lib/admin/products-excel';

// ⚠️ Route Handler는 (protected)/layout.tsx의 페이지 가드를 거치지 않고 직접 호출 가능한
// 엔드포인트다. 서버 액션과 같은 이유로 여기서도 requireAdmin()을 직접 호출해야 한다.
export async function GET() {
  await requireAdmin();
  const buffer = buildTemplateWorkbook();

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="products-template.xlsx"',
    },
  });
}
