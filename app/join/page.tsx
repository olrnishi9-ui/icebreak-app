import { redirect } from "next/navigation";
export default async function Join({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  redirect(code ? `/join/${encodeURIComponent(code)}` : "/");
}
