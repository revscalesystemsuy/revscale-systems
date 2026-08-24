import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-[#efe6d8] p-6 text-[#292722] md:p-10">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
