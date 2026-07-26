import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HealthApp from './HealthApp';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('HealthApp interactions', () => {
  it('記録ボタンから飲食物画面へ移動する', () => {
    render(<HealthApp />);
    fireEvent.click(screen.getByRole('button', { name: '記録' }));
    expect(screen.getByRole('heading', { name: '飲食物', level: 1 })).toBeTruthy();
  });

  it('開始ボタンで運動入力ダイアログを開く', () => {
    render(<HealthApp />);
    fireEvent.click(screen.getByRole('button', { name: '開始' }));
    expect(screen.getByRole('dialog', { name: '運動を追加' })).toBeTruthy();
  });

  it('メニューボタンで設定画面を開き、戻るボタンで今日へ戻る', () => {
    render(<HealthApp />);
    fireEvent.click(screen.getByRole('button', { name: 'クイックメニューを開く' }));
    expect(screen.getByRole('dialog', { name: 'クイックメニュー' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '目標とデータ設定' }));
    expect(screen.getByRole('heading', { name: '目標' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '今日へ戻る' }));
    expect(screen.getByRole('heading', { name: 'Premium' })).toBeTruthy();
  });

  it('食事区分フィルターと栄養詳細を操作できる', () => {
    render(<HealthApp initialTab="記録" />);
    fireEvent.click(screen.getByRole('button', { name: '朝食' }));
    expect(screen.getByText('ヨーグルトとベリー')).toBeTruthy();
    expect(screen.queryByText('チキンサラダボウル')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '全栄養素を見る' }));
    expect(screen.getByText('食物繊維', { exact: false })).toBeTruthy();
  });

  it('前日・翌日・カレンダーで表示日を変更できる', () => {
    render(<HealthApp />);
    const dateInput = screen.getByLabelText('表示する日付') as HTMLInputElement;
    const initial = dateInput.value;
    fireEvent.click(screen.getByRole('button', { name: '前日' }));
    expect(dateInput.value).not.toBe(initial);
    fireEvent.click(screen.getByRole('button', { name: '翌日' }));
    expect(dateInput.value).toBe(initial);
    fireEvent.change(dateInput, { target: { value: '2026-01-15' } });
    expect(dateInput.value).toBe('2026-01-15');
  });

  it('Supabase未設定時にクラウド同期の設定案内を表示する', () => {
    render(<HealthApp initialTab="目標" />);
    expect(screen.getByRole('heading', { name: 'クラウド同期' })).toBeTruthy();
    expect(screen.getByText('Supabaseの接続設定が必要です。')).toBeTruthy();
    expect(screen.getByText('未設定')).toBeTruthy();
  });

  it('Geminiの推定値を食事フォームへ反映する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ estimate: { name: '親子丼', kcal: 620, protein: 28, fat: 18, carbs: 82, confidence: '中', note: '一般的な1人分です。' } }),
    }));
    render(<HealthApp initialTab="記録" />);
    fireEvent.click(screen.getByRole('button', { name: '食事を追加' }));
    fireEvent.change(screen.getByLabelText('料理名'), { target: { value: '親子丼' } });
    fireEvent.change(screen.getByLabelText('材料・分量（AI補完用）'), { target: { value: '鶏肉100g、卵1個、ご飯200g' } });
    fireEvent.click(screen.getByRole('button', { name: 'AIで栄養情報を補完' }));
    expect(await screen.findByDisplayValue('620')).toBeTruthy();
    expect(screen.getByDisplayValue('28')).toBeTruthy();
    expect(screen.getByText('推定精度: 中。一般的な1人分です。 数値を確認してから保存してください。')).toBeTruthy();
  });
});
