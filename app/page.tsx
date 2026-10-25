import { auth } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";
import { WorkspaceDashboard } from "@/components/dashboard/WorkspaceDashboard";

export default async function HomePage() {
  const { userId } = await auth();

  // If unauthenticated: display Clerk Sign In screen
  if (!userId) {
    return (
      <main className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0e0e11] text-white p-4 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#f7ffa8]/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Brand header */}
        <div className="mb-6 text-center space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1c22] border border-[#2e2e38] text-[11px] text-[#f7ffa8] mb-2 font-mono">
            Weavy.ai • LLM Workflow Builder
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Welcome to Your Workspace
          </h1>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Sign in to build, manage, and execute visual DAG workflows with Gemini LLMs and Trigger.dev.
          </p>
        </div>

        {/* Embedded Clerk Sign In Card */}
        <div className="z-10 shadow-2xl rounded-2xl overflow-hidden border border-[#27272c] bg-[#141417]">
          <SignIn routing="hash" />
        </div>
      </main>
    );
  }

  // When authenticated: display the Workspace Dashboard
  return <WorkspaceDashboard />;
}