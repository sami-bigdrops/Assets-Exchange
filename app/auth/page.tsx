import { LoginForm } from "@/features/auth/components/LoginForm";

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <LoginForm />
    </div>
  );
}