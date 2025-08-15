"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Coins } from "lucide-react";
import Link from "next/link";

export default function BillingSuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    setSessionId(sessionIdParam);
  }, []);

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              Your subscription has been activated and credits have been added to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Coins className="h-5 w-5" />
                <span className="font-medium">
                  Your credits have been refreshed!
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You can now continue using the AI App Builder with your new credits.
              </p>
            </div>

            {sessionId && (
              <div className="text-sm text-muted-foreground">
                Session ID: {sessionId}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/app">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start Building
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/billing">
                  View Billing
                </Link>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                You will receive a confirmation email shortly. 
                If you have any questions, please contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
