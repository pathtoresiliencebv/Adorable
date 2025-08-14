import "@/components/loader.css";
import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <Image
          src="/placeholder-freestyle-logo.svg"
          alt="Loading..."
          width={120}
          height={120}
          priority
          className="mx-auto mb-4"
        />
        <div className="text-xl font-medium text-gray-700 mb-4">Loading App</div>
        <div className="flex justify-center">
          <div className="loader"></div>
        </div>
      </div>
    </div>
  );
}
