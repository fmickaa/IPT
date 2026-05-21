import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('token'); 

        const response = await fetch('http://localhost:3000/api/admin/reports', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });

        if (response.status === 401) {
          console.error("Token is missing or expired.");
          return;
        }

        const data = await response.json();
        
        if (Array.isArray(data)) {
          const formatted = data.map(item => ({
            // Use names that match your table mapping below
            name: item.employeeName || 'N/A', 
            approved: item.approvedCount || 0,
            pending: item.pendingCount || 0,
            totalReq: item.totalRequests || 0
          }));
          setReports(formatted);
        }
      } catch (error) {
        console.error("Admin fetch failed:", error);
      }
    };
    fetchAdminData();
  }, []);

  const deleteUserData = (name) => {
    if (window.confirm(`Delete all records for ${name}?`)) {
      // Note: If you are using a real backend now, you should 
      // replace this localStorage logic with a DELETE fetch request.
      const all = JSON.parse(localStorage.getItem('allLeaveRequests')) || [];
      const filtered = all.filter(r => r.name !== name);
      localStorage.setItem('allLeaveRequests', JSON.stringify(filtered));
      window.location.reload();
    }
  };

  return (
    <div style={{padding: '30px', fontFamily: 'Arial'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <h2>Admin Management Panel</h2>
        <button onClick={() => navigate('/')}>Logout</button>
      </div>
      <table border="1" width="100%" style={{marginTop: '20px', borderCollapse: 'collapse', textAlign: 'left'}}>
        <thead style={{background: '#f4f4f4'}}>
          <tr>
            <th style={{padding: '10px'}}>User Email</th>
            <th>Approved Days</th>
            <th>Pending Days</th>
            <th>Total Requests</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((u, index) => (
            // Added index to key to ensure uniqueness
            <tr key={`${u.name}-${index}`}>
              <td style={{padding: '10px'}}>{u.name}</td>
              <td>{u.approved}</td>
              <td>{u.pending}</td>
              <td>{u.totalReq}</td>
              <td>
                <button 
                  onClick={() => deleteUserData(u.name)} 
                  style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline'}}
                >
                  Delete User Data
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;