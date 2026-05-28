import { getCurrentUserId } from "@/lib/user";
import CoachChat from "@/components/coach-chat";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const meId = await getCurrentUserId();
  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow mb-1.5">The Coaching Desk</div>
        <h1 className="display-headline text-ink-900 text-4xl">
          Your <span className="display-italic text-brand-700">sales coach</span>
        </h1>
        <p className="text-sm text-ink-500">
          The manager you wish you had. Knows your pipeline, your activity, the deals slipping, and the next thing
          worth doing.
        </p>
      </div>
      <CoachChat ownerId={meId} />
    </div>
  );
}
