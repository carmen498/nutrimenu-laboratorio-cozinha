import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useState } from "react";
import CustosTopBar from "@/components/custos/CustosTopBar";
import CustosSidebar from "@/components/custos/CustosSidebar";
import RouteFallback from "@/components/RouteFallback";
import HelpPanel from "@/components/HelpPanel";
import { getScreenName } from "@/lib/getScreenName";

export default function CustosLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const screenName = getScreenName(location.pathname, location.search);
  return (
    <div className="min-h-screen bg-background">
      <CustosTopBar onMenuClick={() => setMobileNavOpen(true)} onHelpClick={() => setHelpOpen(true)} />
      <CustosSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <main className="pt-16 md:pl-64">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Suspense fallback={<RouteFallback />}><Outlet /></Suspense>
        </div>
      </main>
      <HelpPanel screenName={screenName} open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
