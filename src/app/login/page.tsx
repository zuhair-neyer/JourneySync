
"use client";

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MailWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().default(true).optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { logIn, loading, error, setError, resendVerificationEmail, currentUser } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    await logIn(data.email, data.password, data.rememberMe);
  };

  const handleResendEmail = async () => {
    const emailFromForm = form.getValues("email");
    if (!emailFromForm) {
      setError("Please enter your email address first."); // Sets form error message
      toast({ variant: "destructive", title: "Input Error", description: "Please enter your email address to resend verification." });
      return;
    }

    // Condition 1: The current authenticated user (if any) matches the email in form and is not verified.
    const condition1 = currentUser && currentUser.email === emailFromForm && !currentUser.emailVerified;
    // Condition 2: The last login attempt error message suggests the email is not verified.
    const condition2 = error && error.toLowerCase().includes("email not verified");

    if (condition1 || condition2) {
      // Attempt to resend. The AuthContext.resendVerificationEmail will handle cases like no current user.
      await resendVerificationEmail();
    } else {
      toast({
        title: "Information",
        description: "If your email requires verification, please attempt to log in first. An option to resend the email may appear if login fails due to non-verification, or use the option on your account page.",
        duration: 9000,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Log In</CardTitle>
          <CardDescription>Welcome back! Please enter your credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Remember me
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <div className="flex items-start">
                    <MailWarning className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                  {error.toLowerCase().includes("email not verified") && (
                     <Button 
                        type="button" 
                        variant="link" 
                        className="mt-1 px-0 text-destructive h-auto text-sm hover:underline" 
                        onClick={handleResendEmail}
                        disabled={loading}
                      >
                        Resend Verification Email
                      </Button>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Log In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex-col items-center">
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline" onClick={() => setError(null)}>
              Sign up
            </Link>
          </p>
           <p className="mt-2 text-center text-xs text-muted-foreground">
            Forgot your password? You can reset it via your account page or contact support.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
