"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, type WorkspaceTab } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { TranslatePanel } from "@/components/TranslatePanel";
import { CardsPanel } from "@/components/CardsPanel";
import { OnboardingModal } from "@/components/OnboardingModal";
import {
  getSession,
  logout,
  hasOnboarded,
  markOnboarded,
  type Session,
} from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>("chat");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (!s) {
        router.replace("/login");
        return;
      }
      setSession(s);
      setReady(true);
      hasOnboarded(s.userId).then((done) => {
        if (!done) setShowOnboarding(true);
      });
    });
  }, [router]);

  function handleCloseOnboarding() {
    setShowOnboarding(false);
    if (session) markOnboarded(session.userId);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (!ready || !session) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        active={tab}
        onChange={setTab}
        nickname={session.nickname}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {tab === "chat" && (
          <ChatPanel nickname={session.nickname} userKey={session.userId} />
        )}
        {tab === "translate" && <TranslatePanel userKey={session.userId} />}
        {tab === "cards" && <CardsPanel userKey={session.userId} />}
      </main>

      <OnboardingModal open={showOnboarding} onClose={handleCloseOnboarding} />
    </div>
  );
}
