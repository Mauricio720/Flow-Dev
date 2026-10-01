import type { Metadata } from "next";
import { LoginScreen } from "@/features/auth/login";

export const metadata: Metadata = { title: "Entrar · Flow Dev" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  return <LoginScreen error={typeof erro === "string" ? erro : undefined} />;
}
