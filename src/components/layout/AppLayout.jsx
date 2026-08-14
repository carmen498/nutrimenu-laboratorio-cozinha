import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import HelpPanel from "@/components/HelpPanel";
import { getScreenName } from "@/lib/getScreenName";

export default function AppLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpFocusFaqsSignal, setHelpFocusFaqsSignal] = useState(0);

  const screenName = getScreenName(location.pathname, location.search);

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuClick={() => setMobileNavOpen(true)} />
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onHelpClick={() => setHelpOpen(true)}
        onHelpFaqsClick={() => { setHelpOpen(true); setHelpFocusFaqsSignal((n) => n + 1); }}
      />

      <main className="pt-16 md:pl-64">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      <HelpPanel screenName={screenName} open={helpOpen} onOpenChange={setHelpOpen} focusFaqsSignal={helpFocusFaqsSignal} />
    </div>
  );
}