import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState(''); // Backend uses 'username' not 'email'
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // CRITICAL: Store the real data from the Backend
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userEmail', username); // For display purposes

        // Use the role returned by the server, not the one clicked on the UI
        if (data.role === 'Admin') navigate('/admin');
        else if (data.role === 'Supervisor') navigate('/supervisor');
        else navigate('/dashboard');
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      alert("Cannot connect to server. Ensure your Node.js app is running on port 3000.");
    }
  };

  const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f3f4', fontFamily: 'Arial' };
  const cardStyle = { background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '350px' };
  const roleBtn = { padding: '15px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', marginBottom: '10px', width: '100%' };
  const backBtn = { background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', marginTop: '15px', width: '100%', fontSize: '14px', textDecoration: 'underline' };

  if (!selectedRole) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', color: '#05060F', marginBottom: '30px' }}>Leave System</h2>
          <button onClick={() => setSelectedRole('Employee')} style={{...roleBtn, backgroundColor: '#05060F'}}> Employee Portal</button>
          <button onClick={() => setSelectedRole('Supervisor')} style={{...roleBtn, backgroundColor: '#05060F'}}> Supervisor Portal</button>
          <button onClick={() => setSelectedRole('Admin')} style={{...roleBtn, backgroundColor: '#05060F'}}> Admin Portal</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textTransform: 'capitalize', color: '#202124', marginBottom: '20px', textAlign: 'center' }}>{selectedRole} Login</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Username" 
            required 
            style={inputS} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            required 
            style={inputS} 
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" style={{...roleBtn, backgroundColor: '#05060F', marginTop: '10px', marginBottom: '0'}}>
            Sign In
          </button>
          
          <button 
            type="button" 
            onClick={() => setSelectedRole(null)} 
            style={backBtn}
          >
            ← Back to Role Selection
          </button>
        </form>
      </div>
    </div>
  );
};

const inputS = { 
  width: '100%', 
  padding: '12px', 
  margin: '10px 0', 
  borderRadius: '5px', 
  border: '1px solid #dadce0', 
  boxSizing: 'border-box',
  fontSize: '14px'
};

export default Login;