"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "today" | "meals" | "records" | "reports" | "settings";
type EntryKind = "meal" | "weight" | "activity" | "sleep";

type HealthEntry = {
  id: string;
  kind: EntryKind;
  recordedAt: string;
  category?: string | null;
  label: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  weight?: number | null;
  steps?: number | null;
  distance?: number | null;
  duration?: number | null;
  sleepHours?: number | null;
  note?: string | null;
  createdAt: number;
};

type Goals = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  weight: number;
  steps: number;
  sleepHours: number;
};

type Draft = {
  label: string;
  category: string;
  calories: string;
  carbs: string;
  protein: string;
  fat: string;
  weight: string;
  steps: string;
  distance: string;
  duration: string;
  sleepHours: string;
  note: string;
};

const defaultGoals: Goals = {
  calories: 1800,
  carbs: 225,
  protein: 90,
  fat: 50,
  weight: 60,
  steps: 8000,
  sleepHours: 7.5,
};

const navItems: Array<{ id: View; icon: string; label: string }> = [
  { id: "today", icon: "⌂", label: "今日" },
  { id: "meals", icon: "◌", label: "食事" },
  { id: "records", icon: "＋", label: "記録" },
  { id: "reports", icon: "▥", label: "レポート" },
  { id: "settings", icon: "⚙", label: "設定" },
];

const quickItems: Array<{ kind: EntryKind; icon: string; label: string; tone: string }> = [
  { kind: "meal", icon: "○", label: "食事", tone: "coral" },
  { kind: "weight", icon: "◇", label: "体重", tone: "sage" },
  { kind: "activity", icon: "⌁", label: "運動", tone: "amber" },
  { kind: "sleep", icon: "☾", label: "睡眠", tone: "lavender" },
];

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function emptyDraft(kind: EntryKind): Draft {
  const presets: Record<EntryKind, Partial<Draft>> = {
    meal: { label: "", category: "朝食", calories: "", carbs: "", protein: "", fat: "" },
    weight: { label: "朝の体重", weight: "" },
    activity: { label: "ウォーキング", category: "ウォーキング", steps: "", distance: "", duration: "" },
    sleep: { label: "昨夜の睡眠", sleepHours: "" },
  };
  return {
    label: "",
    category: "",
    calories: "",
    carbs: "",
    protein: "",
    fat: "",
    weight: "",
    steps: "",
    distance: "",
    duration: "",
    sleepHours: "",
    note: "",
    ...presets[kind],
  };
}

const fallbackEntries: HealthEntry[] = [
  {
    id: "fallback-breakfast",
    kind: "meal",
    recordedAt: isoDate(),
    category: "朝食",
    label: "ヨーグルトとバナナ",
    calories: 320,
    carbs: 48,
    protein: 14,
    fat: 8,
    createdAt: 4,
  },
  {
    id: "fallback-lunch",
    kind: "meal",
    recordedAt: isoDate(),
    category: "昼食",
    label: "チキンと玄米のボウル",
    calories: 580,
    carbs: 72,
    protein: 38,
    fat: 16,
    createdAt: 3,
  },
  {
    id: "fallback-snack",
    kind: "meal",
    recordedAt: isoDate(),
    category: "間食",
    label: "アーモンド",
    calories: 165,
    carbs: 6,
    protein: 6,
    fat: 14,
    createdAt: 2,
  },
  {
    id: "fallback-weight",
    kind: "weight",
    recordedAt: isoDate(),
    label: "朝の体重",
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    weight: 61.2,
    createdAt: 1,
  },
  {
    id: "fallback-activity",
    kind: "activity",
    recordedAt: isoDate(),
    label: "夕方のウォーキング",
    category: "ウォーキング",
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    steps: 6842,
    distance: 4.8,
    duration: 46,
    createdAt: 0,
  },
  {
    id: "fallback-sleep",
    kind: "sleep",
    recordedAt: isoDate(),
    label: "昨夜の睡眠",
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    sleepHours: 7.2,
    createdAt: -1,
  },
];

function clampPercent(value: number, goal: number) {
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

function number(value: string) {
  return value === "" ? 0 : Number(value);
}

export default function HabiApp() {
  const [activeView, setActiveView] = useState<View>("today");
  const [entries, setEntries] = useState<HealthEntry[]>(fallbackEntries);
  const [goals, setGoals] = useState<Goals>(defaultGoals);
  const [goalDraft, setGoalDraft] = useState<Goals>(defaultGoals);
  const [modalKind, setModalKind] = useState<EntryKind | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft("meal"));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reportPeriod, setReportPeriod] = useState<"日" | "週" | "月">("週");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) throw new Error("load failed");
        return response.json() as Promise<{ entries: HealthEntry[]; goals: Goals }>;
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setGoals(data.goals);
        setGoalDraft(data.goals);
      })
      .catch(() => {
        if (!cancelled) setMessage("サンプルデータで表示しています。再読み込みすると接続を再試行します。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = isoDate();
  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.recordedAt === today),
    [entries, today],
  );
  const todayMeals = todayEntries.filter((entry) => entry.kind === "meal");
  const calories = todayMeals.reduce((sum, entry) => sum + entry.calories, 0);
  const carbs = todayMeals.reduce((sum, entry) => sum + entry.carbs, 0);
  const protein = todayMeals.reduce((sum, entry) => sum + entry.protein, 0);
  const fat = todayMeals.reduce((sum, entry) => sum + entry.fat, 0);
  const latestWeight = entries.find((entry) => entry.kind === "weight")?.weight ?? 61.2;
  const latestSleep = entries.find((entry) => entry.kind === "sleep")?.sleepHours ?? 7.2;
  const todayActivity = todayEntries.find((entry) => entry.kind === "activity");
  const steps = todayActivity?.steps ?? 0;
  const distance = todayActivity?.distance ?? 0;

  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  const openModal = (kind: EntryKind) => {
    setDraft(emptyDraft(kind));
    setModalKind(kind);
    setMessage("");
  };

  const submitEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!modalKind || !draft.label.trim()) return;

    const payload = {
      kind: modalKind,
      recordedAt: today,
      label: draft.label.trim(),
      category: draft.category,
      calories: number(draft.calories),
      carbs: number(draft.carbs),
      protein: number(draft.protein),
      fat: number(draft.fat),
      weight: draft.weight ? number(draft.weight) : null,
      steps: draft.steps ? number(draft.steps) : null,
      distance: draft.distance ? number(draft.distance) : null,
      duration: draft.duration ? number(draft.duration) : null,
      sleepHours: draft.sleepHours ? number(draft.sleepHours) : null,
      note: draft.note,
    };

    try {
      const response = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("save failed");
      const saved = (await response.json()) as HealthEntry;
      setEntries((current) => [saved, ...current]);
      setModalKind(null);
      setMessage("記録しました。小さな積み重ね、いい感じです。");
    } catch {
      setMessage("保存できませんでした。少し待ってからもう一度お試しください。");
    }
  };

  const removeEntry = async (id: string) => {
    const previous = entries;
    setEntries((current) => current.filter((entry) => entry.id !== id));
    const response = await fetch(`/api/health?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      setEntries(previous);
      setMessage("削除できませんでした。");
    }
  };

  const saveGoals = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalDraft),
      });
      if (!response.ok) throw new Error("save failed");
      setGoals(goalDraft);
      setMessage("目標を更新しました。無理なく続けていきましょう。");
    } catch {
      setMessage("目標を保存できませんでした。");
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="メインメニュー">
        <button className="brand" onClick={() => setActiveView("today")} aria-label="Habi ホーム">
          Habi<span>.</span>
        </button>
        <p className="brand-caption">your gentle health companion</p>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
              aria-current={activeView === item.id ? "page" : undefined}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>7日連続</span>
          <strong>いい習慣が育っています</strong>
          <small>昨日より少しだけ、自分を大切に。</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{dateLabel}</p>
            <h1>{viewTitle(activeView)}</h1>
          </div>
          <div className="top-actions">
            {loading && <span className="syncing">同期中…</span>}
            <button className="round-button" aria-label="お知らせ">
              ♢
              <span className="notification-dot" />
            </button>
            <div className="avatar" aria-label="プロフィール">Y</div>
          </div>
        </header>

        {message && (
          <div className="toast" role="status">
            <span>✓</span>
            {message}
            <button onClick={() => setMessage("")} aria-label="メッセージを閉じる">×</button>
          </div>
        )}

        {activeView === "today" && (
          <TodayView
            calories={calories}
            carbs={carbs}
            protein={protein}
            fat={fat}
            weight={latestWeight}
            steps={steps}
            distance={distance}
            sleep={latestSleep}
            goals={goals}
            entries={entries}
            onAdd={openModal}
            onNavigate={setActiveView}
          />
        )}
        {activeView === "meals" && (
          <MealsView
            meals={todayMeals}
            totals={{ calories, carbs, protein, fat }}
            goals={goals}
            onAdd={() => openModal("meal")}
            onRemove={removeEntry}
          />
        )}
        {activeView === "records" && (
          <RecordsView entries={entries} onAdd={openModal} goals={goals} />
        )}
        {activeView === "reports" && (
          <ReportsView
            entries={entries}
            goals={goals}
            period={reportPeriod}
            setPeriod={setReportPeriod}
          />
        )}
        {activeView === "settings" && (
          <SettingsView
            draft={goalDraft}
            setDraft={setGoalDraft}
            onSave={saveGoals}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        )}
      </main>

      <nav className="mobile-nav" aria-label="モバイルメニュー">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "active" : ""}
            onClick={() => setActiveView(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {modalKind && (
        <EntryModal
          kind={modalKind}
          draft={draft}
          setDraft={setDraft}
          onSubmit={submitEntry}
          onClose={() => setModalKind(null)}
        />
      )}
    </div>
  );
}

function viewTitle(view: View) {
  return {
    today: "おはよう、ゆうさん",
    meals: "今日の食事",
    records: "からだの記録",
    reports: "あなたのレポート",
    settings: "目標と設定",
  }[view];
}

function TodayView({
  calories,
  carbs,
  protein,
  fat,
  weight,
  steps,
  distance,
  sleep,
  goals,
  entries,
  onAdd,
  onNavigate,
}: {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  weight: number;
  steps: number;
  distance: number;
  sleep: number;
  goals: Goals;
  entries: HealthEntry[];
  onAdd: (kind: EntryKind) => void;
  onNavigate: (view: View) => void;
}) {
  const remaining = Math.max(goals.calories - calories, 0);
  const weeklyCalories = lastSevenDays().map(({ date, label }) => ({
    label,
    value: entries
      .filter((entry) => entry.kind === "meal" && entry.recordedAt === date)
      .reduce((sum, entry) => sum + entry.calories, 0),
  }));

  return (
    <div className="view-stack">
      <section className="hero-grid">
        <article className="calorie-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">TODAY&apos;S BALANCE</p>
              <h2>今日のカロリー</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("meals")}>食事を見る →</button>
          </div>
          <div className="calorie-layout">
            <div
              className="calorie-ring"
              style={{ "--progress": `${clampPercent(calories, goals.calories) * 3.6}deg` } as React.CSSProperties}
            >
              <div>
                <strong>{calories.toLocaleString()}</strong>
                <span>/ {goals.calories.toLocaleString()} kcal</span>
              </div>
            </div>
            <div className="remaining">
              <span>あと</span>
              <strong>{remaining.toLocaleString()}</strong>
              <small>kcal</small>
              <p>{remaining > 500 ? "夕食もゆっくり楽しめます" : "目標まであと少しです"}</p>
            </div>
          </div>
          <div className="macro-row">
            <Macro label="炭水化物" value={carbs} goal={goals.carbs} tone="coral" />
            <Macro label="たんぱく質" value={protein} goal={goals.protein} tone="sage" />
            <Macro label="脂質" value={fat} goal={goals.fat} tone="amber" />
          </div>
        </article>

        <article className="quick-card">
          <div>
            <p className="eyebrow">QUICK LOG</p>
            <h2>さっと記録</h2>
          </div>
          <div className="quick-grid">
            {quickItems.map((item) => (
              <button key={item.kind} className={`quick-button ${item.tone}`} onClick={() => onAdd(item.kind)}>
                <span>{item.icon}</span>
                {item.label}
                <b>＋</b>
              </button>
            ))}
          </div>
          <p className="quick-tip">入力は30秒。今日の自分を、明日のヒントに。</p>
        </article>
      </section>

      <section className="metric-grid">
        <MetricCard
          icon="◇"
          tone="sage"
          label="体重"
          value={`${weight.toFixed(1)} kg`}
          sub="7日前より −0.8 kg"
          percent={clampPercent(goals.weight, weight)}
        />
        <MetricCard
          icon="⌁"
          tone="amber"
          label="歩数"
          value={`${steps.toLocaleString()} 歩`}
          sub={`${distance.toFixed(1)} km ・ 目標の ${clampPercent(steps, goals.steps)}%`}
          percent={clampPercent(steps, goals.steps)}
        />
        <MetricCard
          icon="☾"
          tone="lavender"
          label="睡眠"
          value={`${sleep.toFixed(1)} 時間`}
          sub={`目標 ${goals.sleepHours}時間 ・ よく眠れました`}
          percent={clampPercent(sleep, goals.sleepHours)}
        />
      </section>

      <section className="lower-grid">
        <article className="panel chart-panel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">7 DAYS</p>
              <h2>食事のリズム</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("reports")}>詳しく見る →</button>
          </div>
          <div className="bar-chart" aria-label="7日間のカロリー">
            {weeklyCalories.map((item, index) => {
              const normalized = item.value || [1600, 1760, 1680, 1920, 1700, 1820, calories][index];
              return (
                <div className="bar-column" key={item.label}>
                  <div className="bar-track">
                    <span
                      className={index === 6 ? "today" : ""}
                      style={{ height: `${Math.max(18, Math.min(100, (normalized / goals.calories) * 82))}%` }}
                    />
                  </div>
                  <small>{item.label}</small>
                </div>
              );
            })}
          </div>
          <div className="chart-legend">
            <span><i className="legend-dot green" />平均 1,758 kcal</span>
            <span><i className="legend-line" />目標 {goals.calories.toLocaleString()} kcal</span>
          </div>
        </article>

        <article className="panel insight-card">
          <span className="insight-icon">✦</span>
          <p className="eyebrow">HABI INSIGHT</p>
          <h2>今週は、夜のリズムが整っています</h2>
          <p>
            3日続けて7時間前後の睡眠がとれています。睡眠が安定した日は、
            翌日の食事バランスも良い傾向です。
          </p>
          <div className="streak">
            <div>
              <strong>7</strong>
              <span>days</span>
            </div>
            <p><b>連続記録中</b><br />その調子。完璧より、続けることを大切に。</p>
          </div>
        </article>
      </section>
    </div>
  );
}

function Macro({ label, value, goal, tone }: { label: string; value: number; goal: number; tone: string }) {
  return (
    <div className="macro">
      <div>
        <span>{label}</span>
        <strong>{Math.round(value)}<small> / {goal}g</small></strong>
      </div>
      <div className="progress"><span className={tone} style={{ width: `${clampPercent(value, goal)}%` }} /></div>
    </div>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  sub,
  percent,
}: {
  icon: string;
  tone: string;
  label: string;
  value: string;
  sub: string;
  percent: number;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
      <div className="mini-progress"><span className={tone} style={{ width: `${percent}%` }} /></div>
    </article>
  );
}

function MealsView({
  meals,
  totals,
  goals,
  onAdd,
  onRemove,
}: {
  meals: HealthEntry[];
  totals: Pick<Goals, "calories" | "carbs" | "protein" | "fat">;
  goals: Goals;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const mealOrder = ["朝食", "昼食", "夕食", "間食"];
  return (
    <div className="view-stack">
      <section className="meal-summary panel">
        <div>
          <p className="eyebrow">TODAY&apos;S NUTRITION</p>
          <h2>{totals.calories.toLocaleString()} <small>kcal</small></h2>
          <p>目標まであと {Math.max(goals.calories - totals.calories, 0).toLocaleString()} kcal</p>
        </div>
        <div className="summary-macros">
          <Macro label="炭水化物" value={totals.carbs} goal={goals.carbs} tone="coral" />
          <Macro label="たんぱく質" value={totals.protein} goal={goals.protein} tone="sage" />
          <Macro label="脂質" value={totals.fat} goal={goals.fat} tone="amber" />
        </div>
        <button className="primary-button" onClick={onAdd}>＋ 食事を記録</button>
      </section>
      <section className="meal-list">
        {mealOrder.map((category) => {
          const items = meals.filter((meal) => meal.category === category);
          return (
            <article className="meal-group panel" key={category}>
              <div className="meal-group-heading">
                <div className={`meal-symbol ${category === "夕食" ? "lavender" : category === "昼食" ? "amber" : "coral"}`}>
                  {category === "夕食" ? "☾" : category === "昼食" ? "☀" : "○"}
                </div>
                <div>
                  <h3>{category}</h3>
                  <p>{items.reduce((sum, item) => sum + item.calories, 0)} kcal</p>
                </div>
                <button onClick={onAdd} aria-label={`${category}を追加`}>＋</button>
              </div>
              {items.length ? (
                items.map((item) => (
                  <div className="meal-item" key={item.id}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>P {item.protein}g ・ F {item.fat}g ・ C {item.carbs}g</span>
                    </div>
                    <b>{item.calories} kcal</b>
                    <button onClick={() => onRemove(item.id)} aria-label={`${item.label}を削除`}>×</button>
                  </div>
                ))
              ) : (
                <button className="empty-meal" onClick={onAdd}>まだ記録がありません　＋追加する</button>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function RecordsView({
  entries,
  onAdd,
  goals,
}: {
  entries: HealthEntry[];
  onAdd: (kind: EntryKind) => void;
  goals: Goals;
}) {
  const cards = [
    { kind: "weight" as const, label: "体重", icon: "◇", tone: "sage", unit: "kg", goal: `${goals.weight} kg` },
    { kind: "activity" as const, label: "運動・歩数", icon: "⌁", tone: "amber", unit: "歩", goal: `${goals.steps.toLocaleString()} 歩` },
    { kind: "sleep" as const, label: "睡眠", icon: "☾", tone: "lavender", unit: "時間", goal: `${goals.sleepHours} 時間` },
  ];

  return (
    <div className="view-stack">
      <section className="record-actions">
        {cards.map((card) => {
          const latest = entries.find((entry) => entry.kind === card.kind);
          const value =
            card.kind === "weight"
              ? latest?.weight?.toFixed(1)
              : card.kind === "activity"
                ? latest?.steps?.toLocaleString()
                : latest?.sleepHours?.toFixed(1);
          return (
            <article className="record-card panel" key={card.kind}>
              <div className={`metric-icon ${card.tone}`}>{card.icon}</div>
              <p>{card.label}</p>
              <strong>{value ?? "—"} <small>{card.unit}</small></strong>
              <span>目標 {card.goal}</span>
              <button className="secondary-button" onClick={() => onAdd(card.kind)}>＋ 記録する</button>
            </article>
          );
        })}
      </section>
      <section className="panel history-panel">
        <div className="card-heading">
          <div>
            <p className="eyebrow">RECENT LOGS</p>
            <h2>最近の記録</h2>
          </div>
        </div>
        <div className="timeline">
          {entries.filter((entry) => entry.kind !== "meal").slice(0, 12).map((entry) => (
            <div className="timeline-row" key={entry.id}>
              <span className={`timeline-icon ${entry.kind}`}>{entry.kind === "weight" ? "◇" : entry.kind === "sleep" ? "☾" : "⌁"}</span>
              <div>
                <strong>{entry.label}</strong>
                <small>{formatShortDate(entry.recordedAt)}</small>
              </div>
              <b>{entryValue(entry)}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportsView({
  entries,
  goals,
  period,
  setPeriod,
}: {
  entries: HealthEntry[];
  goals: Goals;
  period: "日" | "週" | "月";
  setPeriod: (period: "日" | "週" | "月") => void;
}) {
  const days = lastSevenDays();
  const calorieSeries = days.map(({ date, label }) => ({
    label,
    value: entries
      .filter((entry) => entry.kind === "meal" && entry.recordedAt === date)
      .reduce((sum, entry) => sum + entry.calories, 0),
  }));
  const average = Math.round(
    calorieSeries.reduce((sum, day) => sum + (day.value || goals.calories * 0.94), 0) / 7,
  );

  return (
    <div className="view-stack">
      <div className="period-switch" aria-label="表示期間">
        {(["日", "週", "月"] as const).map((item) => (
          <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>
            {item}
          </button>
        ))}
      </div>
      <section className="report-kpis">
        <article className="panel report-kpi">
          <span>平均カロリー</span><strong>{average.toLocaleString()} <small>kcal</small></strong>
          <p className="positive">目標内に収まっています</p>
        </article>
        <article className="panel report-kpi">
          <span>平均歩数</span><strong>7,426 <small>歩</small></strong>
          <p>先週比 ＋8%</p>
        </article>
        <article className="panel report-kpi">
          <span>平均睡眠</span><strong>7.2 <small>時間</small></strong>
          <p className="positive">目標まであと0.3時間</p>
        </article>
        <article className="panel report-kpi">
          <span>体重の変化</span><strong>−0.8 <small>kg</small></strong>
          <p>ゆるやかな変化です</p>
        </article>
      </section>
      <section className="report-grid">
        <article className="panel report-chart">
          <div className="card-heading">
            <div><p className="eyebrow">CALORIE TREND</p><h2>カロリーの推移</h2></div>
            <span className="goal-chip">目標 {goals.calories} kcal</span>
          </div>
          <div className="report-bars">
            {calorieSeries.map((item, index) => (
              <div key={item.label}>
                <span
                  className={index === 6 ? "today" : ""}
                  style={{ height: `${Math.max(24, Math.min(100, ((item.value || average) / 2200) * 100))}%` }}
                ><i>{item.value || average}</i></span>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="panel balance-panel">
          <div><p className="eyebrow">WEEKLY BALANCE</p><h2>今週のバランス</h2></div>
          <BalanceScore label="食事" score={88} tone="coral" />
          <BalanceScore label="運動" score={76} tone="amber" />
          <BalanceScore label="睡眠" score={92} tone="lavender" />
          <BalanceScore label="記録の継続" score={100} tone="sage" />
        </article>
      </section>
      <article className="panel weekly-note">
        <span>✦</span>
        <div>
          <p className="eyebrow">WEEKLY NOTE</p>
          <h2>良い一週間でした。次は「昼のたんぱく質」を意識してみましょう。</h2>
          <p>体重を急いで落とすより、今の睡眠リズムと食事記録を続けるほうが、長く効いてきます。</p>
        </div>
      </article>
    </div>
  );
}

function BalanceScore({ label, score, tone }: { label: string; score: number; tone: string }) {
  return (
    <div className="balance-score">
      <div><span>{label}</span><strong>{score}</strong></div>
      <div className="progress"><span className={tone} style={{ width: `${score}%` }} /></div>
    </div>
  );
}

function SettingsView({
  draft,
  setDraft,
  onSave,
  notifications,
  setNotifications,
}: {
  draft: Goals;
  setDraft: (goals: Goals) => void;
  onSave: (event: FormEvent) => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
}) {
  const fields: Array<{ key: keyof Goals; label: string; unit: string; step?: number }> = [
    { key: "calories", label: "1日のカロリー", unit: "kcal" },
    { key: "carbs", label: "炭水化物", unit: "g" },
    { key: "protein", label: "たんぱく質", unit: "g" },
    { key: "fat", label: "脂質", unit: "g" },
    { key: "weight", label: "目標体重", unit: "kg", step: 0.1 },
    { key: "steps", label: "1日の歩数", unit: "歩" },
    { key: "sleepHours", label: "睡眠時間", unit: "時間", step: 0.1 },
  ];
  return (
    <div className="settings-grid">
      <form className="panel settings-form" onSubmit={onSave}>
        <div><p className="eyebrow">DAILY GOALS</p><h2>毎日の目標</h2><p>今の生活に合う、少しだけ背伸びした数字がおすすめです。</p></div>
        <div className="goal-fields">
          {fields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <div>
                <input
                  type="number"
                  min="1"
                  step={field.step ?? 1}
                  value={draft[field.key]}
                  onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })}
                />
                <small>{field.unit}</small>
              </div>
            </label>
          ))}
        </div>
        <button className="primary-button" type="submit">目標を保存</button>
      </form>
      <div className="settings-side">
        <article className="panel profile-card">
          <div className="large-avatar">Y</div>
          <div><h2>ゆうさん</h2><p>Habiを使い始めて 24日</p></div>
          <button className="secondary-button">プロフィールを編集</button>
        </article>
        <article className="panel preference-card">
          <div><p className="eyebrow">PREFERENCES</p><h2>通知と表示</h2></div>
          <label className="switch-row">
            <div><strong>記録リマインダー</strong><span>毎日20:00にお知らせ</span></div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(event) => setNotifications(event.target.checked)}
            />
          </label>
          <label className="switch-row">
            <div><strong>週次レポート</strong><span>日曜日の朝に振り返り</span></div>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="switch-row">
            <div><strong>やさしいメッセージ</strong><span>目標達成をそっと応援</span></div>
            <input type="checkbox" defaultChecked />
          </label>
        </article>
      </div>
    </div>
  );
}

function EntryModal({
  kind,
  draft,
  setDraft,
  onSubmit,
  onClose,
}: {
  kind: EntryKind;
  draft: Draft;
  setDraft: (draft: Draft) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const titles = { meal: "食事を記録", weight: "体重を記録", activity: "運動を記録", sleep: "睡眠を記録" };
  const update = (key: keyof Draft, value: string) => setDraft({ ...draft, [key]: value });
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="entry-modal" onSubmit={onSubmit}>
        <div className="modal-heading">
          <div><p className="eyebrow">QUICK LOG</p><h2>{titles[kind]}</h2></div>
          <button type="button" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        {kind === "meal" && (
          <>
            <label>タイミング
              <select value={draft.category} onChange={(event) => update("category", event.target.value)}>
                <option>朝食</option><option>昼食</option><option>夕食</option><option>間食</option>
              </select>
            </label>
            <label>食べたもの
              <input required value={draft.label} onChange={(event) => update("label", event.target.value)} placeholder="例：鮭おにぎりと味噌汁" />
            </label>
            <div className="form-grid four">
              <label>カロリー<input required type="number" min="0" value={draft.calories} onChange={(event) => update("calories", event.target.value)} /><small>kcal</small></label>
              <label>炭水化物<input type="number" min="0" step="0.1" value={draft.carbs} onChange={(event) => update("carbs", event.target.value)} /><small>g</small></label>
              <label>たんぱく質<input type="number" min="0" step="0.1" value={draft.protein} onChange={(event) => update("protein", event.target.value)} /><small>g</small></label>
              <label>脂質<input type="number" min="0" step="0.1" value={draft.fat} onChange={(event) => update("fat", event.target.value)} /><small>g</small></label>
            </div>
          </>
        )}
        {kind === "weight" && (
          <>
            <label>記録名<input required value={draft.label} onChange={(event) => update("label", event.target.value)} /></label>
            <label>体重<div className="unit-input"><input autoFocus required type="number" min="20" max="300" step="0.1" value={draft.weight} onChange={(event) => update("weight", event.target.value)} /><span>kg</span></div></label>
          </>
        )}
        {kind === "activity" && (
          <>
            <label>運動<input required value={draft.label} onChange={(event) => update("label", event.target.value)} /></label>
            <div className="form-grid">
              <label>歩数<input type="number" min="0" value={draft.steps} onChange={(event) => update("steps", event.target.value)} /><small>歩</small></label>
              <label>距離<input type="number" min="0" step="0.1" value={draft.distance} onChange={(event) => update("distance", event.target.value)} /><small>km</small></label>
              <label>時間<input type="number" min="0" value={draft.duration} onChange={(event) => update("duration", event.target.value)} /><small>分</small></label>
            </div>
          </>
        )}
        {kind === "sleep" && (
          <>
            <label>記録名<input required value={draft.label} onChange={(event) => update("label", event.target.value)} /></label>
            <label>睡眠時間<div className="unit-input"><input autoFocus required type="number" min="0" max="24" step="0.1" value={draft.sleepHours} onChange={(event) => update("sleepHours", event.target.value)} /><span>時間</span></div></label>
          </>
        )}
        <label>ひとことメモ（任意）
          <textarea value={draft.note} onChange={(event) => update("note", event.target.value)} placeholder="体調や気分など" />
        </label>
        <button className="primary-button modal-submit" type="submit">この内容で記録する</button>
      </form>
    </div>
  );
}

function lastSevenDays() {
  const labels = ["日", "月", "火", "水", "木", "金", "土"];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return { date: isoDate(date), label: labels[date.getDay()] };
  });
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric", weekday: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function entryValue(entry: HealthEntry) {
  if (entry.kind === "weight") return `${entry.weight?.toFixed(1)} kg`;
  if (entry.kind === "sleep") return `${entry.sleepHours?.toFixed(1)} 時間`;
  return `${entry.steps?.toLocaleString() ?? 0} 歩`;
}
