"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Users, Zap } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/stripe-config";

interface PlanSelectorProps {
  userId: string;
  currentPlan?: string;
  onPlanSelect?: (planType: string) => void;
}

export function PlanSelector({ userId, currentPlan = 'free', onPlanSelect }: PlanSelectorProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePlanSelect = async (planType: string) => {
    if (planType === 'free' || planType === currentPlan) {
      return;
    }

    setLoading(planType);

    try {
      const plan = PLANS[planType as keyof typeof PLANS];
      
      if (!plan.stripePriceId) {
        console.error('No Stripe price ID for plan:', planType);
        return;
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          userId,
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        }),
      });

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(null);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
        return <Zap className="h-5 w-5" />;
      case 'team':
        return <Users className="h-5 w-5" />;
      case 'enterprise':
        return <Crown className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(PLANS).map(([planType, plan]) => (
        <Card 
          key={planType}
          className={`relative ${
            currentPlan === planType 
              ? 'border-primary shadow-lg' 
              : 'hover:shadow-md transition-shadow'
          }`}
        >
          {currentPlan === planType && (
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              Current Plan
            </Badge>
          )}
          
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-2">
              {getPlanIcon(planType)}
            </div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription>
              {formatPrice(plan.priceMonthly)}/month
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{plan.creditsMonthly}</div>
              <div className="text-sm text-muted-foreground">credits/month</div>
            </div>
            
            <ul className="space-y-2">
              {Object.entries(plan.features).map(([feature, enabled]) => (
                <li key={feature} className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="capitalize">
                    {feature.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
            
            <Button
              className="w-full"
              variant={currentPlan === planType ? "outline" : "default"}
              disabled={planType === 'free' || currentPlan === planType || loading === planType}
              onClick={() => handlePlanSelect(planType)}
            >
              {loading === planType ? (
                "Loading..."
              ) : currentPlan === planType ? (
                "Current Plan"
              ) : planType === 'free' ? (
                "Free Forever"
              ) : (
                "Upgrade"
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
