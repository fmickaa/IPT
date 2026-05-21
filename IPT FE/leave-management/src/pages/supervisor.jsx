import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Supervisor = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [requests, setRequests] = useState([]);

  // Fetch all requests on component mount
  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token'); 
      
      const response = await fetch('http://localhost:3000/api/leave', { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });

      if (!response.ok) {
        console.error("Fetch failed with status:", response.status);
        return;
      }

      const data = await response.json();
      console.log("Data received from backend:", data);

      if (Array.isArray(data)) {
        // Map individual records accurately so the details page has access to dates & types
        const formatted = data.map(item => ({
          id: item._id,
          employeeName: item.employeeId?.fullName || "Unknown",
          department: item.employeeId?.department || "N/A",
          leaveType: item.leaveTypeId?.type || "Leave Request",
          startDate: item.startDate,
          endDate: item.endDate,
          reason: item.reason || "No explanation provided.",
          status: item.status || "Pending"
        }));
        setRequests(formatted);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle the Approve/Reject API Action
  const handleAction = async (id, employeeName, status) => {
  try {
    const token = localStorage.getItem('token');
    
    // Fixed: Route matches your exact Express app.patch definition
    const response = await fetch(`http://localhost:3000/api/leave/${id}/status`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert(`Request for ${employeeName} has been ${status}!`);
      
      // Refresh local list state directly from the DB to show updates
      await fetchRequests();
      setSelected(null);
    } else {
      const errorData = await response.json();
      alert(`Error updating request: ${errorData.message || 'Something went wrong'}`);
    }
  } catch (error) {
    console.error("Error sending update request:", error);
    alert("Could not connect to the backend server.");
  }
};

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>Supervisor<span style={{fontWeight:'300'}}>Portal</span></div>
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/'); }} style={styles.logoutBtn}>Logout</button>
      </header>

      <div style={styles.mainContent}>
        {selected ? (
          <div style={styles.emailContainer}>
            <div style={styles.toolbar}>
              <button onClick={() => setSelected(null)} style={styles.backBtn}>
                <span style={{marginRight: '8px'}}>←</span> Back to Inbox
              </button>
            </div>
            
            <div style={styles.emailBodyCard}>
              <div style={styles.emailSubjectRow}>
                <h2 style={styles.subjectText}>{selected.leaveType} Request</h2>
                <div style={{
                  ...styles.statusTag, 
                  backgroundColor: selected.status === 'Approved' ? '#34a853' : selected.status === 'Rejected' ? '#d93025' : '#f29900'
                }}>
                  {selected.status === 'Pending' ? 'Pending Review' : selected.status}
                </div>
              </div>

              <div style={styles.senderInfo}>
                <div style={styles.avatar}>{selected.employeeName?.[0]?.toUpperCase() || '?'}</div>
                <div>
                  <div style={{fontWeight: 'bold'}}>{selected.employeeName}</div>
                  <div style={{fontSize: '12px', color: '#5f6368'}}>Department: {selected.department}</div>
                </div>
              </div>

              <div style={styles.dateRangeRow}>
                <strong>Period:</strong> {new Date(selected.startDate).toLocaleDateString()} - {new Date(selected.endDate).toLocaleDateString()}
              </div>

              <div style={{...styles.messageContent, marginBottom: '20px'}}>
                <strong>Reason:</strong> "{selected.reason}"
              </div>

              {selected.status === 'Pending' && (
                <div style={styles.actionArea}>
                  <button 
                    onClick={() => handleAction(selected.id, selected.employeeName, 'Approved')} 
                    style={styles.approveBtn}
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(selected.id, selected.employeeName, 'Rejected')} 
                    style={styles.rejectBtn}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.inboxWrapper}>
            <div style={styles.inboxSubHeader}>Inbox — Leave Requests</div>
            {requests.map((r) => (
              <div key={r.id} onClick={() => setSelected(r)} style={styles.emailRow}>
                <div style={styles.senderCol}>{r.employeeName}</div>
                <div style={styles.subjectCol}>
                  <span style={{fontWeight: 'bold'}}>{r.department} Dept</span>
                  <span style={styles.snippet}> — {r.leaveType} Request</span>
                </div>
                <div style={{
                  ...styles.statusCol, 
                  color: r.status === 'Approved' ? '#34a853' : r.status === 'Rejected' ? '#d93025' : '#f29900'
                }}>
                  {r.status}
                </div>
                <div style={styles.dateCol}>Active</div>
              </div>
            ))}
            {requests.length === 0 && (
              <div style={{padding: '40px', textAlign: 'center', color: '#70757a'}}>
                No leave requests found in the inbox.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', fontFamily: 'Segoe UI, Roboto, Arial, sans-serif' },
  header: { padding: '8px 20px', borderBottom: '1px solid #f1f1f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center' },
  logo: { fontSize: '22px', color: '#9E0202', fontWeight: 'bold' },
  logoutBtn: { padding: '6px 16px', borderRadius: '4px', border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontSize: '14px' },
  mainContent: { flex: 1, overflow: 'hidden' },
  inboxWrapper: { height: '100%', overflowY: 'auto' },
  inboxSubHeader: { padding: '10px 20px', fontSize: '12px', fontWeight: 'bold', color: '#70757a', borderBottom: '1px solid #f1f1f1', backgroundColor: '#fafafa' },
  emailRow: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', alignItems: 'center' },
  senderCol: { width: '180px', fontWeight: 'bold', fontSize: '14px' },
  subjectCol: { flex: 1, fontSize: '14px' },
  snippet: { color: '#5f6368', fontWeight: 'normal' },
  statusCol: { width: '120px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' },
  dateCol: { width: '100px', textAlign: 'right', fontSize: '12px', color: '#5f6368' },
  emailContainer: { height: '100%', display: 'flex', flexDirection: 'column' },
  toolbar: { padding: '12px 20px', borderBottom: '1px solid #f1f1f1' },
  backBtn: { background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' },
  emailBodyCard: { padding: '20px 60px' },
  emailSubjectRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  subjectText: { fontSize: '22px', fontWeight: '400' },
  statusTag: { padding: '4px 12px', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold' },
  senderInfo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' },
  avatar: { width: '40px', height: '40px', backgroundColor: '#34a853', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dateRangeRow: { padding: '10px 15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' },
  messageContent: { fontSize: '15px', lineHeight: '1.5' },
  actionArea: { marginTop: '40px', display: 'flex', gap: '12px' },
  approveBtn: { padding: '10px 24px', backgroundColor: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  rejectBtn: { padding: '10px 24px', backgroundColor: '#fff', color: '#d93025', border: '1px solid #d93025', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Supervisor;