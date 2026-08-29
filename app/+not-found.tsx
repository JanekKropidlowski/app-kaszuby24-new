import { useEffect } from "react";
import { View } from "react-native";
import { router, usePathname, useGlobalSearchParams } from "expo-router";
import { handleDeepLinkWithValidation } from "@/utils/linkHandler";

// Expo-router renders this for any URL that doesn't match a file route.
// Universal Links land here for paths like /wydarzenia or /jakis-slug-artykulu
// because we don't have file routes for every WP slug. Instead of showing
// a "not found" screen, reconstruct the original kaszuby24.pl URL and let
// linkHandler resolve it (slug→id fetch + router.replace to /article/[id]).
export default function NotFoundScreen() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    const search = new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
        if (typeof v === "string") acc[k] = v;
        else if (Array.isArray(v) && typeof v[0] === "string") acc[k] = v[0];
        return acc;
      }, {})
    ).toString();
    const url = `https://kaszuby24.pl${pathname}${search ? "?" + search : ""}`;

    handleDeepLinkWithValidation(url, true).catch(() => {
      router.replace("/(tabs)");
    });
  }, [pathname]);

  return <View style={{ flex: 1, backgroundColor: "#ffffff" }} />;
}
