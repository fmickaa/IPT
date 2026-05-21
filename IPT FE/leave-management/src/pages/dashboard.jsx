import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail') || "Guest";
  const token = localStorage.getItem('token'); 
  
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [typesRes, historyRes] = await Promise.all([
          fetch('http://localhost:3000/api/leave-types', { headers }),
          fetch('http://localhost:3000/api/leave', { headers })
        ]);

        if (typesRes.status === 401 || historyRes.status === 401) {
          localStorage.clear();
          navigate('/');
          return;
        }

        const typesData = await typesRes.json();
        const historyData = await historyRes.json();
        
        setLeaveTypes(typesData);
        setHistory(historyData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
    else navigate('/'); 
  }, [token, navigate]);

  /**
   * UPDATED: Now matches your backend logic in app.js
   * Subtracts both Pending and Approved days from the max allowance.
   */
  const getRemainingBalance = (typeId, maxDays) => {
    const usedDays = history
      .filter(r => 
        (r.leaveTypeId?._id === typeId || r.leaveTypeId === typeId) && 
        ['Approved', 'Pending'].includes(r.status) // Updated to match app.js
      )
      .reduce((total, r) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);
    return maxDays - usedDays;
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    
    const leaveTypeId = e.target.leaveType.value;
    const startDate = e.target.startDate.value;
    const endDate = e.target.endDate.value;
    const reason = e.target.reasonLetter.value;

    // --- FRONTEND VALIDATION ---
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      alert("End date cannot be before start date.");
      return;
    }

    const requestedDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    const selectedType = leaveTypes.find(t => t._id === leaveTypeId);
    const currentBalance = getRemainingBalance(leaveTypeId, selectedType.maxDaysPerYear);

    if (requestedDays > currentBalance) {
      alert(`Insufficient balance! You requested ${requestedDays} days, but only have ${currentBalance} remaining.`);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leaveTypeId, startDate, endDate, reason }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Request Sent Successfully!");
        // Re-fetch or manually update history to refresh the balance in UI
        setHistory([result, ...history]); 
        e.target.reset();
      } else {
        alert(`Error: ${result.message || "Failed to submit"}`);
      }
    } catch (err) {
      alert("Server connection failed.");
    }
  };

  if (loading) return <div style={{padding: '30px'}}>Loading dashboard...</div>;

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
        <h2>Welcome, {userEmail}</h2>
        <button 
          onClick={() => { localStorage.clear(); navigate('/'); }}
          style={{padding: '8px 15px', cursor: 'pointer'}}
        >
          Logout
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
        {/* Form Section */}
        <form onSubmit={submitRequest} style={{ flex: 1, border: '1px solid #ddd', padding: '20px', borderRadius: '10px', backgroundColor: '#fff' }}>
          <h3>Apply for Leave</h3>
          
          <label style={labelS}>Leave Category</label>
          <select name="leaveType" style={inputS} required>
            <option value="">-- Choose Type --</option>
            {leaveTypes.map(t => {
              const remaining = getRemainingBalance(t._id, t.maxDaysPerYear);
              return (
                <option key={t._id} value={t._id} disabled={remaining <= 0}>
                  {t.type} (Balance: {remaining} days)
                </option>
              );
            })}
          </select>

          <label style={labelS}>Start Date</label>
          <input name="startDate" type="date" required style={inputS} min={new Date().toISOString().split('T')[0]} />
          
          <label style={labelS}>End Date</label>
          <input name="endDate" type="date" required style={inputS} min={new Date().toISOString().split('T')[0]} />
          
          <label style={labelS}>Reason</label>
          <textarea name="reasonLetter" placeholder="Brief explanation..." required style={{...inputS, height: '100px'}} />
          
          <button type="submit" style={btnS}>
            SUBMIT REQUEST
          </button>
        </form>

        {/* History Section */}
        <div style={{ flex: 2 }}>
          <h3>My Leave History</h3>
          <table border="1" width="100%" style={{ borderCollapse: 'collapse', backgroundColor: '#fff' }}>
            <thead>
              <tr style={{background: '#f8f9fa'}}>
                <th style={{padding: '12px'}}>Type</th>
                <th>Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(r => (
                <tr key={r._id} style={{textAlign: 'center'}}>
                  <td style={{padding:'12px'}}>{r.leaveTypeId?.type || 'N/A'}</td>
                  <td>{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                  <td style={{
                    fontWeight:'bold', 
                    color: r.status === 'Approved' ? '#28a745' : r.status === 'Rejected' ? '#dc3545' : '#fd7e14'
                  }}>
                    {r.status.toUpperCase()}
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan="3" style={{padding: '20px', textAlign: 'center', color: '#999'}}>No leave requests found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Internal Styles
const inputS = { display: 'block', width: '100%', marginBottom: '15px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' };
const labelS = { fontSize: '12px', color: '#666', marginBottom: '5px', display: 'block' };
const btnS = { width: '100%', padding: '12px', background: '#9E0202', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };

export default Dashboard;