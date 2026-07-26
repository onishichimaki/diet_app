import { describe, expect, it } from 'vitest';
import { normalizePublicEnv, resolveSupabaseUrl } from './supabase';

describe('normalizePublicEnv', () => {
  it('値だけの環境変数をそのまま使う', () => {
    expect(normalizePublicEnv(' https://example.supabase.co ')).toBe('https://example.supabase.co');
  });

  it('誤って貼り付けたKEY=VALUE形式も補正する', () => {
    expect(normalizePublicEnv('NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"')).toBe('https://example.supabase.co');
  });
});

describe('resolveSupabaseUrl', () => {
  it('誤って登録されたプレースホルダーを実プロジェクトURLへ補正する', () => {
    expect(resolveSupabaseUrl('https://xxxxxxxxxxxx.supabase.co')).toBe('https://wpufsuukptuswzvsfemg.supabase.co');
  });
});
