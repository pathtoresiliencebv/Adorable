"use client";

import { useState } from "react";
import { PlanSelector } from "@/components/billing/plan-selector";
import { CreditsDisplay } from "@/components/billing/credits-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Coins, Settings } from "lucide-react";

// This would come from your auth system
const MOCK_USER_ID = "user_123";

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState("free");
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Billing & Credits</h1>
          <p className="text-muted-foreground">
            Manage your subscription and track your AI usage credits.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Credits Display */}
          <div className="lg:col-span-1">
            <CreditsDisplay 
              userId={MOCK_USER_ID}
              onUpgrade={() => setShowUpgrade(true)}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="plans" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="plans" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Plans
                </TabsTrigger>
                <TabsTrigger value="usage" className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Usage
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plans" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Choose Your Plan</CardTitle>
                    <CardDescription>
                      Select the plan that best fits your needs. Each message costs 1 credit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlanSelector 
                      userId={MOCK_USER_ID}
                      currentPlan={currentPlan}
                      onPlanSelect={setCurrentPlan}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Analytics</CardTitle>
                    <CardDescription>
                      Track your AI usage and credits consumption over time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Usage analytics coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Settings</CardTitle>
                    <CardDescription>
                      Manage your payment methods and billing preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Billing settings coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* How Credits Work */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>How Credits Work</CardTitle>
              <CardDescription>
                Understanding the credits system and pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coins className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">1 Credit per Message</h3>
                  <p className="text-sm text-muted-foreground">
                    Each AI interaction costs 1 credit, regardless of message length.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Monthly Refresh</h3>
                  <p className="text-sm text-muted-foreground">
                    Credits refresh monthly based on your subscription plan.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Flexible Plans</h3>
                  <p className="text-sm text-muted-foreground">
                    Upgrade or downgrade your plan at any time to adjust your credit allocation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
