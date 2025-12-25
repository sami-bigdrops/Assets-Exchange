"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { useForm } from "../hooks/useForm";
import { loginSchema } from "../validation/login.validation";
import { useLoginViewModel } from "../view-models/useLoginViewModel";

export function LoginForm() {
  const { handleLogin, isLoading, error } = useLoginViewModel();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm(loginSchema, {
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const email = searchParams.get("email");
    const password = searchParams.get("password");
    if (email) {
      form.setValue("email", email);
    }
    if (password) {
      form.setValue("password", password);
    }
  }, [searchParams, form]);

  const onSubmit = async (data: { email: string; password: string }) => {
    await handleLogin(data);
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
          .login-form-input:-webkit-autofill,
          .login-form-input:-webkit-autofill:hover,
          .login-form-input:-webkit-autofill:focus,
          .login-form-input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
            box-shadow: 0 0 0 30px ${variables.colors.inputBackgroundColor} inset !important;
            background-color: ${variables.colors.inputBackgroundColor} !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .login-form-input::selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
          }
          .login-form-input::-moz-selection {
            background-color: ${inputRingColor}40 !important;
            color: ${variables.colors.inputTextColor} !important;
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
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 lg:space-y-5 xl:space-y-6"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="font-inter text-xs lg:text-sm xl:text-lg"
                      style={{ color: variables.colors.labelColor }}
                    >
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        style={{
                          backgroundColor:
                            variables.colors.inputBackgroundColor,
                          color: variables.colors.inputTextColor,
                          borderColor: form.formState.errors.email
                            ? variables.colors.inputErrorColor
                            : variables.colors.inputBorderColor,
                        }}
                        className="font-inter text-sm lg:text-base h-12 lg:h-14 login-form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage
                      className="text-sm"
                      style={{ color: variables.colors.inputErrorColor }}
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel
                      className="font-inter text-xs lg:text-sm xl:text-lg"
                      style={{ color: variables.colors.labelColor }}
                    >
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          disabled={isLoading}
                          style={{
                            backgroundColor:
                              variables.colors.inputBackgroundColor,
                            color: variables.colors.inputTextColor,
                            borderColor: form.formState.errors.password
                              ? variables.colors.inputErrorColor
                              : variables.colors.inputBorderColor,
                            paddingRight: "2.5rem",
                          }}
                          className="font-inter text-sm lg:text-base h-12 lg:h-14 login-form-input"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowPassword(!showPassword);
                          }}
                          disabled={isLoading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10 p-1"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 lg:h-6 lg:w-6 xl:h-6 xl:w-6" />
                          ) : (
                            <Eye className="h-5 w-5 lg:h-6 lg:w-6 xl:h-6 xl:w-6" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage
                      className="text-sm"
                      style={{ color: variables.colors.inputErrorColor }}
                    />
                  </FormItem>
                )}
              />
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
                  backgroundColor:
                    variables.colors.buttonDefaultBackgroundColor,
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
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
