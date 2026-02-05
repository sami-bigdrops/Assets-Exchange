"use client";

import React from "react";

import type { StatusItem } from "@/features/publisher/view-models/thankYouPage.viewModel";

interface StatusTrackerProps {
  statuses: StatusItem[];
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ statuses }) => {
  // Find the index of the current active (not completed) step
  const currentActiveIndex = statuses.findIndex((s, idx) => {
    const nextStatus = statuses[idx + 1];
    return (
      s.status === "active" && (!nextStatus || nextStatus.status === "pending")
    );
  });

  // Calculate progress line width - goes from first icon center to current active icon center
  const activeIndex =
    currentActiveIndex >= 0
      ? currentActiveIndex
      : statuses.findIndex((s) => s.status === "active");

  // For precise alignment: calculate based on icon positions
  // With justify-between, icons are at 0%, 25%, 50%, 75%, 100% for 5 items
  // We want the line to extend from 0 to the active icon position
  // When only first status is active (index 0), show a partial line to indicate progress
  const progressWidth =
    activeIndex >= 0
      ? activeIndex === 0
        ? 5 // Show 5% progress for first status to make it visible
        : (activeIndex / (statuses.length - 1)) * 100
      : 0;

  return (
    <div className="w-full">
      {/* Desktop Horizontal Layout */}
      <div className="hidden lg:block">
        <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          {/* Icons container with progress line */}
          <div className="relative">
            {/* Progress line background */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 rounded-full mx-6">
              <div
                className="h-full rounded-full transition-all duration-1000 shadow-sm origin-left bg-blue-500"
                style={{
                  width:
                    progressWidth > 0 ? `calc(${progressWidth}% + 24px)` : "0%",
                  maxWidth: "100%",
                }}
              ></div>
            </div>

            {/* Status items */}
            <div className="flex justify-between relative z-10">
              {statuses.map((status, index) => {
                const IconComponent = status.icon;
                const isActive = status.status === "active";
                const isCurrentActive = index === currentActiveIndex;

                return (
                  <div
                    key={status.id}
                    className="flex flex-col items-center relative"
                    style={{ flex: "1 1 0%" }}
                  >
                    {/* Icon */}
                    <div className="relative mb-3 w-12 h-12 flex items-center justify-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-3 border-white shadow-lg ${
                          isActive && status.color === "amber"
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                            : isActive && status.color === "cyan"
                              ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white"
                              : isActive && status.color === "green"
                                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                                : isActive && status.color === "red"
                                  ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                                  : isActive
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                    : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>

                      {/* Pulse effect for current active status only - background only */}
                      {isCurrentActive && (
                        <div
                          className={`absolute inset-0 w-12 h-12 rounded-full ${status.color === "amber" ? "bg-amber-500" : status.color === "cyan" ? "bg-cyan-500" : status.color === "green" ? "bg-emerald-500" : status.color === "red" ? "bg-red-500" : "bg-blue-500"} animate-ping opacity-20 -z-10`}
                        ></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="text-center max-w-48">
                      <h4
                        className={`text-xs font-bold mb-1 ${
                          isActive && status.color === "amber"
                            ? "text-amber-900"
                            : isActive && status.color === "cyan"
                              ? "text-cyan-900"
                              : isActive
                                ? "text-blue-900"
                                : "text-gray-600"
                        }`}
                      >
                        {status.title}
                      </h4>
                      <p
                        className={`text-xs leading-tight ${
                          isActive && status.color === "amber"
                            ? "text-amber-600"
                            : isActive && status.color === "cyan"
                              ? "text-cyan-600"
                              : isActive && status.color === "green"
                                ? "text-emerald-600"
                                : isActive && status.color === "red"
                                  ? "text-red-600"
                                  : isActive
                                    ? "text-blue-600"
                                    : "text-gray-500"
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
      </div>

      {/* Mobile Vertical Layout */}
      <div className="lg:hidden space-y-4">
        {statuses.map((status, index) => {
          const IconComponent = status.icon;
          const isActive = status.status === "active";
          const isCurrentActive = index === currentActiveIndex;

          return (
            <div key={status.id} className="relative">
              <div
                className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 shadow-sm ${
                  isActive && status.color === "amber"
                    ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200"
                    : isActive && status.color === "cyan"
                      ? "bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-cyan-200"
                      : isActive && status.color === "green"
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200"
                        : isActive && status.color === "red"
                          ? "bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200"
                          : isActive
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
                            : "bg-gray-50 border border-gray-200"
                }`}
              >
                {/* Icon */}
                <div className="relative shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-2 border-white shadow-lg ${
                      isActive && status.color === "amber"
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                        : isActive && status.color === "cyan"
                          ? "bg-gradient-to-br from-cyan-500 to-cyan-600 text-white"
                          : isActive && status.color === "green"
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                            : isActive && status.color === "red"
                              ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                              : isActive
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Pulse effect for current active status only - background only */}
                  {isCurrentActive && (
                    <div
                      className={`absolute inset-0 w-12 h-12 rounded-full ${status.color === "amber" ? "bg-amber-500" : status.color === "cyan" ? "bg-cyan-500" : status.color === "green" ? "bg-emerald-500" : status.color === "red" ? "bg-red-500" : "bg-blue-500"} animate-ping opacity-20 -z-10`}
                    ></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-base font-semibold mb-1 ${
                      isActive && status.color === "amber"
                        ? "text-amber-900"
                        : isActive && status.color === "cyan"
                          ? "text-cyan-900"
                          : isActive && status.color === "green"
                            ? "text-emerald-900"
                            : isActive && status.color === "red"
                              ? "text-red-900"
                              : isActive
                                ? "text-blue-900"
                                : "text-gray-700"
                    }`}
                  >
                    {status.title}
                  </h4>
                  <p
                    className={`text-sm ${
                      isActive && status.color === "amber"
                        ? "text-amber-600"
                        : isActive && status.color === "cyan"
                          ? "text-cyan-600"
                          : isActive && status.color === "green"
                            ? "text-emerald-600"
                            : isActive && status.color === "red"
                              ? "text-red-600"
                              : isActive
                                ? "text-blue-600"
                                : "text-gray-500"
                    }`}
                  >
                    {status.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="shrink-0">
                  {isCurrentActive ? (
                    <div
                      className={`w-3 h-3 ${status.color === "amber" ? "bg-amber-500" : status.color === "cyan" ? "bg-cyan-500" : status.color === "green" ? "bg-emerald-500" : status.color === "red" ? "bg-red-500" : "bg-blue-500"} rounded-full animate-pulse shadow-sm`}
                    ></div>
                  ) : isActive ? (
                    <div
                      className={`w-3 h-3 ${status.color === "amber" ? "bg-amber-500" : status.color === "cyan" ? "bg-cyan-500" : status.color === "green" ? "bg-emerald-500" : status.color === "red" ? "bg-red-500" : "bg-blue-500"} rounded-full shadow-sm`}
                    ></div>
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
