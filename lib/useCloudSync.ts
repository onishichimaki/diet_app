'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { HealthStore, loadHealthStore } from './health';
import { getSupabaseClient, supabaseConfigured, supabaseHost } from './supabase';

export type CloudState = {
  configured: boolean;
  user: User | null;
  status: '未設定' | '未ログイン' | '同期中' | '同期済み' | 'エラー';
  message: string;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function useCloudSync(
  store: HealthStore,
  setStore: Dispatch<SetStateAction<HealthStore>>,
  loaded: boolean,
): CloudState {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<CloudState['status']>(supabaseConfigured ? '未ログイン' : '未設定');
  const [message, setMessage] = useState('');
  const hydratedUser = useRef<string | null>(null);
  const storeRef = useRef(store);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    const hydrate = async (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      if (!nextUser || !loaded) {
        hydratedUser.current = null;
        setStatus('未ログイン');
        return;
      }
      if (hydratedUser.current === nextUser.id) return;
      setStatus('同期中');
      const { data, error } = await supabase
        .from('health_stores')
        .select('data')
        .eq('user_id', nextUser.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setStatus('エラー');
        setMessage(`クラウドの読み込みに失敗しました: ${error.message}`);
        return;
      }
      if (data?.data) {
        setStore(loadHealthStore(JSON.stringify(data.data)));
      } else {
        const { error: uploadError } = await supabase.from('health_stores').insert({
          user_id: nextUser.id,
          data: storeRef.current,
        });
        if (uploadError) {
          setStatus('エラー');
          setMessage(`端末データの移行に失敗しました: ${uploadError.message}`);
          return;
        }
      }
      hydratedUser.current = nextUser.id;
      setStatus('同期済み');
      setMessage('クラウドと同期しました');
    };

    supabase.auth.getUser().then(({ data }) => hydrate(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => hydrate(session?.user ?? null));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loaded, setStore]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user || hydratedUser.current !== user.id || !loaded) return;
    setStatus('同期中');
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from('health_stores').upsert({
        user_id: user.id,
        data: store,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        setStatus('エラー');
        setMessage(`保存できませんでした: ${error.message}`);
      } else {
        setStatus('同期済み');
        setMessage(`同期済み ${new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [loaded, store, user]);

  const sendMagicLink = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setStatus('同期中');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus('エラー');
      setMessage(error.message === 'Failed to fetch'
        ? `Supabase（${supabaseHost || '接続先不明'}）へ接続できません。通信環境を確認して再試行してください。`
        : `ログインメールを送信できませんでした: ${error.message === '{}' ? 'Supabaseの公開キーまたは認証設定を確認してください。' : error.message}`);
    } else {
      setStatus('未ログイン');
      setMessage('ログイン用リンクをメールで送りました');
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    hydratedUser.current = null;
    setUser(null);
    setStatus('未ログイン');
    setMessage('ログアウトしました。端末内データは残っています');
  };

  return { configured: supabaseConfigured, user, status, message, sendMagicLink, signOut };
}
