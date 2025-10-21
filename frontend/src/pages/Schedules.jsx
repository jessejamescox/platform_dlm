import { useState, useEffect } from 'react';
import { schedulesAPI } from '../api/client';
import Icons from '../components/Icons';

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await schedulesAPI.getAll();
      setSchedules(response.data);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 className="page-title">Schedules</h1>
          <p className="page-description">
            Manage time-based charging schedules and automation
          </p>
        </div>
        <button className="btn btn-primary">
          <Icons.Plus size={18} />
          Create Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <Icons.Calendar size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--spacing-md)' }} />
          <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>No Schedules Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
            Create automated schedules for optimal charging management
          </p>
          <button className="btn btn-primary">
            <Icons.Plus size={18} />
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {schedules.map(schedule => (
            <div key={schedule.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{schedule.name}</h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {schedule.type}
                  </div>
                </div>
                <div className={`badge ${schedule.enabled ? 'badge-success' : 'badge'}`}>
                  {schedule.enabled ? 'Active' : 'Disabled'}
                </div>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Action</div>
                  <div style={{ fontWeight: 600 }}>{schedule.action}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Run</div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Run Count</div>
                    <div style={{ fontSize: '0.875rem' }}>{schedule.runCount}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }}>
                    <Icons.Clock size={16} />
                    Edit
                  </button>
                  <button className="btn btn-danger">
                    <Icons.Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
