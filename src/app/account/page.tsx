
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserCog, Shield } from 'lucide-react'; // Changed ShieldKeyhole to Shield
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const updateNameSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

const updatePasswordSchema = z.object({
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type UpdateNameFormValues = z.infer<typeof updateNameSchema>;
type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function AccountPage() {
  const { currentUser, loading: authLoading, error: authError, setError: setAuthError, updateUserProfile, updateUserPassword } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const nameForm = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: {
      name: currentUser?.displayName || "",
    },
  });

  const passwordForm = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
    if (currentUser) {
        nameForm.reset({ name: currentUser.displayName || "" });
    }
  }, [currentUser, authLoading, router, nameForm]);


  const onUpdateNameSubmit = async (data: UpdateNameFormValues) => {
    await updateUserProfile(data.name);
  };

  const onUpdatePasswordSubmit = async (data: UpdatePasswordFormValues) => {
    await updateUserPassword(data.newPassword);
    passwordForm.reset(); // Clear password fields after submission
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center"><UserCog className="mr-3 h-8 w-8" /> Account Management</h1>
        <p className="text-muted-foreground">Manage your profile details and security settings.</p>
      </header>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Personal Information</CardTitle>
          <CardDescription>Update your display name and view your email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" value={currentUser.email || "No email provided"} readOnly disabled className="bg-muted mt-1" />
            </div>
            <Form {...nameForm}>
              <form onSubmit={nameForm.handleSubmit(onUpdateNameSubmit)} className="space-y-4">
                <FormField
                  control={nameForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Your display name" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={nameForm.formState.isSubmitting || authLoading}>
                  {nameForm.formState.isSubmitting || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Name"}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Shield className="mr-2 h-6 w-6" /> Change Password</CardTitle> {/* Changed ShieldKeyhole to Shield */}
          <CardDescription>Update your account password. Make sure it's strong and unique.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onUpdatePasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {authError && <p className="text-sm font-medium text-destructive">{authError}</p>}
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={passwordForm.formState.isSubmitting || authLoading}>
                {passwordForm.formState.isSubmitting || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
