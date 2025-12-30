"use client";

import { Button } from "@/components/ui/button";
import { getVariables } from "@/components/_variables";
import Image from "next/image"; 
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { FileUp, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const variables = getVariables();
  
  // State management for tracking functionality
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = () => {
    router.push("/form");
  }

  const handleTrackingIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow alphanumeric characters (letters and numbers) and limit to 12 characters
    const alphanumericOnly = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();
    setTrackingId(alphanumericOnly);
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  }

  const validateTrackingId = (): boolean => {
    if (!trackingId) {
      setError("Please enter a tracking ID");
      return false;
    }
    
    if (trackingId.length !== 12) {
      setError("Tracking ID must be exactly 12 characters");
      return false;
    }
    
    return true;
  }

  const handleTrackClick = async () => {
    // Validate tracking ID
    if (!validateTrackingId()) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      
      // TODO: Replace with actual API call
      // Simulating API call for now
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to tracking page with the tracking ID
      router.push(`/track/${trackingId}`);
    } catch (err) {
      setError("Failed to track creative. Please try again.");
      console.error("Tracking error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTrackClick();
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-start min-h-screen gap-2" style={{ backgroundColor: variables.colors.background }}>
      <div className="logo flex items-center justify-center mt-12 md:mt-16 lg:mt-18  mb-12 md:mb-16  h-auto w-[190px] md:w-[220px] lg:w-[260px] ">
          <Image
            src={variables.logo.path}
            alt={variables.logo.alt}
            width={1000}
            height={1000}
            className="w-full h-full object-contain mx-auto"
          />
        </div>
      <Card className="w-full max-w-md lg:max-w-xl xl:max-w-3xl gap-6 xl:gap-8" style={{ backgroundColor: variables.colors.cardBackground }}>
        <CardHeader className="flex flex-col items-center justify-center gap-4">
          <CardTitle className="font-inter text-3xl font-semibold">Assets Exchange</CardTitle>
          <CardDescription className="font-inter text-sm text-muted-foreground">Submit your creatives or track previously submitted assets</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center gap-4">
          <div className="w-1/2 flex flex-col items-center justify-center gap-4 bg-[#F9F7FF] border border-[#9B81D1] p-6 rounded-lg">
            <FileUp className="w-12 h-12 text-[#9B81D1]" />
            <div className="flex flex-col items-center justify-center gap-1"> 
              <p className="font-inter text-lg font-semibold text-gray-900">Submit Creative</p>
              <p className="font-inter text-sm text-gray-500">Upload your creative for approval</p>
            </div>
            <Button 
              className="w-full h-12 font-inter bg-[#3B82F6] hover:bg-[#2563EB]" 
              variant="default" 
              onClick={handleClick}
              aria-label="Submit new creative"
            >
              Submit Now
            </Button>
          </div>
          <div className="w-1/2 flex flex-col items-center justify-center gap-4 bg-[#F1F9FF] border border-[#7C90CF] p-6 rounded-lg">
            <div className="flex flex-col items-center justify-center gap-1"> 
              <p className="font-inter text-lg font-semibold text-gray-900">Track Creative</p>
              <p className="font-inter text-sm text-gray-500 text-center">Track your creative using tracking ID</p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <Input 
                placeholder="Enter 12-character ID" 
                className={`w-full h-12 font-inter bg-[#FFFFFF] ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                value={trackingId}
                onChange={handleTrackingIdChange}
                onKeyPress={handleKeyPress}
                maxLength={12}
                disabled={isLoading}
                aria-label="Tracking ID"
                aria-invalid={!!error}
                aria-describedby={error ? "tracking-error" : undefined}
              />
              {error && (
                <p id="tracking-error" className="text-xs text-red-500 font-inter px-1" role="alert">
                  {error}
                </p>
              )}
            </div>
            <Button 
              className="w-full h-12 font-inter bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed" 
              variant="default" 
              onClick={handleTrackClick}
              disabled={isLoading || !trackingId || trackingId.length !== 12}
              aria-label="Track creative submission"
            >
              {isLoading ? "Tracking..." : "Track Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
