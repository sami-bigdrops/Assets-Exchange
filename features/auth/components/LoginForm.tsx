"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLoginViewModel } from "../view-models/useLoginViewModel";

export function LoginForm() {
  const { handleLogin, isLoading, error } = useLoginViewModel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleLogin({ email, password });
  };

  const variables = getVariables();
  const inputRingColor = variables.colors.inputRingColor;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .login-form-input:focus-visible {
            outline: none !important;
            border-color: ${inputRingColor} !important;
            box-shadow: 0 0 0 3px ${inputRingColor}50 !important;
          }
        `,
        }}
      />

      <div className="logo flex items-center justify-center mt-12 md:mt-16 lg:mt-18  mb-12 md:mb-16  h-auto w-[190px] md:w-[220px] lg:w-[260px] ">
        <Image
          src={variables.logo.path}
          alt={variables.logo.alt}
          width={1000}
          height={1000}
          className="w-full h-full object-contain mx-auto"
        />
      </div>
      <Card
        className="w-full max-w-md lg:max-w-xl xl:max-w-2xl gap-6 xl:gap-8"
        style={{ backgroundColor: variables.colors.cardBackground }}
      >
        <CardHeader className="flex flex-col items-start justify-start gap-2 lg:gap-3">
          <CardTitle
            className="text-3xl lg:text-4xl xl:text-[2.6rem] font-bold font-inter text-left "
            style={{ color: variables.colors.titleColor }}
          >
            Sign In to your Dashboard
          </CardTitle>
          <CardDescription
            className="text-sm lg:text-base xl:text-lg font-inter text-left"
            style={{ color: variables.colors.descriptionColor }}
          >
            Please enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="space-y-4 lg:space-y-5 xl:space-y-6"
          >
            <div className="space-y-2 ">
              <Label
                htmlFor="email font-inter text-xs lg:text-sm xl:text-lg"
                style={{ color: variables.colors.labelColor }}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  backgroundColor: variables.colors.inputBackgrounColor,
                  color: variables.colors.inputTextColor,
                  borderColor: variables.colors.inputBorderColor,
                }}
                className="font-inter text-sm lg:text-base h-12 lg:h-14 login-form-input"
              />
            </div>
            <div className="space-y-2  ">
              <Label
                htmlFor="password font-inter text-xs lg:text-sm xl:text-lg"
                style={{ color: variables.colors.labelColor }}
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{
                    backgroundColor: variables.colors.inputBackgrounColor,
                    color: variables.colors.inputTextColor,
                    borderColor: variables.colors.inputBorderColor,
                    paddingRight: "2.5rem",
                  }}
                  className="font-inter text-sm lg:text-base h-12 lg:h-14 login-form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 lg:h-5.5 lg:w-5.5 xl:h-6 xl:w-6" />
                  ) : (
                    <Eye className="h-5 w-5 lg:h-5.5 lg:w-5.5 xl:h-6 xl:w-6" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full h-12  lg:h-14 mt-3  lg:text-base text-sm xl:text-lg cursor-pointer"
              disabled={isLoading}
              style={{
                backgroundColor: variables.colors.buttonDefaultBackgroundColor,
                color: variables.colors.buttonDefaultTextColor,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In to your Dashboard"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
