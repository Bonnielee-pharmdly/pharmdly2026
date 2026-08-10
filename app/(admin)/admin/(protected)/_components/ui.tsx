// docs/design-system-toss.md 토큰을 코드로 옮긴 공용 컴포넌트.
// 관리자 화면 전체가 이 몇 개만 조합해서 쓰도록 한다 — 화면마다 스타일이 흩어지지 않게.
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold text-toss-text">{title}</h1>
        {description && <p className="mt-1.5 text-[14px] text-toss-faint">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// 크기별로 패딩을 전부 따로 정의한다(base에 공통 패딩을 두면 같은 CSS 속성을 두 utility
// 클래스가 같이 지정하게 되어 Tailwind가 어느 걸 먼저 생성하느냐에 따라 결과가 갈릴 수 있음).
const BUTTON_BASE = 'inline-flex items-center justify-center rounded-control font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BUTTON_VARIANT = {
  primary: 'bg-toss-blue text-white hover:bg-toss-blueDark',
  secondary: 'bg-toss-bg text-toss-sub hover:bg-toss-line',
  danger: 'bg-toss-redBg text-toss-red hover:bg-[#fbdcdc]',
  ghost: 'text-toss-sub hover:bg-toss-bg',
} as const;
const BUTTON_SIZE = {
  md: 'px-[18px] py-[11px] text-[14px]',
  sm: 'px-3 py-1.5 text-[13px] rounded-lg',
  xs: 'px-1.5 py-1 text-[11px] rounded-lg leading-none',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANT;
  size?: keyof typeof BUTTON_SIZE;
}) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  variant = 'secondary',
  size = 'sm',
  className = '',
  href,
  children,
}: {
  variant?: keyof typeof BUTTON_VARIANT;
  size?: keyof typeof BUTTON_SIZE;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`}>
      {children}
    </a>
  );
}

const BADGE_TONE = {
  blue: 'bg-toss-blueBg text-toss-blueDark',
  green: 'bg-toss-greenBg text-toss-green',
  yellow: 'bg-toss-yellowBg text-toss-yellow',
  red: 'bg-toss-redBg text-toss-red',
  gray: 'bg-toss-bg text-toss-faint',
} as const;

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE_TONE; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-badge px-[11px] py-[5px] text-[12px] font-medium ${BADGE_TONE[tone]}`}>
      {children}
    </span>
  );
}

// FastAPI 백엔드가 계산·소유하는 값 옆에 붙이는 표시. 이 값은 여기서 직접 고치지 않는다.
export function FastApiOwnedTag() {
  return (
    <span
      title="이 값은 FastAPI 예약/재고 서비스가 계산합니다. 관리자 패널은 조회만 하고 직접 수정하지 않습니다."
      className="ml-1.5 inline-flex items-center rounded-badge bg-toss-blueBg px-[9px] py-[3px] text-[11px] font-medium text-toss-blueDark"
    >
      🔒 FastAPI 관리
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card bg-toss-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  );
}

// 표 대신 쓰는 행 리스트. Row 사이에만 옅은 구분선, 마지막 행은 구분선 없음.
export function RowList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-toss-line">{children}</div>;
}

export function Row({ children, faded = false, className = '' }: { children: ReactNode; faded?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-4 py-4 ${faded ? 'opacity-50' : ''} ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, description }: { children: ReactNode; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[16px] font-semibold text-toss-text">{children}</h2>
      {description && <p className="mt-0.5 text-[13px] text-toss-faint">{description}</p>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-toss-line bg-toss-surface p-10 text-center text-[14px] text-toss-faint">
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-control bg-toss-bg px-4 py-3 text-[14px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30 ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-control bg-toss-bg px-4 py-3 text-[14px] text-toss-text focus:outline-none focus:ring-2 focus:ring-toss-blue/30 ${props.className ?? ''}`}
    />
  );
}

// 알약(pill) 형태 탭
export function PillTabs<T extends string>({
  options,
  value,
  hrefFor,
}: {
  options: { key: T; label: string }[];
  value: T;
  hrefFor: (key: T) => string;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full bg-toss-bg p-1">
      {options.map((o) => (
        <a
          key={o.key}
          href={hrefFor(o.key)}
          className={
            'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ' +
            (value === o.key ? 'bg-toss-text text-white' : 'text-toss-faint hover:text-toss-sub')
          }
        >
          {o.label}
        </a>
      ))}
    </div>
  );
}
