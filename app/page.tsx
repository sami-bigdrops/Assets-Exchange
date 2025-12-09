import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold font-inter text-black">
        Assets Exchange
      </h1>
      <Button className="mt-4">Get Started</Button>
    </div>
  );
}
