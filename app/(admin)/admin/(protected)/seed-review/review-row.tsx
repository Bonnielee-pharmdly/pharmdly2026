'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveSeedReview, type SeedReviewRow, type SeedAction, type Category } from './actions';
import { Badge, Button } from '../_components/ui';

const CELL_INPUT =
  'w-full rounded-lg bg-toss-bg px-2 py-1.5 text-[13px] text-toss-text placeholder:text-toss-placeholder focus:outline-none focus:ring-2 focus:ring-toss-blue/30';

// 효능 분류는 최대 3개까지만 선택할 수 있다.
const MAX_CATEGORIES = 3;

// 이름 입력이 필요한 액션들. link_drug/reject 는 입력 없이 바로 실행.
const NEEDS_NAME: SeedAction[] = ['new_drug', 'new_supplement', 'new_general', 'new_animal'];

// 이름 + 제조사(entpName) 를 함께 입력받는 액션들.
const NEEDS_ENTP: SeedAction[] = ['new_drug', 'new_animal'];

const PANEL_LABEL: Record<string, string> = {
  new_drug: '의약품(목록에 없음)으로 등록',
  new_supplement: '건기식으로 등록',
  new_general: '잡화/기타로 등록',
  new_animal: '동물의약품으로 등록',
};

export function ReviewRow({ row, categories }: { row: SeedReviewRow; categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // 이름 입력이 필요한 액션을 고르면 이 행 아래에 입력 패널을 연다.
  const [panel, setPanel] = useState<SeedAction | null>(null);
  const [name, setName] = useState(row.raw_name ?? '');
  const [entpName, setEntpName] = useState('');
  // 이 행에서 선택한 효능 분류 id (최대 3개). 행마다 독립적으로 관리된다.
  const [selectedCats, setSelectedCats] = useState<number[]>([]);

  // 대분류(parent_id=null) 아래 소분류를 묶은 2단 트리. sort_order 는 로더에서 이미 정렬됨.
  const tree = useMemo(() => {
    const parents = categories.filter((c) => c.parent_id == null);
    return parents.map((parent) => ({
      parent,
      children: categories.filter((c) => c.parent_id === parent.category_id),
    }));
  }, [categories]);

  const atMax = selectedCats.length >= MAX_CATEGORIES;

  const toggleCat = (id: number) =>
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CATEGORIES) return prev; // 3개 초과 선택 방지
      return [...prev, id];
    });

  const run = (params: Parameters<typeof approveSeedReview>[0]) =>
    startTransition(async () => {
      await approveSeedReview(params);
      // 처리된 항목은 목록에서 사라져야 하므로 새로고침.
      router.refresh();
    });

  const openPanel = (action: SeedAction) => {
    setName(row.raw_name ?? '');
    setEntpName('');
    setSelectedCats([]);
    setPanel(action);
  };

  const submitPanel = () => {
    if (!panel || !name.trim()) return;
    run({
      reviewId: row.id,
      action: panel,
      name: name.trim(),
      entpName: NEEDS_ENTP.includes(panel) ? entpName.trim() || null : null,
      // 수동 등록일 때만 효능 분류를 넘긴다(패널은 new_* 액션에서만 열림).
      categoryIds: selectedCats,
    });
  };

  const linkDrug = () =>
    run({ reviewId: row.id, action: 'link_drug', ref: row.matched_item_seq });

  const reject = () => {
    if (!confirm('이 항목을 버릴까요?')) return;
    run({ reviewId: row.id, action: 'reject' });
  };

  const canLink = row.band === 'mid' && !!row.suggested_drug_name;

  return (
    <>
      <tr className="border-b border-toss-line align-middle">
        <td className="py-2 pl-4 pr-2">
          <span className="font-medium text-toss-text">{row.raw_name ?? '—'}</span>
        </td>
        <td className="py-2 pr-2 text-toss-sub">{row.barcode ?? '—'}</td>
        <td className="py-2 pr-2">
          <Badge tone={row.band === 'mid' ? 'yellow' : 'gray'}>
            {row.band === 'mid' ? '중간' : '낮음'}
          </Badge>
        </td>
        <td className="py-2 pr-2 tabular-nums text-toss-sub">
          {row.similarity == null ? '—' : row.similarity.toFixed(2)}
        </td>
        <td className="py-2 pr-2 text-toss-sub">{row.suggested_drug_name ?? '—'}</td>
        <td className="py-2 pr-4">
          <div className="flex flex-wrap justify-end gap-1 whitespace-nowrap">
            {canLink && (
              <Button size="xs" variant="primary" onClick={linkDrug} disabled={pending}>
                이 약 맞음
              </Button>
            )}
            <Button size="xs" onClick={() => openPanel('new_drug')} disabled={pending}>
              의약품(목록에 없음)
            </Button>
            <Button size="xs" onClick={() => openPanel('new_supplement')} disabled={pending}>
              건기식
            </Button>
            <Button size="xs" onClick={() => openPanel('new_general')} disabled={pending}>
              잡화/기타
            </Button>
            <Button size="xs" onClick={() => openPanel('new_animal')} disabled={pending}>
              동물의약품
            </Button>
            <Button size="xs" variant="danger" onClick={reject} disabled={pending}>
              버림
            </Button>
          </div>
        </td>
      </tr>

      {panel && (
        <tr className="border-b border-toss-line bg-toss-bg/40">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-medium text-toss-faint">{PANEL_LABEL[panel]}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름"
                  className={`${CELL_INPUT} w-56`}
                />
                {NEEDS_ENTP.includes(panel) && (
                  <input
                    value={entpName}
                    onChange={(e) => setEntpName(e.target.value)}
                    placeholder="제조사"
                    className={`${CELL_INPUT} w-44`}
                  />
                )}
              </div>

              {/* 효능 분류 선택 (수동 등록 시 최대 3개). 선택 없이도 등록 가능. */}
              {tree.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-toss-faint">
                    효능 분류 · 최대 {MAX_CATEGORIES}개 선택 ({selectedCats.length}/{MAX_CATEGORIES})
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {tree.map(({ parent, children }) =>
                      children.length > 0 ? (
                        <div key={parent.category_id}>
                          <div className="mb-1 text-[11px] font-medium text-toss-faint">
                            {parent.icon} {parent.category_name}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {children.map((c) => (
                              <CategoryCheckbox
                                key={c.category_id}
                                cat={c}
                                checked={selectedCats.includes(c.category_id)}
                                disabled={pending || (atMax && !selectedCats.includes(c.category_id))}
                                onToggle={() => toggleCat(c.category_id)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div key={parent.category_id}>
                          {/* 소분류가 없는 대분류는 그 자체를 선택 항목으로. */}
                          <div className="mb-1 text-[11px] font-medium text-toss-faint opacity-0">.</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            <CategoryCheckbox
                              cat={parent}
                              checked={selectedCats.includes(parent.category_id)}
                              disabled={pending || (atMax && !selectedCats.includes(parent.category_id))}
                              onToggle={() => toggleCat(parent.category_id)}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button size="xs" variant="primary" onClick={submitPanel} disabled={pending || !name.trim()}>
                  {pending ? '처리 중…' : '등록'}
                </Button>
                <Button size="xs" onClick={() => setPanel(null)} disabled={pending}>
                  취소
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// 효능 분류 하나에 대한 체크박스. 최대치에 도달하면 미선택 항목은 disabled 로 막힌다.
function CategoryCheckbox({
  cat,
  checked,
  disabled,
  onToggle,
}: {
  cat: Category;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1 text-[12px] ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer text-toss-sub'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="h-3.5 w-3.5 accent-toss-blue"
      />
      <span>
        {cat.icon} {cat.category_name}
      </span>
    </label>
  );
}
