// 스토어 React 훅 — subscribe 기반 리렌더링
import { useEffect, useState, useCallback } from 'react';
import * as store from '@/lib/store';
import { CardStatus } from '@/lib/state-machine';

export function useStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = store.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);

  return {
    activeRun: store.getActiveRun(),
    getAllCardStates: store.getAllCardStates,
    getCardStatus: store.getCardStatus,
    getCardState: store.getCardState,
    getCardResult: store.getCardResult,
  };
}

export function useCardStatus(cardCode: string): CardStatus | null {
  const [status, setStatus] = useState<CardStatus | null>(() =>
    store.getCardStatus(cardCode)
  );

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setStatus(store.getCardStatus(cardCode));
    });
    return unsub;
  }, [cardCode]);

  return status;
}

export function useActiveRun() {
  const [run, setRun] = useState(() => store.getActiveRun());

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setRun(store.getActiveRun());
    });
    return unsub;
  }, []);

  return run;
}
