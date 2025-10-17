import { useState, useEffect } from 'react';
import { stationsAPI } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { BatteryCharging, Plus, Trash2, Power } from 'lucide-react';
import StationModal from '../components/StationModal';

export default function Stations() {
  const [stations, setStations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data } = useWebSocket();

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (data?.type === 'station.updated' || data?.type === 'station.registered') {
      loadStations();
    }
  }, [data]);

  const loadStations = async () => {
    try {
      const response = await stationsAPI.getAll();
      setStations(response.data);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const handleAddStation = async (stationData) => {
    setLoading(true);
    try {
      await stationsAPI.create(stationData);
      setShowModal(false);
      await loadStations();
    } catch (error) {
      console.error('Error adding station:', error);
      alert(`Failed to add station: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (stationId, stationName) => {
    if (!confirm(`Are you sure you want to delete "${stationName}"?`)) {
      return;
    }

    try {
      await stationsAPI.delete(stationId);
      await loadStations();
    } catch (error) {
      console.error('Error deleting station:', error);
      alert(`Failed to delete station: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      charging: 'badge-success',
      ready: 'badge-info',
      offline: 'badge',
      error: 'badge-danger'
    };
    return badges[status] || 'badge';
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 className="page-title">Charging Stations</h1>
          <p className="page-description">
            Manage and monitor your EV charging stations
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Station
        </button>
      </div>

      {stations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <BatteryCharging size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--spacing-md)' }} />
          <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>No Stations Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
            Get started by adding your first charging station
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Add Station
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {stations.map(station => (
            <div key={station.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{station.name}</h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {station.zone} • {station.protocol?.toUpperCase()}
                  </div>
                </div>
                <div className={`badge ${getStatusBadge(station.status)}`}>
                  {station.status}
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Power</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {(station.currentPower || 0).toFixed(1)} kW
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Power</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {station.maxPower} kW
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Session Energy</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {(station.sessionEnergy || 0).toFixed(2)} kWh
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {station.priority}/10
                    </div>
                  </div>
                </div>

                {station.user && (
                  <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current User</div>
                    <div style={{ fontWeight: 600 }}>{station.user.name}</div>
                    {station.user.rfidCard && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Card: {station.user.rfidCard}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }}>
                    <Power size={16} />
                    Details
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteStation(station.id, station.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Station Modal */}
      <StationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleAddStation}
      />
    </div>
  );
}
