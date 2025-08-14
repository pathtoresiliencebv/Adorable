# Credits Systeem Implementatie

## 🎯 **Credits Management**

### **1. Credits Service**

```typescript
// src/lib/credits/credits-service.ts
import { db } from '@/db/schema';
import { credits, usageLogs, subscriptions } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export class CreditsService {
  /**
   * Check if user has enough credits
   */
  static async hasEnoughCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
    const userCredits = await db
      .select()
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);

    if (userCredits.length === 0) {
      return false;
    }

    return userCredits[0].balance >= requiredCredits;
  }

  /**
   * Deduct credits from user account
   */
  static async deductCredits(
    userId: string, 
    appId: string, 
    creditsToDeduct: number = 1,
    messageLength?: number
  ): Promise<boolean> {
    try {
      // Use database function for atomic operation
      const result = await db.execute(
        `SELECT deduct_credits($1, $2, $3, $4) as success`,
        [userId, creditsToDeduct, appId, messageLength]
      );

      return result[0]?.success || false;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  /**
   * Get user's current credits balance
   */
  static async getCreditsBalance(userId: string) {
    const userCredits = await db
      .select()
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);

    return userCredits[0] || null;
  }

  /**
   * Add credits to user account
   */
  static async addCredits(userId: string, creditsToAdd: number): Promise<boolean> {
    try {
      await db
        .insert(credits)
        .values({
          userId,
          balance: creditsToAdd,
          totalEarned: creditsToAdd,
        })
        .onConflictDoUpdate({
          target: credits.userId,
          set: {
            balance: credits.balance + creditsToAdd,
            totalEarned: credits.totalEarned + creditsToAdd,
            updatedAt: new Date(),
          },
        });

      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Get user's usage statistics
   */
  static async getUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await db
      .select({
        totalMessages: db.fn.count(usageLogs.id),
        totalCreditsUsed: db.fn.sum(usageLogs.creditsUsed),
        avgMessageLength: db.fn.avg(usageLogs.messageLength),
      })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.userId, userId),
          gte(usageLogs.createdAt, startDate)
        )
      );

    return usage[0] || {
      totalMessages: 0,
      totalCreditsUsed: 0,
      avgMessageLength: 0,
    };
  }

  /**
   * Get low credits users for notifications
   */
  static async getLowCreditsUsers(threshold: number = 5) {
    return await db
      .select()
      .from(credits)
      .where(lte(credits.balance, threshold));
  }

  /**
   * Refresh monthly credits for subscription
   */
  static async refreshMonthlyCredits(userId: string): Promise<boolean> {
    try {
      const result = await db.execute(
        `SELECT refresh_monthly_credits($1) as success`,
        [userId]
      );

      return result[0]?.success || false;
    } catch (error) {
      console.error('Error refreshing credits:', error);
      return false;
    }
  }
}
```

### **2. Credits Middleware**

```typescript
// src/lib/credits/credits-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { CreditsService } from './credits-service';

export async function creditsMiddleware(
  request: NextRequest,
  userId: string,
  appId: string
) {
  // Check if user has enough credits
  const hasCredits = await CreditsService.hasEnoughCredits(userId, 1);
  
  if (!hasCredits) {
    return NextResponse.json(
      { 
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: 1,
        currentCredits: 0,
      },
      { status: 402 } // Payment Required
    );
  }

  // Add credits info to request headers for later use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-credits', 'available');
  requestHeaders.set('x-app-id', appId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

### **3. Credits Hook**

```typescript
// src/hooks/use-credits.ts
import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';

interface CreditsData {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  lastRefreshDate: string;
}

export function useCredits() {
  const { user } = useUser();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/credits/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      setCredits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deductCredits = async (appId: string, messageLength?: number) => {
    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId,
          messageLength,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deduct credits');
      }

      // Refresh credits after deduction
      await fetchCredits();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  return {
    credits,
    loading,
    error,
    fetchCredits,
    deductCredits,
    hasEnoughCredits: credits ? credits.balance > 0 : false,
  };
}
```

## 🔄 **AI Service Integration**

### **1. Updated AI Service**

```typescript
// src/lib/internal/ai-service.ts (updated)
import { UIMessage } from "ai";
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { MessageList } from "@mastra/core/agent";
import { builderAgent } from "@/mastra/agents/builder";
import { CreditsService } from "@/lib/credits/credits-service";

export interface AIStreamOptions {
  threadId: string;
  resourceId: string;
  userId: string; // Added userId for credits tracking
  maxSteps?: number;
  maxRetries?: number;
  maxOutputTokens?: number;
  onChunk?: () => void;
  onStepFinish?: (step: { response: { messages: unknown[] } }) => void;
  onError?: (error: { error: unknown }) => void;
  onFinish?: (response: { messages: unknown[] }) => void;
}

export async function sendMessageWithStreaming(
  agent: Agent,
  appId: string,
  mcpUrl: string,
  messages: MessageList,
  options: AIStreamOptions
): Promise<AIResponse> {
  // Check credits before processing
  const hasCredits = await CreditsService.hasEnoughCredits(options.userId, 1);
  
  if (!hasCredits) {
    throw new Error('Insufficient credits');
  }

  // Deduct credits
  const messageLength = messages[messages.length - 1]?.content?.length || 0;
  const creditsDeducted = await CreditsService.deductCredits(
    options.userId,
    appId,
    1,
    messageLength
  );

  if (!creditsDeducted) {
    throw new Error('Failed to deduct credits');
  }

  // Continue with AI processing
  const mcpClient = new MCPClient({
    id: crypto.randomUUID(),
    servers: {
      dev_server: {
        url: new URL(mcpUrl),
      },
    },
  });

  try {
    const response = await agent.run({
      messages,
      tools: {
        ...mcpClient.tools,
      },
      maxSteps: options.maxSteps || 10,
      maxRetries: options.maxRetries || 3,
      maxOutputTokens: options.maxOutputTokens || 4000,
      onChunk: options.onChunk,
      onStepFinish: options.onStepFinish,
      onError: options.onError,
      onFinish: options.onFinish,
    });

    return {
      stream: {
        toUIMessageStreamResponse: () => ({
          body: response.stream,
        }),
      },
    };
  } catch (error) {
    // Refund credits on error
    await CreditsService.addCredits(options.userId, 1);
    throw error;
  }
}
```

### **2. Updated Chat API**

```typescript
// src/app/api/chat/route.ts (updated)
import { NextRequest, NextResponse } from "next/server";
import { getStreamState, sendMessageWithStreaming } from "@/lib";
import { builderAgent } from "@/mastra/agents/builder";
import { getApp } from "@/actions/get-app";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const appId = req.headers.get("Adorable-App-Id");

    if (!appId) {
      return NextResponse.json(
        { error: "Missing app ID" },
        { status: 400 }
      );
    }

    // Get user from Stack Auth
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get app details
    const app = await getApp(appId);
    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Check if stream is already running
    const streamState = getStreamState(appId);
    if (streamState.isRunning) {
      return NextResponse.json(
        { error: "Stream already running" },
        { status: 409 }
      );
    }

    console.log("creating new chat stream");

    const response = await sendMessageWithStreaming(
      builderAgent,
      appId,
      app.mcpUrl,
      messages,
      {
        threadId: appId,
        resourceId: appId,
        userId: user.id, // Pass userId for credits tracking
        maxSteps: 10,
        maxRetries: 3,
        maxOutputTokens: 4000,
      }
    );

    return response.stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    
    if (error instanceof Error && error.message === 'Insufficient credits') {
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS"
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 📊 **Credits API Endpoints**

### **1. Get Credits Balance**

```typescript
// src/app/api/credits/balance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const credits = await CreditsService.getCreditsBalance(user.id);
    
    if (!credits) {
      // Create free plan credits for new user
      await CreditsService.addCredits(user.id, 5);
      return NextResponse.json({
        balance: 5,
        totalEarned: 5,
        totalUsed: 0,
        lastRefreshDate: new Date().toISOString(),
      });
    }

    return NextResponse.json(credits);
  } catch (error) {
    console.error("Credits balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **2. Deduct Credits**

```typescript
// src/app/api/credits/deduct/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { appId, messageLength } = await req.json();

    if (!appId) {
      return NextResponse.json(
        { error: "Missing app ID" },
        { status: 400 }
      );
    }

    const success = await CreditsService.deductCredits(
      user.id,
      appId,
      1,
      messageLength
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deduct credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **3. Get Usage Statistics**

```typescript
// src/app/api/credits/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const usage = await CreditsService.getUsageStats(user.id, days);

    return NextResponse.json(usage);
  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 🎨 **Frontend Credits Display**

### **1. Credits Display Component**

```typescript
// src/components/credits-display.tsx
"use client";

import { useCredits } from "@/hooks/use-credits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Zap } from "lucide-react";

export function CreditsDisplay() {
  const { credits, loading, error } = useCredits();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Error loading credits</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLowCredits = credits && credits.balance <= 5;

  return (
    <Card className={`w-full ${isLowCredits ? 'border-orange-200' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Credits</span>
          {isLowCredits && (
            <Badge variant="destructive" className="text-xs">
              Low
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">
            {credits?.balance || 0}
          </div>
          <div className="text-xs text-muted-foreground">
            {credits?.totalUsed || 0} used
          </div>
        </div>
        {isLowCredits && (
          <div className="mt-2 text-xs text-orange-600">
            Consider upgrading your plan for more credits
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### **2. Credits Warning Component**

```typescript
// src/components/credits-warning.tsx
"use client";

import { useCredits } from "@/hooks/use-credits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap } from "lucide-react";
import Link from "next/link";

export function CreditsWarning() {
  const { credits, hasEnoughCredits } = useCredits();

  if (!credits || hasEnoughCredits) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Low Credits</AlertTitle>
      <AlertDescription className="text-orange-700">
        You have {credits.balance} credits remaining. 
        <Link href="/billing">
          <Button variant="link" className="p-0 h-auto text-orange-700 underline">
            Upgrade your plan
          </Button>
        </Link>{" "}
        to continue using the AI builder.
      </AlertDescription>
    </Alert>
  );
}
```

---

**Volgende Stappen**: Implementeer subscription management en billing UI
