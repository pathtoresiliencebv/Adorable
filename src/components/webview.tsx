"use client";

import { requestDevServer as requestDevServerInner } from "./webview-actions";
import "./loader.css";
import {
  FreestyleDevServer,
  FreestyleDevServerHandle,
} from "freestyle-sandboxes/react/dev-server";
import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { RefreshCwIcon } from "lucide-react";
import { ShareButton } from "./share-button";
import Image from "next/image";
import { ErrorBoundary } from "./error-boundary";

export default function WebView(props: {
  repo: string;
  baseId: string;
  appId: string;
  domain?: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function requestDevServer({ repoId }: { repoId: string }) {
    return requestDevServerInner({ repoId });
  }

  const devServerRef = useRef<FreestyleDevServerHandle>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    devServerRef.current?.refresh();
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col overflow-hidden h-screen border-l transition-opacity duration-700 mt-[2px]">
        <div className="h-12 border-b border-gray-200 items-center flex px-2 bg-background sticky top-0 justify-end gap-2">
          <Button
            variant={"ghost"}
            size={"icon"}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCwIcon className={isLoading ? "animate-spin" : ""} />
          </Button>
          <ShareButton domain={props.domain} appId={props.appId} />
        </div>
        
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Image
                src="/placeholder-freestyle-logo.svg"
                alt="Error"
                width={100}
                height={100}
                priority
                className="mx-auto mb-4"
              />
              <div className="text-lg font-medium text-red-600 mb-2">
                Connection Error
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {error}
              </div>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <FreestyleDevServer
            ref={devServerRef}
            actions={{ requestDevServer }}
            repoId={props.repo}
            loadingComponent={({ iframeLoading, devCommandRunning }) =>
              !devCommandRunning && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Image
                      src="/placeholder-freestyle-logo.svg"
                      alt="Loading..."
                      width={100}
                      height={100}
                      priority
                      className="mx-auto mb-4"
                    />
                    <div className="text-lg font-medium text-gray-700 mb-2">
                      {iframeLoading ? "JavaScript Loading" : "Starting VM"}
                    </div>
                    <div className="flex justify-center">
                      <div className="loader"></div>
                    </div>
                  </div>
                </div>
              )
            }
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
