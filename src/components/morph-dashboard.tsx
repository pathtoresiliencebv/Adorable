"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, TrendingDown, Activity, Zap, Clock, AlertCircle } from "lucide-react";

interface MorphMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  successRate: number;
  cacheHitRate: number;
}

interface MorphConfig {
  api: {
    baseURL: string;
    model: string;
    timeout: number;
    maxRetries: number;
  };
  fastApply: {
    enabled: boolean;
    cache: {
      ttl: number;
      maxSize: number;
    };
    retry: {
      maxAttempts: number;
      backoffMultiplier: number;
    };
    batch: {
      maxSize: number;
      parallel: boolean;
    };
  };
  debug: {
    enabled: boolean;
    dryRun: boolean;
    logLevel: string;
  };
  performance: {
    enableMetrics: boolean;
    enableCaching: boolean;
    enableBackup: boolean;
  };
}

export function MorphDashboard() {
  const [metrics, setMetrics] = useState<MorphMetrics | null>(null);
  const [config, setConfig] = useState<MorphConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would call the Morph metrics API
      // For now, we'll simulate the data
      const mockMetrics: MorphMetrics = {
        totalCalls: 1250,
        successfulCalls: 1187,
        failedCalls: 63,
        averageResponseTime: 2340,
        cacheHits: 892,
        cacheMisses: 358,
        successRate: 0.9496,
        cacheHitRate: 0.7136,
      };
      
      const mockConfig: MorphConfig = {
        api: {
          baseURL: "https://api.morphllm.com/v1",
          model: "morph-v3-large",
          timeout: 30000,
          maxRetries: 3,
        },
        fastApply: {
          enabled: true,
          cache: {
            ttl: 300000,
            maxSize: 100,
          },
          retry: {
            maxAttempts: 3,
            backoffMultiplier: 2,
          },
          batch: {
            maxSize: 5,
            parallel: true,
          },
        },
        debug: {
          enabled: false,
          dryRun: false,
          logLevel: "info",
        },
        performance: {
          enableMetrics: true,
          enableCaching: true,
          enableBackup: true,
        },
      };
      
      setMetrics(mockMetrics);
      setConfig(mockConfig);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (rate: number) => {
    if (rate >= 0.95) return "text-green-600";
    if (rate >= 0.85) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (rate: number) => {
    if (rate >= 0.95) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 0.85) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading Morph metrics: {error}</span>
          </div>
          <Button onClick={fetchMetrics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || !config) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No Morph metrics available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Morph LLM Dashboard</h2>
          <p className="text-muted-foreground">
            Performance metrics and configuration for Morph LLM integration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalCalls.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{Math.floor(metrics.totalCalls * 0.1)} from last hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.successRate * 100).toFixed(1)}%
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={metrics.successRate * 100} className="w-full" />
                  {getStatusBadge(metrics.successRate)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averageResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.averageResponseTime < 3000 ? "Fast" : "Slow"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.cacheHitRate * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.cacheHits} hits / {metrics.cacheMisses} misses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Statistics</CardTitle>
                <CardDescription>Detailed breakdown of API calls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Successful Calls</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{metrics.successfulCalls}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {(metrics.successRate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Failed Calls</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{metrics.failedCalls}</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {((1 - metrics.successRate) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Calls</span>
                  <span className="font-medium">{metrics.totalCalls}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>File caching efficiency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Cache Hits</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{metrics.cacheHits}</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {(metrics.cacheHitRate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cache Misses</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{metrics.cacheMisses}</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {((1 - metrics.cacheHitRate) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Requests</span>
                  <span className="font-medium">{metrics.cacheHits + metrics.cacheMisses}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Response time and success rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Performance charts would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Morph API settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Base URL</span>
                  <code className="text-sm">{config.api.baseURL}</code>
                </div>
                <div className="flex justify-between">
                  <span>Model</span>
                  <code className="text-sm">{config.api.model}</code>
                </div>
                <div className="flex justify-between">
                  <span>Timeout</span>
                  <span>{config.api.timeout}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Retries</span>
                  <span>{config.api.maxRetries}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fast Apply Settings</CardTitle>
                <CardDescription>Performance optimization settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Enabled</span>
                  <Badge variant={config.fastApply.enabled ? "default" : "secondary"}>
                    {config.fastApply.enabled ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cache TTL</span>
                  <span>{config.fastApply.cache.ttl / 1000}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Cache Size</span>
                  <span>{config.fastApply.cache.maxSize} files</span>
                </div>
                <div className="flex justify-between">
                  <span>Batch Size</span>
                  <span>{config.fastApply.batch.maxSize} files</span>
                </div>
                <div className="flex justify-between">
                  <span>Parallel Processing</span>
                  <Badge variant={config.fastApply.batch.parallel ? "default" : "secondary"}>
                    {config.fastApply.batch.parallel ? "Yes" : "No"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Debug & Performance</CardTitle>
              <CardDescription>Debugging and performance monitoring settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex justify-between">
                  <span>Debug Mode</span>
                  <Badge variant={config.debug.enabled ? "default" : "secondary"}>
                    {config.debug.enabled ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Dry Run</span>
                  <Badge variant={config.debug.dryRun ? "default" : "secondary"}>
                    {config.debug.dryRun ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Metrics</span>
                  <Badge variant={config.performance.enableMetrics ? "default" : "secondary"}>
                    {config.performance.enableMetrics ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Backup</span>
                  <Badge variant={config.performance.enableBackup ? "default" : "secondary"}>
                    {config.performance.enableBackup ? "On" : "Off"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
