'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Apple, ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Cloud, Download, Dumbbell, Flame, HeartPulse, Home, LogOut, MoonStar, MoreHorizontal, Plus, RotateCcw, Ruler, Sparkles, Trash2, Weight, X } from 'lucide-react';
import { DayRecord, Exercise, Goals, HealthStore, MEAL_TYPES, Meal, MealType, average, dateKey, emptyDay, loadHealthStore, periodRecords, ReportPeriod, sampleStore, storageKey, totals } from '@/lib/health';
import { CloudState, useCloudSync } from '@/lib/useCloudSync';

type Tab = '今日' | '記録' | 'レポート' | '目標';
type Modal = 'meal' | 'exercise' | 'menu' | null;
const tabs: Array<[Tab, typeof Home, string]> = [['今日', Home, '今日'], ['記録', Activity, 'フィットネス'], ['レポート', MoonStar, '睡眠'], ['目標', HeartPulse, '健康']];
const fieldClass = 'mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-base focus:border-leaf focus:ring-2 focus:ring-leaf/20';

export default function HealthApp({ initialTab = '今日' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [store, setStore] = useState<HealthStore>(sampleStore);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const cloud = useCloudSync(store, setStore, loaded);

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

  return <main className="safe-bottom mx-auto min-h-screen max-w-lg overflow-hidden bg-[#f5f7fa]">
    <Header date={selectedDate} tab={tab} onDate={setSelectedDate} onBack={() => setTab('今日')} onMenu={() => setModal('menu')} />
    {store.sample && <div className="mx-5 mb-4 flex items-center justify-between rounded-2xl bg-lime/20 px-4 py-3 text-sm"><span><b>サンプルデータ</b>を表示中</span><button className="font-bold text-leaf" onClick={() => setStore({ ...sampleStore, records: {}, sample: false })}>空で始める</button></div>}
    <div className="space-y-5 px-5">
      {tab === '今日' && <Dashboard day={day} goals={store.goals} nutrients={nutrients} onRecord={() => setTab('記録')} onStart={() => setModal('exercise')} />}
      {tab === '記録' && <Records day={day} store={store} date={selectedDate} updateDay={updateDay} open={setModal} />}
      {tab === 'レポート' && <Reports store={store} date={selectedDate} />}
      {tab === '目標' && <Settings store={store} setStore={setStore} cloud={cloud} />}
    </div>
    <BottomNav tab={tab} setTab={setTab} />
    {modal === 'meal' && <EntryDialog title="食事を追加" close={() => setModal(null)} action={saveMeal}><MealFields /></EntryDialog>}
    {modal === 'exercise' && <EntryDialog title="運動を追加" close={() => setModal(null)} action={saveExercise}><ExerciseFields /></EntryDialog>}
    {modal === 'menu' && <QuickMenu close={() => setModal(null)} openSettings={() => { setModal(null); setTab('目標'); }} openRecords={() => { setModal(null); setTab('記録'); }} />}
  </main>;
}

function Header({ date, tab, onDate, onBack, onMenu }: { date: string; tab: Tab; onDate: (date: string) => void; onBack: () => void; onMenu: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`));
  const title = tab === '記録' ? '飲食物' : tab === '目標' ? '目標' : 'Premium';
  const shiftDate = (amount: number) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); onDate(dateKey(value)); };
  const openCalendar = () => { const picker = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null; if (picker?.showPicker) picker.showPicker(); else picker?.click(); };
  return <header className="premium-header px-5 pb-5 pt-10">
    <div className="header-main"><button onClick={onBack} aria-label="今日へ戻る" className="header-circle"><ArrowLeft /></button><h1>{title}</h1><button onClick={onMenu} aria-label="クイックメニューを開く" className="header-circle avatar"><MoreHorizontal /></button></div>
    <div className="date-navigation"><p>{label}</p><div><button onClick={() => shiftDate(-1)} aria-label="前日"><ChevronLeft /></button><button onClick={() => shiftDate(1)} aria-label="翌日"><ChevronRight /></button><button onClick={openCalendar} aria-label="カレンダーを開く"><CalendarDays /></button><input ref={inputRef} aria-label="表示する日付" type="date" value={date} onChange={e => { if (e.target.value) onDate(e.target.value); }} /></div></div>
  </header>;
}

function Dashboard({ day, goals, nutrients, onRecord, onStart }: { day: DayRecord; goals: Goals; nutrients: ReturnType<typeof totals>; onRecord: () => void; onStart: () => void }) {
  const stepPercent = Math.min(100, day.steps / goals.steps * 100);
  const caloriePercent = Math.min(100, nutrients.kcal / goals.kcal * 100);
  const burned = day.exercises.reduce((sum, item) => sum + item.kcal, 0);
  return <>
    <section className="hero-grid">
      <div className="step-ring" style={{ '--progress': `${stepPercent * 2.8}deg` } as React.CSSProperties}>
        <div className="step-ring-inner"><span>歩数</span><strong>{day.steps.toLocaleString()}</strong><small>目標 {goals.steps.toLocaleString()}</small></div>
      </div>
      <div className="space-y-2.5">
        <DashboardTile tone="lavender" icon={<MoonStar />} label="睡眠時間" value={day.sleep === null ? 'データなし' : `${day.sleep} 時間`} />
        <DashboardTile tone="amber" icon={<Weight />} label="体重" value={day.weight === null ? '未記録' : `${day.weight} kg`} note={`目標 ${goals.weight} kg`} />
        <DashboardTile tone="aqua" icon={<Flame />} label="消費カロリー" value={`${burned.toLocaleString()} kcal`} progress={burned / 500 * 100} />
      </div>
    </section>
    <section className="metric-grid">
      <DashboardTile tone="sky" icon={<Apple />} label="炭水化物" value={`${nutrients.carbs} g`} />
      <DashboardTile tone="blue" icon={<Apple />} label="摂取カロリー" value={`${nutrients.kcal.toLocaleString()} kcal`} note={`あと ${Math.max(0, goals.kcal - nutrients.kcal)}`} progress={caloriePercent} />
      <DashboardTile tone="sky" icon={<Apple />} label="たんぱく質" value={`${nutrients.protein} g`} />
      <DashboardTile tone="sky" icon={<Apple />} label="脂質" value={`${nutrients.fat} g`} />
      <DashboardTile tone="mint" icon={<Dumbbell />} label="エクササイズ" value={`${day.exercises.length}/3`} progress={day.exercises.length / 3 * 100} />
      <DashboardTile tone="mint" icon={<Ruler />} label="距離" value={`${day.distance} km`} progress={day.distance / 8 * 100} />
    </section>
    <div className="grid grid-cols-2 gap-3"><button onClick={onRecord} className="action-button"><Plus />記録</button><button onClick={onStart} className="action-button"><Activity />開始</button></div>
    <section className="insight-card"><div className="flex items-center gap-2 text-cyan-700"><Sparkles size={18}/><span className="text-xs font-bold">今日のインサイト</span></div><h2>{nutrients.protein}gのタンパク質摂取、今日もいい調子です</h2><p>栄養と活動のバランスが整っています。あと少し歩くと今日の歩数目標を達成できます。</p></section>
  </>;
}

function DashboardTile({ tone, icon, label, value, note, progress }: { tone: string; icon: React.ReactNode; label: string; value: string; note?: string; progress?: number }) {
  return <div className={`dashboard-tile ${tone}`}><span className="tile-icon">{icon}</span><div className="min-w-0"><p>{label}</p><strong>{value}</strong>{note && <small>{note}</small>}</div>{progress !== undefined && <i style={{ width: `${Math.min(100, progress)}%` }} />}</div>;
}

function Records({ day, store, date, updateDay, open }: { day: DayRecord; store: HealthStore; date: string; updateDay: (day: DayRecord) => void; open: (modal: Modal) => void }) {
  const [period, setPeriod] = useState<ReportPeriod>('日');
  const [showAllNutrients, setShowAllNutrients] = useState(false);
  const [mealFilter, setMealFilter] = useState<MealType | 'すべて'>('すべて');
  const days = periodRecords(store, date, period);
  const periodTotals = totals(days.flatMap(record => record.meals));
  const nutrients = { kcal: Math.round(periodTotals.kcal / days.length), protein: Math.round(periodTotals.protein / days.length), fat: Math.round(periodTotals.fat / days.length), carbs: Math.round(periodTotals.carbs / days.length) };
  const visibleMeals = mealFilter === 'すべて' ? day.meals : day.meals.filter(meal => meal.type === mealFilter);
  return <>
    <div className="record-toolbar"><div><p>今日</p><h2>飲食物</h2></div><button onClick={() => open('meal')} aria-label="食事を追加"><Plus /></button></div>
    <div className="record-period">{['日', '週', '月', '3か月', '年'].map(value => <button key={value} onClick={() => setPeriod(value as ReportPeriod)} className={period === value ? 'active' : ''}>{value}</button>)}</div>
    <section className="nutrition-panel"><div className="flex items-center justify-between"><h2>主要栄養素の目標</h2><button onClick={() => setShowAllNutrients(value => !value)}>{showAllNutrients ? '閉じる' : '全栄養素を見る'}</button></div><p className="nutrition-copy">炭水化物、たんぱく質、脂質のバランスを保つことは、体力や気力の維持と回復に重要です。</p><NutrientProgress label="炭水化物" value={nutrients.carbs} goal={207} color="#05617a" /><NutrientProgress label="脂質" value={nutrients.fat} goal={50} color="#a1262c" /><NutrientProgress label="たんぱく質" value={nutrients.protein} goal={108} color="#8a5b00" />{showAllNutrients && <div className="all-nutrients"><span>摂取カロリー <b>{nutrients.kcal.toLocaleString()} kcal</b></span><span>食物繊維 <b>{Math.round(nutrients.carbs * .08)} g</b></span><span>糖質 <b>{Math.round(nutrients.carbs * .72)} g</b></span></div>}</section>
    <div className="meal-filters"><button onClick={() => setMealFilter('すべて')} className={mealFilter === 'すべて' ? 'active' : ''}>✓ すべて</button>{MEAL_TYPES.map(type => <button onClick={() => setMealFilter(type)} className={mealFilter === type ? 'active' : ''} key={type}>{type}</button>)}</div>
    <MealList meals={visibleMeals} remove={id => updateDay({ ...day, meals: day.meals.filter(item => item.id !== id) })} />
    <button onClick={() => open('exercise')} className="action-button dark"><Activity size={19} />運動を追加</button>
    <section className="card p-5"><h2 className="font-bold">運動記録</h2>{day.exercises.length === 0 ? <Empty /> : day.exercises.map(item => <div className="mt-3 flex items-center justify-between border-t pt-3" key={item.id}><div><b>{item.name}</b><p className="text-sm text-gray-500">{item.minutes}分・{item.kcal} kcal</p></div><DeleteButton label={`${item.name}を削除`} onClick={() => updateDay({ ...day, exercises: day.exercises.filter(exercise => exercise.id !== item.id) })} /></div>)}</section>
    <section className="card p-5"><h2 className="font-bold">測定値</h2><div className="mt-4 grid grid-cols-2 gap-3"><NumberField label="体重 (kg)" value={day.weight ?? ''} max={500} set={value => updateDay({ ...day, weight: value || null })} /><NumberField label="歩数" value={day.steps} max={200000} set={value => updateDay({ ...day, steps: value })} /><NumberField label="距離 (km)" value={day.distance} max={1000} set={value => updateDay({ ...day, distance: value })} /><NumberField label="睡眠 (時間)" value={day.sleep ?? ''} max={24} set={value => updateDay({ ...day, sleep: value || null })} /></div></section>
  </>;
}

function NutrientProgress({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const percent = value / goal * 100; const status = percent < 75 ? '範囲より下' : percent > 120 ? '範囲超過' : '範囲内';
  return <div className="nutrient-progress"><div><b>{label} · {Math.round(percent)}% · {value}/{goal} g</b><span className={status === '範囲内' ? 'good' : ''}>{status}</span></div><div className="track"><i style={{ width: `${Math.min(100, percent)}%`, background: color }} /><em style={{ left: `${Math.min(92, 100)}%` }} /></div></div>;
}

function MealList({ meals, remove }: { meals: Meal[]; remove?: (id: string) => void }) {
  return <section className="meal-list">{MEAL_TYPES.map(type => {
    const list = meals.filter(meal => meal.type === type);
    const kcal = list.reduce((sum, item) => sum + item.kcal, 0);
    return <details key={type} open={list.length > 0}>
      <summary><div><b>{type}</b><span>{list.length}個のアイテム</span></div><strong>{kcal.toLocaleString()} kcal</strong></summary>
      {list.length === 0 ? <Empty /> : list.map(meal => <div className="meal-row" key={meal.id}><div><p>{meal.name}</p><small>P {meal.protein} · F {meal.fat} · C {meal.carbs}</small></div>{remove && <DeleteButton label={`${meal.name}を削除`} onClick={() => remove(meal.id)} />}</div>)}
    </details>;
  })}</section>;
}

function Reports({ store, date }: { store: HealthStore; date: string }) {
  const [period, setPeriod] = useState<ReportPeriod>('週');
  const records = periodRecords(store, date, period);
  const calories = records.map(day => totals(day.meals).kcal);
  const values = {
    carbs: records.map(day => totals(day.meals).carbs), protein: records.map(day => totals(day.meals).protein), fat: records.map(day => totals(day.meals).fat), calories,
    burned: records.map(day => day.exercises.reduce((sum, item) => sum + item.kcal, 0)), exercise: records.map(day => day.exercises.length), steps: records.map(day => day.steps), distance: records.map(day => day.distance),
  };
  return <><div className="period-tabs">{(['日', '週', '月'] as const).map(value => <button key={value} onClick={() => setPeriod(value as ReportPeriod)} className={period === value ? 'active' : ''}>{value}</button>)}</div><div className="report-grid">
    <TrendCard title="炭水化物" value={`${Math.round(average(values.carbs))} g`} values={values.carbs} status="範囲内" />
    <TrendCard title="たんぱく質" value={`${Math.round(average(values.protein))} g`} values={values.protein} status="目標まで少し" />
    <TrendCard title="脂質" value={`${Math.round(average(values.fat))} g`} values={values.fat} status="範囲内" />
    <TrendCard title="摂取カロリー" value={`${Math.round(average(calories)).toLocaleString()} kcal`} values={calories} status="良好" bars />
    <TrendCard title="消費カロリー" value={`${Math.round(average(values.burned))} kcal`} values={values.burned} status="活動的" bars />
    <TrendCard title="エクササイズした日" value={`${values.exercise.filter(Boolean).length}/${records.length}`} values={values.exercise} status="継続中" bars />
    <TrendCard title="歩数" value={`${Math.round(average(values.steps)).toLocaleString()}`} values={values.steps} status="あと少し" />
    <TrendCard title="距離" value={`${average(values.distance).toFixed(1)} km`} values={values.distance} status="良好" />
  </div></>;
}

function TrendCard({ title, value, values, status, bars }: { title: string; value: string; values: number[]; status: string; bars?: boolean }) {
  const max = Math.max(...values, 1); const points = values.slice(-7);
  const coordinates = points.map((item, index) => `${8 + index * (84 / Math.max(1, points.length - 1))},${76 - item / max * 62}`).join(' ');
  return <article className="trend-card"><p>{title}</p><strong>{value}</strong>{bars ? <div className="mini-chart bars">{points.map((item, index) => <i key={index} style={{ height: `${Math.max(8, item / max * 100)}%` }} />)}</div> : <svg className="line-chart" viewBox="0 0 100 82" role="img" aria-label={`${title}の推移`}><line x1="0" y1="42" x2="100" y2="42" /><polyline points={coordinates}/>{points.map((item,index) => <circle key={index} cx={8 + index * (84 / Math.max(1, points.length - 1))} cy={76 - item / max * 62} r="3" />)}</svg>}<div className="week-labels"><i>木</i><i>金</i><i>土</i><i>日</i><i>月</i><i>火</i><i>水</i></div><span>{status}</span></article>;
}


function Settings({ store, setStore, cloud }: { store: HealthStore; setStore: (store: HealthStore) => void; cloud: CloudState }) {
  const setGoal = (key: keyof Goals, value: number) => setStore({ ...store, sample: false, goals: { ...store.goals, [key]: value } });
  const download = () => { const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `health-pocket-${dateKey()}.json`; link.click(); URL.revokeObjectURL(link.href); };
  return <><CloudPanel cloud={cloud} /><section className="card p-5"><h2 className="text-xl font-bold">わたしの目標</h2><div className="mt-4 space-y-3"><NumberField label="1日のカロリー (kcal)" value={store.goals.kcal} max={10000} set={value => setGoal('kcal', value)} /><NumberField label="目標体重 (kg)" value={store.goals.weight} max={500} set={value => setGoal('weight', value)} /><NumberField label="1日の歩数" value={store.goals.steps} max={200000} set={value => setGoal('steps', value)} /><NumberField label="睡眠時間" value={store.goals.sleep} max={24} set={value => setGoal('sleep', value)} /></div></section><section className="card p-5"><h2 className="font-bold">データ管理</h2><button onClick={download} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border p-3 font-bold"><Download size={18} />JSONをエクスポート</button><button onClick={() => { if (confirm('すべての記録をサンプルデータに戻しますか？')) setStore(sampleStore); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 p-3 font-bold text-red-600"><RotateCcw size={18} />データを初期化</button></section></>;
}

function CloudPanel({ cloud }: { cloud: CloudState }) {
  const [email, setEmail] = useState('');
  return <section className="card p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold"><Cloud size={21} />クラウド同期</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cloud.status === '同期済み' ? 'bg-emerald-100 text-emerald-700' : cloud.status === 'エラー' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{cloud.status}</span></div>{!cloud.configured ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><b>Supabaseの接続設定が必要です。</b><p className="mt-1">VercelへNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを登録してください。</p></div> : cloud.user ? <div className="mt-4"><p className="text-sm text-gray-500">{cloud.user.email} で同期しています</p><button onClick={cloud.signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border p-3 font-bold"><LogOut size={18} />ログアウト</button></div> : <form className="mt-4" onSubmit={event => { event.preventDefault(); void cloud.sendMagicLink(email); }}><label className="text-sm font-semibold">メールアドレス<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} /></label><button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-leaf p-3 font-bold text-white"><Cloud size={18} />ログインリンクを送る</button><p className="mt-2 text-xs text-gray-500">届いたメールのリンクを開くとログインし、この端末の記録をクラウドへ移行します。</p></form>}{cloud.message && <p role="status" className="mt-3 text-sm text-gray-600">{cloud.message}</p>}</section>;
}

function QuickMenu({ close, openSettings, openRecords }: { close: () => void; openSettings: () => void; openRecords: () => void }) {
  return <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/30 px-5 pt-24" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section role="dialog" aria-modal="true" aria-labelledby="quick-menu-title" className="quick-menu"><div><h2 id="quick-menu-title">クイックメニュー</h2><button onClick={close} aria-label="メニューを閉じる"><X /></button></div><button onClick={openRecords}><Plus />食事・運動を記録</button><button onClick={openSettings}><HeartPulse />目標とデータ設定</button></section></div>;
}

function EntryDialog({ title, close, action, children }: { title: string; close: () => void; action: (form: FormData) => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-30 flex items-end bg-black/40" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="mx-auto w-full max-w-lg rounded-t-3xl bg-white p-6"><div className="flex items-center justify-between"><h2 id="dialog-title" className="text-xl font-bold">{title}</h2><button aria-label="閉じる" onClick={close} className="rounded-full p-2"><X /></button></div><form action={action} className="mt-4 space-y-3">{children}<div className="flex gap-2 pt-2"><button type="button" onClick={close} className="flex-1 rounded-xl border p-3">キャンセル</button><button className="flex-1 rounded-xl bg-leaf p-3 font-bold text-white">保存</button></div></form></div></div>;
}
const MealFields = () => <><label className="block text-sm font-semibold">食事区分<select name="type" className={fieldClass}>{MEAL_TYPES.map(type => <option key={type}>{type}</option>)}</select></label><label className="block text-sm font-semibold">料理名<input autoFocus required maxLength={80} name="name" className={fieldClass} /></label><div className="grid grid-cols-2 gap-2">{([['kcal', 'カロリー'], ['protein', 'たんぱく質 (g)'], ['fat', '脂質 (g)'], ['carbs', '炭水化物 (g)']] as const).map(([name, label]) => <label key={name} className="text-sm font-semibold">{label}<input required min="0" max="20000" step="0.1" type="number" name={name} className={fieldClass} /></label>)}</div></>;
const ExerciseFields = () => <><label className="block text-sm font-semibold">運動名<input autoFocus required maxLength={80} name="name" className={fieldClass} /></label><label className="block text-sm font-semibold">時間（分）<input required min="1" max="1440" type="number" name="minutes" className={fieldClass} /></label><label className="block text-sm font-semibold">消費カロリー<input required min="0" max="20000" type="number" name="kcal" className={fieldClass} /></label></>;
const NumberField = ({ label, value, max, set }: { label: string; value: number | ''; max: number; set: (value: number) => void }) => <label className="block text-sm font-semibold">{label}<input type="number" min="0" max={max} step="0.1" value={value} onChange={event => set(Number(event.target.value))} className={fieldClass} /></label>;
const DeleteButton = ({ label, onClick }: { label: string; onClick: () => void }) => <button aria-label={label} onClick={onClick} className="rounded-full p-2 text-red-500"><Trash2 size={17} /></button>;
const Empty = () => <p className="mt-3 text-sm text-gray-400">まだ記録がありません</p>;
function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) { return <nav aria-label="メインナビゲーション" className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-lg -translate-x-1/2 justify-around border-t bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur">{tabs.map(([value, Icon, label]) => <button key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)} className={`grid min-w-16 justify-items-center gap-1 p-2 text-xs ${tab === value ? 'font-bold text-leaf' : 'text-gray-400'}`}><Icon size={22} />{label}</button>)}</nav>; }
