"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { type ContactDetailsProps } from "@/features/publisher/types/form.types";

const TELEGRAM_BOT_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ||
  "https://t.me/BigDropsMarketingBot";

const ContactDetails: React.FC<ContactDetailsProps> = ({
  formData,
  onDataChange,
  validation,
}) => {
  const variables = getVariables();
  const [isTelegramFocused, setIsTelegramFocused] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "telegramId") {
      let processedValue = value;

      if (value && !value.startsWith("@")) {
        processedValue = "@" + value;
      }

      if (value === "") {
        processedValue = "";
      }

      onDataChange({ [name]: processedValue });
    } else {
      onDataChange({ [name]: value });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;

    if (name === "telegramId" && e.key === "Backspace") {
      if (value === "@") {
        e.preventDefault();
        return;
      }

      if (value.length === 2 && value.startsWith("@")) {
        e.preventDefault();
        onDataChange({ [name]: "@" });
        return;
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;

    if (name === "telegramId") {
      setIsTelegramFocused(true);

      if (!formData.telegramId) {
        onDataChange({ [name]: "@" });
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "telegramId") {
      setIsTelegramFocused(false);

      if (value === "@" || value === "") {
        onDataChange({ [name]: "" });
      }
    }
  };

  const checkVerificationStatus = useCallback(async () => {
    if (!formData.telegramId || formData.telegramId === "@") return false;

    try {
      await fetch("/api/telegram/poll", { method: "POST" });

      const res = await fetch("/api/telegram/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: formData.telegramId,
          email: formData.email,
        }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const verified = Boolean(data.verified && data.savedInDb);

      if (verified) {
        setIsVerified(true);
        setIsVerifying(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }

      return verified;
    } catch (err) {
      console.error("Verification check failed:", err);
      return false;
    }
  }, [formData.telegramId, formData.email]);

  const handleVerify = async () => {
    if (!formData.telegramId || formData.telegramId === "@") return;

    setIsVerifying(true);
    setVerificationAttempted(true);

    const verified = await checkVerificationStatus();

    if (!verified) {
      setIsVerifying(false);
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(async () => {
          await checkVerificationStatus();
        }, 3000);
      }
    }
  };

  useEffect(() => {
    if (formData.telegramId && formData.telegramId !== "@") {
      checkVerificationStatus();
    } else {
      setIsVerified(false);
      setVerificationAttempted(false);
    }
  }, [formData.telegramId, checkVerificationStatus]);

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (
      verificationAttempted &&
      !isVerified &&
      formData.telegramId &&
      formData.telegramId !== "@"
    ) {
      pollingIntervalRef.current = setInterval(async () => {
        await checkVerificationStatus();
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [
    verificationAttempted,
    isVerified,
    formData.telegramId,
    checkVerificationStatus,
  ]);

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-4 w-full">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-inter text-sm">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => {
              handleChange(e);
              validation.handleFieldChange("email", e.target.value);
            }}
            onBlur={() => validation.handleFieldBlur("email")}
            className="w-full h-12 font-inter publisher-form-input"
            style={{
              borderColor:
                validation.hasFieldError("email") &&
                validation.isFieldTouched("email")
                  ? variables.colors.inputErrorColor
                  : variables.colors.inputBorderColor,
            }}
          />
          {validation.hasFieldError("email") &&
            validation.isFieldTouched("email") && (
              <p
                className="text-xs font-inter"
                style={{ color: variables.colors.inputErrorColor }}
              >
                {validation.getFieldErrorMessage("email")}
              </p>
            )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="telegramId" className="font-inter text-sm">
            Telegram ID
          </Label>
          <div className="relative">
            <Input
              id="telegramId"
              name="telegramId"
              type="text"
              placeholder="Enter your Telegram ID"
              value={formData.telegramId}
              onChange={(e) => {
                handleChange(e);
                validation.handleFieldChange("telegramId", e.target.value);
              }}
              onFocus={handleFocus}
              onBlur={(e) => {
                handleBlur(e);
                validation.handleFieldBlur("telegramId");
              }}
              onKeyDown={handleKeyDown}
              className="w-full h-12 font-inter publisher-form-input pr-20"
              style={{
                borderColor:
                  validation.hasFieldError("telegramId") &&
                  validation.isFieldTouched("telegramId")
                    ? variables.colors.inputErrorColor
                    : variables.colors.inputBorderColor,
              }}
            />
            {validation.hasFieldError("telegramId") &&
              validation.isFieldTouched("telegramId") && (
                <p
                  className="text-xs font-inter mt-1"
                  style={{ color: variables.colors.inputErrorColor }}
                >
                  {validation.getFieldErrorMessage("telegramId")}
                </p>
              )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleVerify}
              disabled={
                isVerifying ||
                isVerified ||
                !formData.telegramId ||
                formData.telegramId === "@"
              }
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3 text-xs"
              style={{
                backgroundColor: variables.colors.buttonOutlineBackgroundColor,
                borderColor: variables.colors.buttonOutlineBorderColor,
                color: variables.colors.buttonOutlineTextColor,
              }}
            >
              {isVerifying ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <p>Verifying...</p>
                </div>
              ) : isVerified ? (
                <div className="flex items-center gap-2 border-green-600 rounded-md p-1 text-green-600">
                  <p>Verified</p>
                </div>
              ) : (
                "Verify"
              )}
            </Button>
          </div>

          {isTelegramFocused && (
            <p className="text-xs text-gray-500 mt-1">
              💡 Enter your Telegram ID exactly as it appears - it&apos;s case
              sensitive
            </p>
          )}

          {verificationAttempted && !isVerifying && !isVerified && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-600 rounded-md">
              <h4 className="text-sm font-medium text-warning-medium mb-2">
                Steps to Verify Your Telegram ID:
              </h4>
              <ol className="text-xs text-warning-medium space-y-1.5 list-decimal list-inside mb-3">
                <li>Click on Start Bot Button</li>
                <li>
                  Send <span className="font-semibold">/start</span> to the bot
                </li>
                <li>Come back and Verify again</li>
              </ol>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs w-max border-yellow-600 text-yellow-600 bg-yellow-50 hover:bg-yellow-600 hover:text-white"
              >
                <a
                  href={TELEGRAM_BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Start Bot
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactDetails;
