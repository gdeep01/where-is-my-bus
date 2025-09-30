import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import PassengerDashboard from './PassengerDashboard';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      // Redirect conductors to their dashboard
      if (profile.role === 'conductor') {
        navigate('/conductor');
        return;
      }
    }
  }, [user, profile, loading, navigate]);

  // For passengers and unauthenticated users, show the passenger dashboard
  return <PassengerDashboard />;
};

export default Index;