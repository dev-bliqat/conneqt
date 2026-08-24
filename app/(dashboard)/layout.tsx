import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(212,178,231,0.28),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(233,87,59,0.12),_transparent_24%),linear-gradient(180deg,_#ece6db_0%,_#f7f0e8_100%)] px-4 py-4 md:px-6 md:py-5">
      <div className="min-h-[calc(100vh-7.5rem)] w-full min-w-0">
        {children}
      </div>
    </main>
  );
}
