
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
import { Loader2, MailWarning } from 'lucide-react'; // Added MailWarning

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().default(true).optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { logIn, loading, error, setError, resendVerificationEmail } = useAuth();
  
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
    const email = form.getValues("email");
    if (email) {
        // This is a bit of a workaround as resendVerificationEmail ideally needs the currentUser.
        // For a login page context where currentUser might be null, this is a best-effort.
        // A more robust solution would be a separate "Resend Verification" page or a flow
        // that doesn't require full login if the user exists but isn't verified.
        // For now, we use a placeholder error message if the email isn't found or already verified
        // or prompt the user directly.
        setError("Attempting to resend verification. If your account exists and is unverified, an email will be sent. Otherwise, please sign up or ensure your email is correct.");
        // Ideally, we'd have a backend endpoint to trigger this for an *unauthenticated* user if their email exists but isn't verified.
        // Since resendVerificationEmail in AuthContext requires currentUser, we show a general message.
        // A better approach for login page: If login fails due to "email not verified", then offer resend.
        // The current AuthContext handles this via toast on failed login if emailNotVerified.
        // This button here provides an alternative path if they *know* they need to verify.
        if (auth.currentUser && auth.currentUser.email === email && !auth.currentUser.emailVerified) {
            await resendVerificationEmail();
        } else {
            // Simulate resend for UX, actual resend only if user *just* tried logging in and failed due to verification
            // Or if they are already "known" to firebase but not verified.
            // The actual logic for resending if user is NOT logged in is tricky without a specific Firebase function for it.
            // Firebase typically expects user to be authenticated to call resendEmailVerification.
            // So, we'll rely on the post-login-attempt flow or user going to account page.
             // If an error specifically indicating "email not verified" occurs, then this button becomes more relevant.
            if (error && error.toLowerCase().includes("email not verified")) {
                await resendVerificationEmail(); // This will only work if currentUser got briefly set during failed login attempt.
            } else {
                 // Best guess, a dedicated serverless function would be better here.
                // For now, just inform user.
                alert("To resend verification, please attempt to log in first. If login fails due to non-verification, a prompt to resend may appear or you can use the option on your account page after signing up.");
            }
        }
    } else {
        setError("Please enter your email address first.");
    }
  }

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
                        type="button" // Important: type="button" to not submit the form
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
            Forgot your password or need to resend verification? Try logging in or visit your account page.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
