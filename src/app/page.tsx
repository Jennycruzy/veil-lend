import { Suspense } from "react";
import { Header } from "@/components/Header";
import { HomeContent } from "@/components/HomeContent";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="veil-grid pointer-events-none absolute inset-0" />
      <Header />
      <Suspense
        fallback={
          <main className="relative mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-12 lg:py-20">
            <div className="text-sm text-muted-foreground">Loading VeilLend...</div>
          </main>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
