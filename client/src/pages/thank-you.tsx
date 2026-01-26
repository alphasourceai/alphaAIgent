import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle2, ExternalLink, Calendar } from 'lucide-react';
import Logo from '@/components/Logo';

export default function ThankYou() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const websiteUrl = 'https://www.alphasourceai.com';
  const scheduleUrl = 'https://calendar.google.com/appointments/schedules/AcZssZ2il6qD_fWs-kW8BdxTg_wwTkHk2bMnjCnTTNKWgWqNN0OdE-3Xj2lFKQ8Mu10mY3Ia7jsIpqVs';

  const handleVisitWebsite = () => {
    window.open(websiteUrl, '_blank');
  };

  const handleScheduleDemo = () => {
    window.open(scheduleUrl, '_blank');
  };

  const handleBackHome = () => {
    if (typeof setLocation === 'function') {
      setLocation('/');
      return;
    }
    window.location.assign('/');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast({
        title: 'Full name required',
        description: 'Please enter your full name.',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      toast({
        title: 'Valid email required',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/demo-info-request', {
        fullName: trimmedName,
        email: trimmedEmail,
      });
      toast({
        title: "Thanks! We'll be in touch.",
      });
      setFullName('');
      setEmail('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send request.';
      toast({
        title: 'Unable to submit request',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-primary" data-testid="icon-success" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">
              Thanks for Chatting!
            </h1>
            <p className="text-lg text-muted-foreground">
              We hope you enjoyed learning about alphaScreen through our AI agent
            </p>
          </div>

          {/* Key Takeaway */}
          <Card className="p-6 text-left">
            <h3 className="font-semibold mb-2">Key Takeaway</h3>
            <p className="text-sm text-muted-foreground">
              alphaScreen automates your entire hiring screening process with AI-driven video interviews 
              and resume analysis, helping you identify top talent faster, more fairly, and more consistently.
            </p>
          </Card>

          {/* CTAs */}
          <div className="space-y-4 pt-4">
            <Button
              size="lg"
              className="w-full rounded-full min-h-14 text-lg font-bold"
              onClick={handleVisitWebsite}
              data-testid="button-visit-website"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Visit alphasourceai.com
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-full min-h-14 text-lg"
              onClick={handleScheduleDemo}
              data-testid="button-schedule-demo"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Schedule a Demo
            </Button>

            <Button
              size="lg"
              variant="ghost"
              className="w-full rounded-full min-h-14 text-lg"
              onClick={handleBackHome}
              data-testid="button-back-home"
            >
              Back to Home
            </Button>

            <div className="pt-2 space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your contact info here for more details.
              </p>
              <form
                className="space-y-4 text-left"
                onSubmit={handleSubmit}
                aria-busy={isSubmitting}
              >
                <div className="space-y-2">
                  <Label htmlFor="demo-full-name">Full Name</Label>
                  <Input
                    id="demo-full-name"
                    name="fullName"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-email">Email</Label>
                  <Input
                    id="demo-email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-full min-h-14 text-lg font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send me more info'}
                </Button>
              </form>
            </div>
          </div>

          {/* Social Proof */}
          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Transform your hiring process with AI-powered candidate screening
            </p>
          </div>

          {/* Logo */}
          <div className="flex justify-center pt-4">
            <Logo size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
