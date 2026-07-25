'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, BedDouble, Download, Footprints, Home, Plus, RotateCcw, Target, Trash2, Utensils, Weight, X } from 'lucide-react';
import { DayRecord, Exercise, Goals, HealthStore, MEAL_TYPES, Meal, MealType, average, dateKey, emptyDay, exerciseMinutes, loadHealthStore, periodRecords, sampleStore, storageKey, totals } from '@/lib/health';

type Tab = '今日' | '記録' | 'レポート' | '目標';
type Modal = 'meal' | 'exercise' | null;
const tabs: Array<[Tab, typeof Home]> = [['今日', Home], ['記録', Plus], ['レポート', BarChart3], ['目標', Target]];
const fieldClass = 'mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-base focus:border-leaf focus:ring-2 focus:ring-leaf/20';

export default function HealthApp() {
  const [tab, setTab] = useState<Tab>('今日');
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [store, setStore] = useState<HealthStore>(sampleStore);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => { queueMicrotask(() => { setStore(loadHealthStore(localStorage.getItem(storageKey))); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) localStorage.setItem(storageKey, JSON.stringify(store)); }, [loaded, store]);

  const day = store.records[selectedDate] ?? emptyDay(selectedDate);
  const updateDay = (next: DayRecord) => setStore(current => ({ ...current, sample: false, records: { ...current.records, [selectedDate]: next } }));
  const nutrients = useMemo(() => totals(day.meals), [day.meals]);

  const saveMeal = (form: FormData) => {
    const meal: Meal = { id: crypto.randomUUID(), type: form.get('type') as MealType, name: String(form.get('name')).trim(), kcal: Number(form.get('kcal')), protein: Number(form.get('protein')), fat: Number(form.get('fat')), carbs: Number(form.get('carbs')) };
    updateDay({ ...day, meals: [...day.meals, meal] }); setModal(null);
  };
  const saveExercise = (form: FormData) => {
    const exercise: Exercise = { id: crypto.randomUUID(), name: String(form.get('name')).trim(), minutes: Number(form.get('minutes')), kcal: Number(form.get('kcal')) };
    updateDay({ ...day, exercises: [...day.exercises, exercise] }); setModal(null);
  };

  return <main className="safe-bottom mx-auto min-h-screen max-w-lg bg-cream">
    <Header date={selectedDate} tab={tab} onDate={setSelectedDate} />
    {store.sample && <div className="mx-5 mb-4 flex items-center justify-between rounded-2xl bg-lime/20 px-4 py-3 text-sm"><span><b>サンプルデータ</b>を表示中</span><button className="font-bold text-leaf" onClick={() => setStore({ ...sampleStore, records: {}, sample: false })}>空で始める</button></div>}
    <div className="space-y-5 px-5">
      {tab === '今日' && <Dashboard day={day} goals={store.goals} nutrients={nutrients} />}
      {tab === '記録' && <Records day={day} updateDay={updateDay} open={setModal} />}
      {tab === 'レポート' && <Reports store={store} date={selectedDate} />}
      {tab === '目標' && <Settings store={store} setStore={setStore} />}
    </div>
    <BottomNav tab={tab} setTab={setTab} />
    {modal === 'meal' && <EntryDialog title="食事を追加" close={() => setModal(null)} action={saveMeal}><MealFields /></EntryDialog>}
    {modal === 'exercise' && <EntryDialog title="運動を追加" close={() => setModal(null)} action={saveExercise}><ExerciseFields /></EntryDialog>}
  </main>;
}

function Header({ date, tab, onDate }: { date: string; tab: Tab; onDate: (date: string) => void }) {
  const label = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'full' }).format(new Date(`${date}T12:00:00`));
  return <header className="px-5 pb-4 pt-7"><div className="flex items-end justify-between"><div><p className="text-sm text-gray-500">{label}</p><h1 className="text-2xl font-bold">{tab === '今日' ? '今日も健やかに' : tab}</h1></div><label className="text-xs font-semibold text-leaf">日付<input aria-label="表示する日付" className="block rounded-lg border bg-white p-2 text-ink" type="date" value={date} onChange={e => onDate(e.target.value)} /></label></div></header>;
}

function Dashboard({ day, goals, nutrients }: { day: DayRecord; goals: Goals; nutrients: ReturnType<typeof totals> }) {
  const percent = Math.min(100, nutrients.kcal / goals.kcal * 100);
  return <>
    <section className="card p-5"><p className="text-sm font-semibold text-leaf">今日のエネルギー</p><div className="mt-3 flex items-center justify-between"><div><p className="text-3xl font-bold">{nutrients.kcal.toLocaleString()} <span className="text-sm font-normal text-gray-400">kcal</span></p><p className="mt-1 text-sm text-gray-500">目標まで {Math.max(0, goals.kcal - nutrients.kcal)} kcal</p></div><div aria-label={`カロリー目標の${Math.round(percent)}%`} className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(#3d7a5a ${percent}%,#edf0eb 0)` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white font-bold">{Math.round(percent)}%</div></div></div><div className="mt-5 grid grid-cols-3 border-t pt-4 text-center"><Macro value={nutrients.protein} label="たんぱく質" /><Macro value={nutrients.fat} label="脂質" /><Macro value={nutrients.carbs} label="炭水化物" /></div></section>
    <h2 className="text-lg font-bold">からだの記録</h2><div className="grid grid-cols-2 gap-3"><Metric icon={<Weight />} label="体重" value={day.weight === null ? '未記録' : `${day.weight} kg`} /><Metric icon={<Footprints />} label="歩数・距離" value={`${day.steps.toLocaleString()}歩`} note={`${day.distance} km`} /><Metric icon={<Activity />} label="運動" value={`${exerciseMinutes(day)} 分`} note={`${day.exercises.length}件`} /><Metric icon={<BedDouble />} label="睡眠" value={day.sleep === null ? '未記録' : `${day.sleep} 時間`} /></div>
    <MealList meals={day.meals} />
  </>;
}
const Macro = ({ value, label }: { value: number; label: string }) => <div><b>{value}g</b><p className="text-[11px] text-gray-400">{label}</p></div>;
const Metric = ({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string }) => <div className="card p-4"><div className="mb-3 text-leaf">{icon}</div><p className="text-xs text-gray-500">{label}</p><b className="text-lg">{value}</b>{note && <p className="text-xs text-gray-400">{note}</p>}</div>;

function Records({ day, updateDay, open }: { day: DayRecord; updateDay: (day: DayRecord) => void; open: (modal: Modal) => void }) {
  return <>
    <div className="grid grid-cols-2 gap-3"><button onClick={() => open('meal')} className="flex items-center justify-center gap-2 rounded-2xl bg-leaf p-4 font-bold text-white"><Utensils size={19} />食事を追加</button><button onClick={() => open('exercise')} className="flex items-center justify-center gap-2 rounded-2xl bg-ink p-4 font-bold text-white"><Activity size={19} />運動を追加</button></div>
    <MealList meals={day.meals} remove={id => updateDay({ ...day, meals: day.meals.filter(item => item.id !== id) })} />
    <section className="card p-5"><h2 className="font-bold">運動記録</h2>{day.exercises.length === 0 ? <Empty /> : day.exercises.map(item => <div className="mt-3 flex items-center justify-between border-t pt-3" key={item.id}><div><b>{item.name}</b><p className="text-sm text-gray-500">{item.minutes}分・{item.kcal} kcal</p></div><DeleteButton label={`${item.name}を削除`} onClick={() => updateDay({ ...day, exercises: day.exercises.filter(exercise => exercise.id !== item.id) })} /></div>)}</section>
    <section className="card p-5"><h2 className="font-bold">測定値</h2><div className="mt-4 grid grid-cols-2 gap-3"><NumberField label="体重 (kg)" value={day.weight ?? ''} max={500} set={value => updateDay({ ...day, weight: value || null })} /><NumberField label="歩数" value={day.steps} max={200000} set={value => updateDay({ ...day, steps: value })} /><NumberField label="距離 (km)" value={day.distance} max={1000} set={value => updateDay({ ...day, distance: value })} /><NumberField label="睡眠 (時間)" value={day.sleep ?? ''} max={24} set={value => updateDay({ ...day, sleep: value || null })} /></div></section>
  </>;
}

function MealList({ meals, remove }: { meals: Meal[]; remove?: (id: string) => void }) {
  return <section className="card p-5"><h2 className="mb-2 font-bold">食事記録</h2>{MEAL_TYPES.map(type => { const list = meals.filter(meal => meal.type === type); return <div key={type} className="border-t py-3 first:border-0"><div className="flex justify-between"><b className="text-sm">{type}</b><span className="text-sm text-gray-400">{list.reduce((sum, item) => sum + item.kcal, 0)} kcal</span></div>{list.length === 0 ? <p className="mt-1 text-sm text-gray-300">まだ記録がありません</p> : list.map(meal => <div key={meal.id} className="mt-2 flex items-center justify-between"><div><p className="text-sm">{meal.name}</p><p className="text-xs text-gray-400">P {meal.protein} / F {meal.fat} / C {meal.carbs}</p></div>{remove && <DeleteButton label={`${meal.name}を削除`} onClick={() => remove(meal.id)} />}</div>)}</div>; })}</section>;
}

function Reports({ store, date }: { store: HealthStore; date: string }) {
  const [period, setPeriod] = useState<'日' | '週' | '月'>('週');
  const records = periodRecords(store, date, period); const calories = records.map(day => totals(day.meals).kcal); const max = Math.max(...calories, store.goals.kcal, 1); const avgWeight = average(records.map(day => day.weight)); const avgSleep = average(records.map(day => day.sleep)); const avgSteps = average(records.map(day => day.steps));
  return <><div className="grid grid-cols-3 rounded-xl bg-white p-1">{(['日', '週', '月'] as const).map(value => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg p-2 text-sm ${period === value ? 'bg-leaf font-bold text-white' : ''}`}>{value}</button>)}</div><section className="card p-5"><p className="text-sm text-gray-500">{period}間カロリー推移</p><div className="mt-6 flex h-40 items-end gap-1 border-b" aria-label={`${period}間のカロリー棒グラフ`}>{records.map((day, index) => <div title={`${day.date}: ${calories[index]} kcal`} key={day.date} className="min-w-1 flex-1 rounded-t bg-leaf/80" style={{ height: `${Math.max(2, calories[index] / max * 100)}%` }} />)}</div><div className="mt-4 grid grid-cols-2 gap-3"><Summary label="平均カロリー" value={`${Math.round(average(calories))} kcal`} /><Summary label="平均歩数" value={`${Math.round(avgSteps).toLocaleString()} 歩`} /><Summary label="平均体重" value={avgWeight ? `${avgWeight.toFixed(1)} kg` : '未記録'} /><Summary label="平均睡眠" value={avgSleep ? `${avgSleep.toFixed(1)} 時間` : '未記録'} /></div></section></>;
}
const Summary = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl bg-cream p-3"><p className="text-xs text-gray-500">{label}</p><b>{value}</b></div>;

function Settings({ store, setStore }: { store: HealthStore; setStore: (store: HealthStore) => void }) {
  const setGoal = (key: keyof Goals, value: number) => setStore({ ...store, sample: false, goals: { ...store.goals, [key]: value } });
  const download = () => { const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `health-pocket-${dateKey()}.json`; link.click(); URL.revokeObjectURL(link.href); };
  return <><section className="card p-5"><h2 className="text-xl font-bold">わたしの目標</h2><div className="mt-4 space-y-3"><NumberField label="1日のカロリー (kcal)" value={store.goals.kcal} max={10000} set={value => setGoal('kcal', value)} /><NumberField label="目標体重 (kg)" value={store.goals.weight} max={500} set={value => setGoal('weight', value)} /><NumberField label="1日の歩数" value={store.goals.steps} max={200000} set={value => setGoal('steps', value)} /><NumberField label="睡眠時間" value={store.goals.sleep} max={24} set={value => setGoal('sleep', value)} /></div></section><section className="card p-5"><h2 className="font-bold">データ管理</h2><button onClick={download} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border p-3 font-bold"><Download size={18} />JSONをエクスポート</button><button onClick={() => { if (confirm('すべての記録をサンプルデータに戻しますか？')) setStore(sampleStore); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 p-3 font-bold text-red-600"><RotateCcw size={18} />データを初期化</button></section></>;
}

function EntryDialog({ title, close, action, children }: { title: string; close: () => void; action: (form: FormData) => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-30 flex items-end bg-black/40" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="mx-auto w-full max-w-lg rounded-t-3xl bg-white p-6"><div className="flex items-center justify-between"><h2 id="dialog-title" className="text-xl font-bold">{title}</h2><button aria-label="閉じる" onClick={close} className="rounded-full p-2"><X /></button></div><form action={action} className="mt-4 space-y-3">{children}<div className="flex gap-2 pt-2"><button type="button" onClick={close} className="flex-1 rounded-xl border p-3">キャンセル</button><button className="flex-1 rounded-xl bg-leaf p-3 font-bold text-white">保存</button></div></form></div></div>;
}
const MealFields = () => <><label className="block text-sm font-semibold">食事区分<select name="type" className={fieldClass}>{MEAL_TYPES.map(type => <option key={type}>{type}</option>)}</select></label><label className="block text-sm font-semibold">料理名<input autoFocus required maxLength={80} name="name" className={fieldClass} /></label><div className="grid grid-cols-2 gap-2">{([['kcal', 'カロリー'], ['protein', 'たんぱく質 (g)'], ['fat', '脂質 (g)'], ['carbs', '炭水化物 (g)']] as const).map(([name, label]) => <label key={name} className="text-sm font-semibold">{label}<input required min="0" max="20000" step="0.1" type="number" name={name} className={fieldClass} /></label>)}</div></>;
const ExerciseFields = () => <><label className="block text-sm font-semibold">運動名<input autoFocus required maxLength={80} name="name" className={fieldClass} /></label><label className="block text-sm font-semibold">時間（分）<input required min="1" max="1440" type="number" name="minutes" className={fieldClass} /></label><label className="block text-sm font-semibold">消費カロリー<input required min="0" max="20000" type="number" name="kcal" className={fieldClass} /></label></>;
const NumberField = ({ label, value, max, set }: { label: string; value: number | ''; max: number; set: (value: number) => void }) => <label className="block text-sm font-semibold">{label}<input type="number" min="0" max={max} step="0.1" value={value} onChange={event => set(Number(event.target.value))} className={fieldClass} /></label>;
const DeleteButton = ({ label, onClick }: { label: string; onClick: () => void }) => <button aria-label={label} onClick={onClick} className="rounded-full p-2 text-red-500"><Trash2 size={17} /></button>;
const Empty = () => <p className="mt-3 text-sm text-gray-400">まだ記録がありません</p>;
function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) { return <nav aria-label="メインナビゲーション" className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-lg -translate-x-1/2 justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">{tabs.map(([value, Icon]) => <button key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)} className={`grid min-w-16 justify-items-center gap-1 p-2 text-xs ${tab === value ? 'font-bold text-leaf' : 'text-gray-400'}`}><Icon size={21} />{value}</button>)}</nav>; }
