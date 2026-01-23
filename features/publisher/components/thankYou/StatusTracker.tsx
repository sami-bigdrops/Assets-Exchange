"use client";

import React from "react";

import type { StatusItem } from "@/features/publisher/view-models/thankYouPage.viewModel";

interface StatusTrackerProps {
  statuses: StatusItem[];
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ statuses }) => {
  return (
    <div className="w-full">
      {/* Desktop Horizontal Layout */}
      <div className="hidden lg:block">
        <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          {/* Progress line */}
          <div className="absolute top-12 left-6 right-6 h-1 bg-gray-200 rounded-full">
            <div className="h-full w-1/5 bg-linear-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 shadow-sm"></div>
          </div>

          <div className="flex justify-between relative z-10">
            {statuses.map((status) => {
              const IconComponent = status.icon;
              const isActive = status.status === "active";

              return (
                <div
                  key={status.id}
                  className="flex flex-col items-center relative w-full"
                >
                  {/* Icon */}
                  <div className="relative mb-3 w-12 h-12 flex items-center justify-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-3 border-white shadow-lg ${
                        isActive
                          ? "bg-linear-to-br from-blue-500 to-blue-600 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>

                    {/* Pulse effect for active status - background only */}
                    {isActive && (
                      <div className="absolute inset-0 w-12 h-12 rounded-full bg-blue-500 animate-ping opacity-20 -z-10"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="text-center max-w-24">
                    <h4
                      className={`text-xs font-bold mb-1 ${
                        isActive ? "text-blue-900" : "text-gray-600"
                      }`}
                    >
                      {status.title}
                    </h4>
                    <p
                      className={`text-xs leading-tight ${
                        isActive ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {status.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Vertical Layout */}
      <div className="lg:hidden space-y-4">
        {statuses.map((status) => {
          const IconComponent = status.icon;
          const isActive = status.status === "active";

          return (
            <div key={status.id} className="relative">
              <div
                className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 shadow-sm ${
                  isActive
                    ? "bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                {/* Icon */}
                <div className="relative shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-2 border-white shadow-lg ${
                      isActive
                        ? "bg-linear-to-br from-blue-500 to-blue-600 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Pulse effect for active status - background only */}
                  {isActive && (
                    <div className="absolute inset-0 w-12 h-12 rounded-full bg-blue-500 animate-ping opacity-20 -z-10"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-base font-semibold mb-1 ${
                      isActive ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {status.title}
                  </h4>
                  <p
                    className={`text-sm ${
                      isActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {status.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="shrink-0">
                  {isActive ? (
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-sm"></div>
                  ) : (
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
