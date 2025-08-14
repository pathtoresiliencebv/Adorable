# Billing UI Implementatie

## 🎨 **Plan Selection Interface**

### **1. Pricing Plans Component**

```typescript
// src/components/billing/pricing-plans.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Users, Building2, Crown } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { BillingService } from "@/lib/billing/billing-service";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 5,
    features: [
      "AI App Builder",
      "5 credits per month",
      "Basic support",
      "Community access",
    ],
    icon: Zap,
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 20,
    credits: 100,
    features: [
      "Everything in Free",
      "100 credits per month",
      "Priority support",
      "Advanced features",
      "Email support",
    ],
    icon: Zap,
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    price: 50,
    credits: 400,
    features: [
      "Everything in Pro",
      "400 credits per month",
      "Team collaboration",
      "Shared workspaces",
      "Advanced analytics",
    ],
    icon: Users,
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 200,
    credits: 2000,
    features: [
      "Everything in Team",
      "2000 credits per month",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Onboarding assistance",
    ],
    icon: Building2,
    popular: false,
  },
];

export function PricingPlans() {
  const { subscription, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlanSelect = async (planId: string) => {
    if (planId === "free") return;
    
    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      const session = await BillingService.createCheckoutSession(
        subscription?.userId || "",
        planId
      );
      
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setIsLoading(false);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return subscription?.planType === planId;
  };

  const canUpgrade = (planId: string) => {
    if (planId === "free") return false;
    if (!subscription?.hasSubscription) return true;
    
    const planOrder = ["free", "pro", "team", "enterprise"];
    const currentIndex = planOrder.indexOf(subscription.planType || "free");
    const selectedIndex = planOrder.indexOf(planId);
    
    return selectedIndex > currentIndex;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 rounded w-4/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => {
        const Icon = plan.icon;
        const isCurrent = isCurrentPlan(plan.id);
        const canUpgradePlan = canUpgrade(plan.id);

        return (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular
                ? "ring-2 ring-blue-500 shadow-lg"
                : "border-gray-200"
            } ${isCurrent ? "bg-blue-50" : ""}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                Most Popular
              </Badge>
            )}
            
            {isCurrent && (
              <Badge className="absolute -top-3 right-4 bg-green-500">
                Current Plan
              </Badge>
            )}

            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Icon className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">€{plan.price}</span>
                {plan.price > 0 && <span className="text-sm text-gray-500">/month</span>}
              </CardDescription>
              <div className="text-sm text-gray-600">
                {plan.credits} credits per month
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={isCurrent || !canUpgradePlan || isLoading}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {isLoading && selectedPlan === plan.id ? (
                  "Loading..."
                ) : isCurrent ? (
                  "Current Plan"
                ) : plan.price === 0 ? (
                  "Get Started"
                ) : (
                  "Choose Plan"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

### **2. Billing Dashboard**

```typescript
// src/components/billing/billing-dashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/use-subscription";
import { useCredits } from "@/hooks/use-credits";
import { CreditsDisplay } from "@/components/credits-display";
import { BillingHistory } from "./billing-history";
import { UsageAnalytics } from "./usage-analytics";
import { Calendar, CreditCard, Download, Settings } from "lucide-react";

export function BillingDashboard() {
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { credits, loading: creditsLoading } = useCredits();
  const [activeTab, setActiveTab] = useState("overview");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (subscriptionLoading || creditsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing & Usage</h1>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CreditsDisplay />
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {subscription?.planType || "Free"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {subscription?.hasSubscription ? "Active subscription" : "Free plan"}
                </p>
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usage This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {credits?.totalUsed || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  credits used
                </p>
              </CardContent>
            </Card>
          </div>

          {subscription?.cancelAtPeriodEnd && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive">Canceling</Badge>
                  <span className="text-sm text-orange-800">
                    Your subscription will end on {formatDate(subscription.currentPeriodEnd || "")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <UsageAnalytics />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingHistory />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Billing Settings</span>
              </CardTitle>
              <CardDescription>
                Manage your billing preferences and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Payment Method</h4>
                  <p className="text-sm text-muted-foreground">
                    Update your payment information
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Billing Address</h4>
                  <p className="text-sm text-muted-foreground">
                    Update your billing address
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Tax Information</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage your tax settings
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### **3. Billing History Component**

```typescript
// src/components/billing/billing-history.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye } from "lucide-react";

interface BillingEvent {
  id: string;
  eventType: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  metadata?: any;
}

export function BillingHistory() {
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch('/api/billing/history');
      if (response.ok) {
        const data = await response.json();
        setBillingEvents(data);
      }
    } catch (error) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: 'Completed' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent billing activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your recent billing activity</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {billingEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No billing history found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatDate(event.createdAt)}</TableCell>
                  <TableCell className="capitalize">
                    {event.eventType.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    {event.amount > 0 ? formatAmount(event.amount, event.currency) : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(event.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

### **4. Usage Analytics Component**

```typescript
// src/components/billing/usage-analytics.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UsageData {
  date: string;
  messages: number;
  credits: number;
}

export function UsageAnalytics() {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const fetchUsageData = async () => {
    try {
      const response = await fetch(`/api/credits/usage?days=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usage Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData.reduce((sum, day) => sum + day.messages, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              in the last {timeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData.reduce((sum, day) => sum + day.credits, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              in the last {timeRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Daily Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData.length > 0 
                ? Math.round(usageData.reduce((sum, day) => sum + day.credits, 0) / usageData.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              credits per day
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Daily credits usage for the last {timeRange} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('nl-NL')}
                formatter={(value: number) => [value, 'Credits']}
              />
              <Bar dataKey="credits" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🔄 **Billing Pages**

### **1. Billing Page**

```typescript
// src/app/billing/page.tsx
import { BillingDashboard } from "@/components/billing/billing-dashboard";

export default function BillingPage() {
  return (
    <div className="container mx-auto py-8">
      <BillingDashboard />
    </div>
  );
}
```

### **2. Pricing Page**

```typescript
// src/app/pricing/page.tsx
import { PricingPlans } from "@/components/billing/pricing-plans";

export default function PricingPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Start building AI apps with our flexible pricing plans
        </p>
      </div>
      
      <PricingPlans />
      
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="max-w-2xl mx-auto space-y-4 text-left">
          <div>
            <h3 className="font-semibold">How do credits work?</h3>
            <p className="text-muted-foreground">
              Each message you send to the AI builder costs 1 credit. Credits refresh monthly based on your plan.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Can I upgrade or downgrade my plan?</h3>
            <p className="text-muted-foreground">
              Yes, you can change your plan at any time. Upgrades take effect immediately with prorated billing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">What happens if I run out of credits?</h3>
            <p className="text-muted-foreground">
              You'll need to upgrade your plan or wait until your credits refresh next month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **3. Success/Cancel Pages**

```typescript
// src/app/billing/success/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle>Payment Successful!</CardTitle>
            <CardDescription>
              Your subscription has been activated and credits have been added to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/app">
              <Button className="w-full">
                Start Building
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

```typescript
// src/app/billing/cancel/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle>Payment Cancelled</CardTitle>
            <CardDescription>
              Your payment was cancelled. You can try again or contact support if you need help.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Link href="/pricing">
              <Button className="w-full">
                Try Again
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

**Volgende Stappen**: Implementeer API endpoints en Stack Auth integratie
