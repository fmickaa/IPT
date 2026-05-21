import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [totals, setTotals] = useState({ total: 0, approved: 0, rejected: 0 });
  
  // State for managing active UI view layer selection
  const [selectedLeave, setSelectedLeave] = useState(null);

  // Core function to pull aggregated table data from backend pipeline
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
        localStorage.clear();
        navigate('/');
        return;
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        let aggregateTotal = 0;
        let aggregateApproved = 0;
        let aggregateRejected = 0;

        const formatted = data.map(item => {
          aggregateTotal += (item.totalRequests || 0);
          aggregateApproved += (item.approvedCount || 0);
          aggregateRejected += (item.rejectedCount || 0);

          // Dynamically compute requested date ranges and total days from the backend response
          let dateRangeString = 'N/A';
          let totalDaysCalculated = 0;

          if (item.startDate && item.endDate) {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);
            dateRangeString = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
            totalDaysCalculated = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
          }

          // Build a safe dynamic object map tying backend parameters perfectly to UI nodes
          return {
            id: item._id, 
            name: item.employeeName || item.userEmail || 'Unknown Employee', 
            email: item.userEmail || 'No Email Provided',
            department: item.department || 'General',
            approved: item.approvedCount || 0,
            pending: item.pendingCount || 0,
            rejected: item.rejectedCount || 0,
            totalReq: item.totalRequests || 0,
            
            // Connect dynamic database arrays safely instead of template fallbacks
            reason: item.latestReason || 'No reason specified',
            dates: dateRangeString,
            days: totalDaysCalculated,
            dateSubmitted: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            status: item.pendingCount > 0 ? 'Pending' : item.rejectedCount > item.approvedCount ? 'Rejected' : 'Approved'
          };
        });

        setTotals({ total: aggregateTotal, approved: aggregateApproved, rejected: aggregateRejected });
        setReports(formatted);
      }
    } catch (error) {
      console.error("Admin dataset compilation error:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchAdminData();
    else navigate('/');
  }, [navigate]);

  // Connected backend routing execution to delete record collections natively
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to permanently delete this user's account records?")) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert("User records successfully purged from system storage.");
        setSelectedLeave(null); 
        fetchAdminData(); 
      } else {
        const errData = await response.json();
        alert(`Deletion Failed: ${errData.message || 'Server rejected procedure.'}`);
      }
    } catch (error) {
      console.error("Database connection fault during record purging:", error);
    }
  };

  // Status style helper to keep dynamic code matching wireframe layout colors cleanly
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#40c057';
      case 'Rejected': return '#fa5252';
      default: return '#f29900';
    }
  };

  // --- VIEW 2: HISTORICAL LEAVE RECORD VIEW (RENDERED ON CLICK) ---
  if (selectedLeave) {
    return (
      <div style={{
        maxWidth: '800px', 
        margin: '40px auto', 
        padding: '20px 40px', 
        fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        backgroundColor: '#fff'
      }}>
        {/* Wireframe Header Element */}
        <div style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '15px', marginBottom: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#9E0202' }}>
            Admin<span style={{ color: '#74788d', fontWeight: 'normal' }}>Portal</span>
          </h1>
        </div>

        {/* Dynamic Context Interactivity link to swap back layer */}
        <button 
          onClick={() => setSelectedLeave(null)}
          style={{
            background: 'none',
            border: 'none',
            color: '#74788d',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0',
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← Back to Inbox
        </button>

        {/* Dynamic Detail Panel Box */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '22px', fontWeight: '500', color: '#212529' }}>
              Vacation Leave Request
            </h2>
            
            {/* Real Active connected data elements mapped from user schema query */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: `1px solid ${getStatusColor(selectedLeave.status)}`,
                color: getStatusColor(selectedLeave.status),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {selectedLeave.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#212529' }}>{selectedLeave.email}</div>
                <div style={{ fontSize: '11px', color: '#868e96' }}>to me  {selectedLeave.dateSubmitted}</div>
              </div>
            </div>
          </div>

          {/* Real Dynamically Driven Status Indicator */}
          <span style={{
            backgroundColor: getStatusColor(selectedLeave.status),
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {selectedLeave.status}
          </span>
        </div>

        {/* Dynamic Date Block Calculations */}
        <div style={{
          backgroundColor: '#f1f3f5',
          borderRadius: '4px',
          padding: '10px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#495057',
          fontWeight: '500',
          marginBottom: '35px'
        }}>
          Requested Dates: {selectedLeave.dates} ({selectedLeave.days} days)
        </div>

        {/* Live dynamic reason block mapped directly from database text strings */}
        <div style={{ textAlign: 'center', color: '#495057', fontSize: '15px', marginBottom: '60px', fontStyle: 'italic' }}>
          Reason: {selectedLeave.reason}
        </div>

        {/* Destructive Mutation Component Node */}
        <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#868e96', fontSize: '12px' }}>
            This is a read-only historical record. Actions are managed by Supervisors.
          </span>
          
          <button
            onClick={() => handleDeleteUser(selectedLeave.id)}
            style={{
              backgroundColor: '#fa5252',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e03131'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fa5252'}
          >
            Delete User Data
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW 1: MAIN DASHBOARD OVERVIEW TABLE GRID ---
  return (
    <div style={{
      maxWidth: '800px', 
      margin: '40px auto', 
      padding: '20px 40px', 
      fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      backgroundColor: '#fff'
    }}>
      
      {/* Dynamic Counter Layout Dashboard Ribbon Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
            <span style={{ color: '#9E0202' }}>Admin</span>
            <span style={{ color: '#000' }}>Panel</span>
          </h1>
          
          <div style={{ display: 'flex', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
            <span style={{ backgroundColor: '#e9ecef', color: '#495057', padding: '3px 8px', borderRadius: '3px' }}>
              Total {totals.total}
            </span>
            <span style={{ backgroundColor: '#40c057', color: '#fff', padding: '3px 8px', borderRadius: '3px' }}>
              App: {totals.approved}
            </span>
            <span style={{ backgroundColor: '#fa5252', color: '#fff', padding: '3px 8px', borderRadius: '3px' }}>
              Rej: {totals.rejected}
            </span>
          </div>
        </div>

        <button 
          onClick={() => { localStorage.clear(); navigate('/'); }}
          style={{
            backgroundColor: '#fff',
            border: '1px solid #000',
            color: '#000',
            padding: '4px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: '500'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ 
        textAlign: 'center', 
        color: '#868e96', 
        fontSize: '12px', 
        fontWeight: 'bold',
        borderBottom: '1px solid #dee2e6', 
        paddingBottom: '8px',
        marginBottom: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Inbox - Leave Request
      </div>

      {/* Structured Aggregate Data Rows */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <tbody>
          {reports.map((u, index) => (
            <tr 
              key={`${u.id}-${index}`} 
              onClick={() => setSelectedLeave(u)} 
              style={{ 
                borderBottom: '1px solid #f1f3f5',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <td style={{ padding: '14px 8px', fontWeight: 'bold', color: '#000', width: '25%' }}>
                {u.name.split('@')[0]} {/* Pull structural name context visually */}
              </td>
              
              <td style={{ padding: '14px 8px', color: '#495057', width: '45%' }}>
                <span style={{ fontWeight: '600', color: '#000' }}>{u.department} Dept</span>
                <span style={{ color: '#74788d' }}> — {u.reason}</span>
              </td>
              
              <td style={{ 
                padding: '14px 8px', 
                fontWeight: 'bold', 
                color: getStatusColor(u.status),
                width: '15%' 
              }}>
                {u.status}
              </td>
              
              <td style={{ padding: '14px 8px', color: '#74788d', textAlign: 'right', width: '15%', fontSize: '12px' }}>
                {u.dateSubmitted}
              </td>
            </tr>
          ))}
          
          {reports.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#868e96' }}>
                No active database aggregate leave reports found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;