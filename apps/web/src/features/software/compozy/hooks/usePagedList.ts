"use client";

import { useCallback, useRef, useState } from "react";
import { useAccessGuard } from "./useAccessGuard";

type Page<T> = { items: T[]; nextCursor: string | null };

export function usePagedList<T>(initial: Page<T>, load: (cursor?: string) => Promise<Page<T>>) {
  const guard = useAccessGuard();
  const [items, setItems] = useState(initial.items);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [failed, setFailed] = useState(false);
  const cursor = useRef(initial.nextCursor);

  const apply = useCallback((page: Page<T>, append: boolean) => {
    setItems((current) => (append ? [...current, ...page.items] : page.items));
    setNextCursor(page.nextCursor);
    cursor.current = page.nextCursor;
    setFailed(false);
  }, []);

  const reload = useCallback(async () => {
    try { apply(await load(), false); } catch (error) { guard(error); setFailed(true); }
  }, [apply, guard, load]);

  const loadMore = useCallback(async () => {
    if (!cursor.current) return;
    try { apply(await load(cursor.current), true); } catch (error) { guard(error); setFailed(true); }
  }, [apply, guard, load]);

  return { items, nextCursor, failed, reload, loadMore };
}
