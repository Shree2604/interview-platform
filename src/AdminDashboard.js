import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  UserCheck,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import './AdminDashboard.css';

function AdminDashboard({ onBack }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    interviewed: 0
  });

  // Fetch registrations from API
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/registrations');
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      const data = await response.json();
      setRegistrations(data.data);
      calculateStats(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      processing: data.filter(r => r.status === 'processing').length,
      completed: data.filter(r => r.status === 'completed').length,
      interviewed: data.filter(r => r.status === 'interviewed').length
    };
    setStats(stats);
  };

  // Update registration status
  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/registrations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setRegistrations(prev => 
        prev.map(reg => 
          reg._id === id ? { ...reg, status: newStatus } : reg
        )
      );
      
      // Recalculate stats
      const updatedRegistrations = registrations.map(reg => 
        reg._id === id ? { ...reg, status: newStatus } : reg
      );
      calculateStats(updatedRegistrations);

    } catch (err) {
      setError(err.message);
    }
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = 
      registration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.registrationId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || registration.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'orange', icon: Clock, text: 'Pending' },
      processing: { color: 'blue', icon: RefreshCw, text: 'Processing' },
      in_progress: { color: 'blue', icon: RefreshCw, text: 'In Progress' },
      completed: { color: 'green', icon: CheckCircle, text: 'Completed' },
      interviewed: { color: 'purple', icon: UserCheck, text: 'Interviewed' }
    };

    const config = statusConfig[status] || { color: 'blue', icon: RefreshCw, text: (status || 'Unknown').toString().replace(/_/g, ' ') };
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.color}`}>
        <Icon size={14} />
        {config.text}
      </span>
    );
  };

  // Export data to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Registration ID', 'Status', 'Submitted At', 'Summary'];
    const csvData = filteredRegistrations.map(reg => [
      reg.name,
      reg.email,
      reg.registrationId,
      reg.status,
      new Date(reg.submittedAt).toLocaleDateString(),
      reg.resumeData?.summary || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw className="loading-icon animate-spin" />
        <p>Loading registrations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <AlertCircle className="error-icon" />
        <p>Error: {error}</p>
        <button onClick={fetchRegistrations} className="retry-button">
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="header-left">
          <h1 className="admin-title">
            <Users className="admin-icon" />
            Admin Dashboard
          </h1>
          <p className="admin-subtitle">Manage Interview Registrations</p>
        </div>
        <div className="header-right">
          <button onClick={fetchRegistrations} className="refresh-button">
            <RefreshCw size={20} />
            Refresh
          </button>
          <button onClick={exportToCSV} className="export-button">
            <Download size={20} />
            Export CSV
          </button>
          <button onClick={onBack} className="logout-button">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Registrations</p>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <h3>{stats.pending}</h3>
            <p>Pending Review</p>
          </div>
        </div>
        <div className="stat-card processing">
          <div className="stat-icon">
            <RefreshCw />
          </div>
          <div className="stat-content">
            <h3>{stats.processing}</h3>
            <p>In Processing</p>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <h3>{stats.completed}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card interviewed">
          <div className="stat-icon">
            <UserCheck />
          </div>
          <div className="stat-content">
            <h3>{stats.interviewed}</h3>
            <p>Interviewed</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or registration ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-box">
          <Filter className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="interviewed">Interviewed</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="table-container">
        <table className="registrations-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Registration ID</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.map((registration) => (
              <tr key={registration._id} className="registration-row">
                <td className="name-cell">
                  <div className="name-info">
                    <strong>{registration.name}</strong>
                  </div>
                </td>
                <td className="email-cell">
                  <div className="email-info">
                    <Mail size={14} />
                    {registration.email}
                  </div>
                </td>
                <td className="id-cell">
                  <code>{registration.registrationId}</code>
                </td>
                <td className="status-cell">
                  {getStatusBadge(registration.status)}
                </td>
                <td className="date-cell">
                  <div className="date-info">
                    <Calendar size={14} />
                    {new Date(registration.submittedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button
                      onClick={() => {
                        setSelectedRegistration(registration);
                        setShowDetails(true);
                      }}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <select
                      value={registration.status}
                      onChange={(e) => updateStatus(registration._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRegistrations.length === 0 && (
          <div className="no-data">
            <Users className="no-data-icon" />
            <p>No registrations found</p>
          </div>
        )}
      </div>

      {/* Registration Details Modal */}
      {showDetails && selectedRegistration && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registration Details</h2>
              <button 
                onClick={() => setShowDetails(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Personal Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedRegistration.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedRegistration.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Registration ID:</label>
                    <span>{selectedRegistration.registrationId}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    {getStatusBadge(selectedRegistration.status)}
                  </div>
                  <div className="detail-item">
                    <label>Submitted:</label>
                    <span>{new Date(selectedRegistration.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Resume Analysis</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <label>Summary:</label>
                    <span>{selectedRegistration.resumeData?.summary || 'Not available'}</span>
                  </div>
                </div>
              </div>

              {/* Interview Q&A Section */}
              <div className="detail-section">
                <h3>Interview Q&A</h3>
                <div className="detail-grid">
                  {(selectedRegistration.interviewData?.questions || []).length === 0 ? (
                    <div className="detail-item full-width">
                      <span>No interview questions recorded yet.</span>
                    </div>
                  ) : (
                    selectedRegistration.interviewData?.questions?.map((q, idx) => (
                      <div key={idx} className="detail-item full-width">
                        <label>Question {idx + 1}:</label>
                        <div style={{ marginBottom: '0.35rem' }}>{q?.question || '—'}</div>
                        <label>Answer:</label>
                        <div>{q?.answer ? q.answer : 'Not answered'}</div>
                      </div>
                    ))
                  )}
                  <div className="detail-item">
                    <label>Interview Started:</label>
                    <span>{selectedRegistration.interviewData?.startedAt ? new Date(selectedRegistration.interviewData.startedAt).toLocaleString() : '—'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Interview Completed:</label>
                    <span>{selectedRegistration.interviewData?.completedAt ? new Date(selectedRegistration.interviewData.completedAt).toLocaleString() : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowDetails(false)}
                className="close-modal-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard; 