import { getVariables } from "@/components/_variables/variables";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function AuthPage() {
  const variables = getVariables();
  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-4"
      style={{ backgroundColor: variables.colors.background }}
    >
      <LoginForm />
    </div>
  );
}
