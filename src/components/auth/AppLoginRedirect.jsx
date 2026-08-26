import { useEffect } from "react";
import { buildAppLoginUrl, currentInternalPath } from "@/lib/publicUrls";

export default function AppLoginRedirect() {
  useEffect(() => {
    window.location.replace(buildAppLoginUrl(currentInternalPath()));
  }, []);

  return null;
}