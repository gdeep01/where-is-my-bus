import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck } from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
            Where My Bus Go
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time bus tracking made simple
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <Card 
            className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary"
            onClick={() => navigate('/passenger')}
          >
            <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  I'm a Passenger
                </h2>
                <p className="text-muted-foreground">
                  Track buses in real-time and find your route
                </p>
              </div>
              <Button size="lg" className="w-full mt-4">
                Continue as Passenger
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary"
            onClick={() => navigate('/conductor')}
          >
            <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <UserCheck className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  I'm a Conductor
                </h2>
                <p className="text-muted-foreground">
                  Share your bus location with passengers
                </p>
              </div>
              <Button size="lg" variant="secondary" className="w-full mt-4">
                Continue as Conductor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;