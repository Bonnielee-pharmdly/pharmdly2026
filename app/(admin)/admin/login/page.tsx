'use client';

// React 18(이 프로젝트의 react-dom 버전)에서는 useActionState 가 아니라
// react-dom 의 useFormState/useFormStatus 를 씁니다. (useActionState는 React 19부터)
import { useFormState, useFormStatus } from 'react-dom';
import { signInAdmin, type LoginState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-control bg-toss-blue py-3 text-[14px] font-medium text-white transition-colors hover:bg-toss-blueDark disabled:opacity-50"
    >
      {pending ? '로그인 중…' : '로그인'}
    </button>
  );
}

// 주의: 이 로그인 페이지는 requireAdmin 가드를 타지 않습니다.
// 가드는 app/(admin)/admin/(protected)/layout.tsx 에만 있고, login 은 그 밖에 있습니다.
export default function AdminLoginPage() {
  const [state, formAction] = useFormState<LoginState, FormData>(signInAdmin, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-toss-bg font-sans">
      <form action={formAction} className="w-[340px] rounded-card bg-toss-surface p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h1 className="mb-5 text-[18px] font-semibold text-toss-text">팜들리 관리자 로그인</h1>
        <input
          name="email"
          type="email"
          placeholder="이메일"
          required
          className="mb-2 w-full rounded-control bg-toss-bg px-4 py-3 text-[14px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
        />
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          required
          className="mb-4 w-full rounded-control bg-toss-bg px-4 py-3 text-[14px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
        />
        {state?.error && <p className="mb-4 text-[13px] text-toss-red">{state.error}</p>}
        <SubmitButton />
      </form>
    </div>
  );
}
