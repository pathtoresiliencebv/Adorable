"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Coins, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { formatPrice } from "@/lib/stripe-config";

interface CreditsSummary {
  currentBalance: number;
  totalEarned: number;
  totalUsed: number;
  planType: string;
  planName: string;
  monthlyCredits: number;
  nextRefreshDate?: string;
  needsWarning: boolean;
}

interface CreditsDisplayProps {
  userId: string;
  onUpgrade?: () => void;
}

export function CreditsDisplay({ userId, onUpgrade }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<CreditsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/credits/check?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }
      
      const data = await response.json();
      setCredits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !credits) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load credits</p>
            <Button onClick={fetchCredits} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = credits.monthlyCredits > 0 
    ? ((credits.monthlyCredits - credits.currentBalance) / credits.monthlyCredits) * 100 
    : 0;

  const getCreditsColor = () => {
    if (credits.needsWarning) return "text-red-500";
    if (credits.currentBalance < credits.monthlyCredits * 0.2) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressColor = () => {
    if (usagePercentage > 80) return "bg-red-500";
    if (usagePercentage > 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credits Balance
          </CardTitle>
          <CardDescription>
            {credits.planName} • {credits.monthlyCredits} credits per month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getCreditsColor()}`}>
              {credits.currentBalance}
            </div>
            <div className="text-sm text-muted-foreground">
              of {credits.monthlyCredits} credits remaining
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{Math.round(usagePercentage)}%</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>

          {credits.needsWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Low credits! Consider upgrading your plan.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Total Earned: {credits.totalEarned}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Used: {credits.totalUsed}</span>
            </div>
          </div>

          {credits.nextRefreshDate && (
            <div className="text-xs text-muted-foreground text-center">
              Next refresh: {new Date(credits.nextRefreshDate).toLocaleDateString()}
            </div>
          )}

          {onUpgrade && (
            <Button onClick={onUpgrade} className="w-full">
              Upgrade Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {credits.planType === 'free' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-2">
                Free Plan
              </Badge>
              <p className="text-sm text-blue-800">
                Upgrade to get more credits and advanced features!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
