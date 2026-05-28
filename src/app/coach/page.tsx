import { getCurrentUserId } from "@/lib/user";
import CoachChat from "@/components/coach-chat";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const meId = await getCurrentUserId();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales Coach</h1>
        <p className="text-sm text-ink-500">
          The manager you wish you had. Knows your pipeline, your activity, the deals slipping, and the next thing
          worth doing.
        </p>
      </div>
      <CoachChat ownerId={meId} />
    </div>
  );
}
