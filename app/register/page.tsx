import { Suspense } from "react";
import { AuthPage } from "@/components/PublicPages";

export default function Page() {
  return <Suspense><AuthPage mode="register" /></Suspense>;
}
