"use client";

import { Mail, File } from "lucide-react";
import Image from "next/image";
import React, { Suspense } from "react";

import { Constants } from "@/app/Constants/Constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusTracker } from "@/features/publisher/components/thankYou/StatusTracker";
import { useThankYouPage } from "@/features/publisher/view-models/thankYouPage.viewModel";

function ThankYouPageContent() {
  const viewModel = useThankYouPage();

  return (
    <div
      className="min-h-screen py-4 px-4"
      style={{
        backgroundImage: `url(${Constants.background})`,
        backgroundColor: "var(--color-primary-50)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-4 md:mb-8">
          <Image
            src={Constants.logo}
            alt="logo"
            width={100}
            height={100}
            className="w-40 md:w-60 h-10 md:h-20"
          />
        </div>

        {/* Single Large Card */}
        <Card className="w-full shadow-2xl border-0 bg-white/98 backdrop-blur-sm rounded-2xl overflow-hidden p-4 gap-4">
          <CardHeader className="text-center p-4">
            <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 md:mb-4 leading-tight">
              {viewModel.submissionInfo.title}
            </CardTitle>

            <CardDescription className="text-sm md:text-base text-gray-600 leading-relaxed mb-4 md:mb-6 max-w-3xl mx-auto">
              {viewModel.submissionInfo.description}
            </CardDescription>

            {/* Enhanced confirmation message */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 max-w-3xl mx-auto shadow-sm">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <p className="text-xs md:text-sm text-blue-800 font-medium">
                    A confirmation email with your submission ID and tracking
                    number will be sent to your email.
                  </p>
                </div>
                {viewModel.trackingCode && (
                  <div className="mt-2 text-center p-2 bg-white rounded-lg border border-blue-100 w-full max-w-sm">
                    <p className="text-xs text-gray-500 mb-1">
                      Your Tracking Code
                    </p>
                    <p className="text-xl font-mono font-bold text-blue-700 tracking-wider">
                      {viewModel.trackingCode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <Separator className="mx-auto mb-6 md:mb-8 w-4/5 max-w-2xl bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

          <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
            {/* Status Tracker Section */}
            <div className="mb-8 md:mb-10">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                  Track Your Submission
                </h3>
                <p className="text-xs md:text-sm text-gray-600 max-w-xl mx-auto">
                  Monitor the progress of your creative submission through our
                  review process
                </p>
              </div>
              <StatusTracker statuses={viewModel.statuses} />
            </div>

            {/* Important Notes and Actions */}
            <div className="space-y-6">
              {/* Enhanced Important Notes */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm">
                <div className="flex items-center mb-3 md:mb-4">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                    <File className="w-3 h-3 text-blue-600" />
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900">
                    Important Information
                  </h3>
                </div>
                <ul className="text-xs md:text-sm text-gray-700 space-y-2 md:space-y-3">
                  <li className="flex items-start group">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0 group-hover:bg-blue-600 transition-colors">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <span>
                      Please check your spam/junk folder if you don&apos;t
                      receive the email
                    </span>
                  </li>
                  <li className="flex items-start group">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0 group-hover:bg-blue-600 transition-colors">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <span>
                      Keep your submission ID safe for future reference
                    </span>
                  </li>
                  <li className="flex items-start group">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0 group-hover:bg-blue-600 transition-colors">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <span>You can submit additional creatives at any time</span>
                  </li>
                  <li className="flex items-start group">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0 group-hover:bg-blue-600 transition-colors">
                      <span className="text-white text-xs font-bold">4</span>
                    </div>
                    <span>For urgent inquiries, contact our support team</span>
                  </li>
                  {viewModel.submissionType === "multiple" && (
                    <li className="flex items-start group">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2 mt-0.5 shrink-0 group-hover:bg-blue-600 transition-colors">
                        <span className="text-white text-xs font-bold">5</span>
                      </div>
                      <span>
                        Review progress will be tracked separately for each
                        creative file
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ThankYouPageContent />
    </Suspense>
  );
}
