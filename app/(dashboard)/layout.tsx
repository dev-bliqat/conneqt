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
    <main className="flex flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(212,178,231,0.42),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(233,87,59,0.18),_transparent_26%),linear-gradient(180deg,_#ece6db_0%,_#f7f0e8_100%)] px-4 py-4 md:px-6 md:py-6">
      <div className="min-h-[calc(100vh-7.5rem)] w-full rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 shadow-[0_22px_56px_rgba(58,17,98,0.07)] backdrop-blur md:p-6">
        <div className="min-w-0 rounded-[1.8rem] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(255,248,252,0.88)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] md:p-5">
          {children}
        </div>
      </div>
    </main>
  );
}
