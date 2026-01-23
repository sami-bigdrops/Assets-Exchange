import Image from "next/image";

import { getVariables } from "@/components/_variables";
import PublisherForm from "@/features/publisher/components/form/PublisherForm";

export default function FormPage() {
  const variables = getVariables();

  return (
    <div
      className="flex flex-col items-center justify-start min-h-screen gap-2"
      style={{ backgroundColor: variables.colors.background }}
    >
      <div className="logo flex items-center justify-center my-8 h-auto w-[190px] md:w-[220px] lg:w-[260px]">
        <Image
          src={variables.logo.path}
          alt={variables.logo.alt}
          width={1000}
          height={1000}
          className="w-full h-full object-contain mx-auto"
          style={{ width: "auto", height: "auto" }}
        />
      </div>
      <PublisherForm />
    </div>
  );
}
