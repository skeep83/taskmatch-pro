import React from "react";

// Minimal test component to verify React works
const TestApp = () => {
  console.log("TestApp rendering, React is:", React);
  
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    console.log("useEffect working, count:", count);
  }, [count]);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1>ServiceHub - Testing React</h1>
      <p>React hooks test: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Increment: {count}
      </button>
      <p style={{ marginTop: '20px', color: '#666' }}>
        If you can click this button and see the counter increment, React hooks are working correctly.
      </p>
    </div>
  );
};

export default TestApp;