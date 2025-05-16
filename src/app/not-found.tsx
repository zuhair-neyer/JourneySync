
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <AlertTriangle className="w-24 h-24 text-destructive mb-8" />
      <h1 className="text-5xl font-bold text-primary mb-4">404 - Page Not Found</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Oops! The page you're looking for doesn't seem to exist.
      </p>
      <Image
        src="https://placehold.co/400x300.png"
        alt="Confused person looking at a map"
        width={400}
        height={300}
        className="rounded-lg shadow-lg mb-8"
        data-ai-hint="lost confusion"
      />
      <Link href="/" passHref>
        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Go Back Home
        </Button>
      </Link>
    </div>
  );
}
