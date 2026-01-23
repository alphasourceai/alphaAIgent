import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ExternalLink, Calendar } from 'lucide-react';
import Logo from '@/components/Logo';

export default function ThankYou() {
  const [, setLocation] = useLocation();
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

            <p className="text-sm text-muted-foreground pt-2">
              Explore alphaScreen and schedule a personalized demo on our website
            </p>
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
