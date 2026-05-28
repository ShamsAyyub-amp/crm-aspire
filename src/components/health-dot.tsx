export default function HealthDot({ score }: { score: number | null }) {
  const s = score ?? 50;
  const c = s >= 75 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-rose-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} title={`Health ${s}`} />;
}
