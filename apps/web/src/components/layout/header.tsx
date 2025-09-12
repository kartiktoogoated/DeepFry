import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-200",
      isScrolled ? "bg-background/80 backdrop-blur-md border-b" : "bg-transparent"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">DeepFry</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {pathname !== '/' && (
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
          )}
          {pathname !== '/pricing' && (
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          )}
          {pathname !== '/about' && (
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          )}
          {pathname !== '/how-it-works' && (
            <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
          )}
          {pathname !== '/docs' && (
            <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
          )}
          {pathname !== '/crypto' && (
            <Link to="/crypto" className="text-muted-foreground hover:text-foreground transition-colors">
              Web3
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {isMobileMenuOpen ? (
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {pathname !== '/' && (
              <Link 
                to="/" 
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
            )}
            {pathname !== '/pricing' && (
              <Link 
                to="/pricing" 
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
            )}
            {pathname !== '/about' && (
              <Link 
                to="/about" 
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
            )}
            {pathname !== '/how-it-works' && (
              <Link 
                to="/how-it-works" 
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                How It Works
              </Link>
            )}
            {pathname !== '/docs' && (
              <Link 
                to="/docs" 
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Docs
              </Link>
            )}
            {pathname !== '/crypto' && (
              <Link 
                to="/crypto" 
                className="py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Web3
              </Link>
            )}
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="outline" asChild className="w-full">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
              </Button>
              <Button asChild className="w-full">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;