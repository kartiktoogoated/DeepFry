/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Activity } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
// import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { publicKey, signMessage, connected } = useWallet();

  // Email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem('token', data.token);
      toast({ title: 'Success!', description: 'You are now logged in.' });
      navigate('/client-dashboard');
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err.message || 'Internal error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sign & verify Phantom wallet
  const handlePhantomSign = async () => {
    try {
      if (!publicKey || !signMessage) {
        toast({ title: 'Error', description: 'Wallet not ready', variant: 'destructive' });
        return;
      }

      const message = 'deepfry-validator-auth';
      const encoded = new TextEncoder().encode(message);
      const signature = await signMessage(encoded);

      const res = await fetch('/api/auth/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          message,
          signature: Array.from(signature),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Wallet login failed');

      localStorage.setItem('token', data.token ?? '');
      toast({ title: 'Success!', description: 'Logged in with Phantom.' });
      navigate('/client-dashboard');
    } catch (err: any) {
      toast({ title: 'Phantom Login failed', description: err.message || String(err), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link to="/">Home</Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold">
          <Activity className="h-6 w-6 text-primary" />
          DeepFry
        </Link>
        <p className="text-muted-foreground mt-2">Distributed Validator Network</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            asChild
          >
            <a href="https://api.deepfry.tech/api/auth/google">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="h-5 w-5 mt-0.5"
              />
              Sign in with Google
            </a>
          </Button>
          {/* <WalletMultiButton className="w-full justify-center" /> */}
          {connected && (
            <Button variant="default" onClick={handlePhantomSign} className="w-full">
              Sign & Login with Phantom
            </Button>
          )}
          <p className="text-sm text-center">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link to="/signup">Sign up with OTP</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;