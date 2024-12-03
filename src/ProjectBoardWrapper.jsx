import React, { useState, useEffect } from 'react';
import LoginPage from './Login.jsx';
import ProjectBoard from './App.jsx';

const ProjectBoardWrapper = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const isAdmin = session.user.email === 'admin@aethercure.com';
        setIsAuthenticated(true);
        setIsAdmin(isAdmin);
      }
    };
    
    checkSession();
  }, []);

  const handleAuthSuccess = (adminStatus) => {
    setIsAuthenticated(true);
    setIsAdmin(adminStatus);
  };

  if (!isAuthenticated) {
    return <LoginPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Modified ProjectBoard component props
  return (
    <ProjectBoard 
      isAdmin={isAdmin} 
      // Pass this prop to hide/show "New Ticket" button based on admin status
    />
  );
};

export default ProjectBoardWrapper;