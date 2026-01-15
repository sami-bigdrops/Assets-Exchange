"use client";

import { useState } from "react";

import { getVariables } from "@/components/_variables/variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { type ContactDetailsProps } from "@/features/publisher/types/form.types";

const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "https://t.me/your_bot_username";

const ContactDetails: React.FC<ContactDetailsProps> = ({ formData, onDataChange }) => {
    const variables = getVariables();
    const [isTelegramFocused, setIsTelegramFocused] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [verificationAttempted, setVerificationAttempted] = useState(false);

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

    const handleVerify = async () => {
        if (!formData.telegramId || formData.telegramId === "@") return;

        setIsVerifying(true);
        setVerificationAttempted(true);

        try {
            await fetch("/api/telegram/poll", { method: "POST" });

            const res = await fetch("/api/telegram/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telegramId: formData.telegramId }),
            });

            if (!res.ok) {
                throw new Error("Verification request failed");
            }

            const data = await res.json();
            setIsVerified(Boolean(data.verified));
        } catch (err) {
            console.error("Verification failed:", err);
            setIsVerified(false);
        } finally {
            setIsVerifying(false);
        }
    };

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
                        onChange={handleChange}
                        className="w-full h-12 font-inter publisher-form-input"
                    />
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
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            className="w-full h-12 font-inter publisher-form-input pr-20"
                        />
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
                            💡 Enter your Telegram ID exactly as it appears - it&apos;s case sensitive
                        </p>
                    )}

                    {verificationAttempted && !isVerifying && !isVerified && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-600 rounded-md">
                            <h4 className="text-sm font-medium text-warning-medium mb-2">
                                Steps to Verify Your Telegram ID:
                            </h4>
                            <ol className="text-xs text-warning-medium space-y-1.5 list-decimal list-inside mb-3">
                                <li>Click on Start Bot Button</li>
                                <li>Send <span className="font-semibold">/start</span> to the bot</li>
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
