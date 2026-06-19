import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BoardClient } from "@/components/board-client";

export default async function BoardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  return <BoardClient />;
}
