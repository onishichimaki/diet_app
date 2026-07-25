import HealthApp from '@/components/HealthApp';

type AppTab = '今日' | '記録' | 'レポート' | '目標';
const tabs: AppTab[] = ['今日', '記録', 'レポート', '目標'];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = tabs.includes(tab as AppTab) ? tab as AppTab : '今日';
  return <HealthApp initialTab={initialTab} />;
}
