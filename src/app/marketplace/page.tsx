import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";

export default function MarketplacePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="veil-grid pointer-events-none absolute inset-0" />
      <Header />
      <Dashboard />
    </div>
  );
}
