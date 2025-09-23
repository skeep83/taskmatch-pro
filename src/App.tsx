import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Simple test component to isolate the issue
const TestApp = () => {
  return <div>Test App Working</div>;
};

// Create QueryClient outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  console.log("App rendering, React:", React);
  console.log("QueryClient:", queryClient);
  console.log("QueryClientProvider:", QueryClientProvider);
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TestApp />
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Error in App:", error);
    return <div>Error: {error.message}</div>;
  }
};

export default App;