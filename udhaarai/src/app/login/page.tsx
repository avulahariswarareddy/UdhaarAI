import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 size={26} className="animate-spin text-brand" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
