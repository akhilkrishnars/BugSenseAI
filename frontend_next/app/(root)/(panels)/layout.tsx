import Header from "@/components/shared/Header";
import Sidepanel from "@/components/shared/Sidepanel";
import AuthGuard from "@/utils/AuthGuard";

export default function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-background via-black/50 to-background">
        <Sidepanel />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          <Header />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
