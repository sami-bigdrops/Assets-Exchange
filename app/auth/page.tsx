import { Suspense } from "react";

import { getVariables } from "@/components/_variables/variables";
import { LoginForm } from "@/features/auth/components/LoginForm";

function LoginFormFallback() {
  const variables = getVariables();
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px]"
      style={{ backgroundColor: variables.colors.background }}
    >
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function AuthPage() {
  const variables = getVariables();
  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen p-4"
      style={{ backgroundColor: variables.colors.background }}
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
