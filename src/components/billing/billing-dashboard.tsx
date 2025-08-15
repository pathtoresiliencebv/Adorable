"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  TrendingUp, 
  Activity, 
  Users, 
  DollarSign,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface CreditsData {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  lastRefreshDate: string;
}

interface UsageData {
  date: string;
  creditsUsed: number;
  messageCount: number;
}

interface BillingEvent {
  id: string;
  eventType: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
}

interface PlanData {
  name: string;
  price: number;
  credits: number;
  status: string;
  nextBillingDate: string;
}

export function BillingDashboard() {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch credits data
      const creditsResponse = await fetch('/api/credits/check');
      if (creditsResponse.ok) {
        const credits = await creditsResponse.json();
        setCreditsData(credits);
      }

      // Fetch usage data (last 30 days)
      const usageResponse = await fetch('/api/credits/usage?days=30');
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        setUsageData(usage);
      }

      // Fetch billing events
      const eventsResponse = await fetch('/api/billing/events');
      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        setBillingEvents(events);
      }

      // Fetch plan data
      const planResponse = await fetch('/api/billing/plan');
      if (planResponse.ok) {
        const plan = await planResponse.json();
        setPlanData(plan);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your credits, usage, and billing activity
          </p>
        </div>
        <Button 
          onClick={fetchDashboardData} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditsData?.balance || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{creditsData?.totalEarned || 0} total earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditsData?.totalUsed || 0}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planData?.name || 'Free'}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(planData?.price || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(billingEvents.reduce((sum, event) => sum + event.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Credits Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Credits Usage</CardTitle>
                <CardDescription>
                  Your credits consumption over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Usage Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {creditsData?.totalUsed || 0} / {planData?.credits || 10}
                    </span>
                  </div>
                  <Progress 
                    value={((creditsData?.totalUsed || 0) / (planData?.credits || 10)) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {planData?.credits && creditsData?.balance 
                      ? `${planData.credits - creditsData.balance} credits used this month`
                      : 'No usage data available'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your subscription details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Plan</span>
                    <Badge variant="outline">{planData?.name || 'Free'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge className={getStatusColor(planData?.status || 'active')}>
                      {planData?.status || 'Active'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Monthly Price</span>
                    <span className="text-sm">{formatCurrency(planData?.price || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Credits per Month</span>
                    <span className="text-sm">{planData?.credits || 10}</span>
                  </div>
                  {planData?.nextBillingDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Next Billing</span>
                      <span className="text-sm">{formatDate(planData.nextBillingDate)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Detailed usage statistics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageData.length > 0 ? (
                  <div className="space-y-2">
                    {usageData.slice(-7).map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{formatDate(day.date)}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm">{day.creditsUsed} credits</span>
                          <span className="text-sm text-muted-foreground">
                            {day.messageCount} messages
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No usage data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                Recent billing events and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {billingEvents.slice(-10).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium">{event.eventType}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">
                            {formatCurrency(event.amount, event.currency)}
                          </span>
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No billing events found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
