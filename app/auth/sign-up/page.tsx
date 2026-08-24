import { SignUpForm } from "@/components/sign-up-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams;

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="w-full max-w-md">
        <SignUpForm initialEmail={params.email || ""} />
      </div>
    </main>
  );
}
