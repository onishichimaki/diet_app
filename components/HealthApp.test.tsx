import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import HealthApp from './HealthApp';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

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
    fireEvent.click(screen.getByRole('button', { name: '設定を開く' }));
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
});
