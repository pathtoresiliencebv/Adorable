"use client";

import { BillingDashboard } from '@/components/billing/billing-dashboard';
import { PlanSelector } from '@/components/billing/plan-selector';
import { CreditsDisplay } from '@/components/billing/credits-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BillingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Billing & Credits</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor your usage
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Choose Your Plan</h2>
                <p className="text-muted-foreground mb-6">
                  Select the plan that best fits your needs. You can upgrade or downgrade at any time.
                </p>
              </div>
              <PlanSelector />
            </div>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Credits Management</h2>
                <p className="text-muted-foreground mb-6">
                  Monitor your credit balance and usage history.
                </p>
              </div>
              <CreditsDisplay />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
