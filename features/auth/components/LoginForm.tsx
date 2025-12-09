"use client";

import { useState } from "react";
import { useLoginViewModel } from "../view-models/useLoginViewModel";
import { Button } from "@/components/ui/button";
<<<<<<< Updated upstream
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const { handleLogin, isLoading, error } = useLoginViewModel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
=======
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

import { useLoginForm } from "../hooks/useLoginForm";
import { useLoginViewModel } from "../view-models/useLoginViewModel";

export function LoginForm() {
  const { handleLogin, isLoading, error } = useLoginViewModel();
  const form = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);
>>>>>>> Stashed changes

  const onSubmit = async (data: { email: string; password: string }) => {
    await handleLogin(data);
  };

  return (
<<<<<<< Updated upstream
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@assets-exchange.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Admin test credentials:</p>
          <p className="font-mono text-xs mt-1">
            Email: admin@assets-exchange.com
          </p>
          <p className="font-mono text-xs">Password: Admin@123</p>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Advertiser test credentials:</p>
          <p className="font-mono text-xs mt-1">
            Email: advertiser@assets-exchange.com
          </p>
          <p className="font-mono text-xs">Password: Advertiser@123</p>
        </div>
      </CardContent>
    </Card>
=======
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
            -webkit-box-shadow: 0 0 0 30px ${variables.colors.inputBackgrounColor} inset !important;
            -webkit-text-fill-color: ${variables.colors.inputTextColor} !important;
            box-shadow: 0 0 0 30px ${variables.colors.inputBackgrounColor} inset !important;
            background-color: ${variables.colors.inputBackgrounColor} !important;
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
                            variables.colors.inputBackgrounColor,
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
                              variables.colors.inputBackgrounColor,
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
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 lg:h-5.5 lg:w-5.5 xl:h-6 xl:w-6" />
                          ) : (
                            <Eye className="h-5 w-5 lg:h-5.5 lg:w-5.5 xl:h-6 xl:w-6" />
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
>>>>>>> Stashed changes
  );
}

