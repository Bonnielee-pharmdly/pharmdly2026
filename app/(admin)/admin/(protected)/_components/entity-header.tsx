import { Badge, LinkButton } from './ui';

const TONE_MAP = { active: 'green', warn: 'yellow', danger: 'red' } as const;

// 상세 화면 상단 헤더 — 대행(로그인 대신 수행)이 아니라 "조회 중"임을 표시합니다.
export function EntityHeader({
  icon,
  title,
  subtitle,
  backHref,
  statusBadge,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  backHref: string;
  statusBadge?: { label: string; tone: 'active' | 'warn' | 'danger' };
}) {
  return (
    <div className="mb-7 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[22px] font-semibold text-toss-text">{icon} {title}</h1>
          {statusBadge && <Badge tone={TONE_MAP[statusBadge.tone]}>{statusBadge.label}</Badge>}
        </div>
        {subtitle && <p className="mt-1.5 text-[14px] text-toss-faint">{subtitle}</p>}
      </div>
      <LinkButton href={backHref} variant="secondary" size="sm">← 목록으로</LinkButton>
    </div>
  );
}

export { FastApiOwnedTag } from './ui';
