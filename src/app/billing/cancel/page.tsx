"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <XCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
            <CardDescription>
              Your payment was cancelled. No charges have been made to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">
                  No charges were made
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                You can continue using the free plan or try upgrading again later.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Try Again
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/app">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to App
                </Link>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                If you encountered any issues during checkout, please contact our support team.
                We're here to help!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
