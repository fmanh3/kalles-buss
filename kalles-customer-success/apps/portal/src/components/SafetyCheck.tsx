import { useEffect, useState } from 'react';
import { useDriverStore } from '../store/driverStore';
import { AlertTriangle, Camera } from 'lucide-react';
import { API_URL } from '../config';
import './SafetyCheck.css';

export function SafetyCheck({ onComplete }: { onComplete: () => void }) {
  const { schedule, submitChecklist } = useDriverStore();
  const [checklist, setChecklist] = useState<any[]>([]);
  const [photoData, setPhotoData] = useState<string>('');

  const vehicleId = schedule?.tours[0]?.vehicleId;

  useEffect(() => {
    // Fetch the dynamic checklist from BFF
    fetch(`${API_URL}/vehicle/${vehicleId}/checklist`)
      .then(res => res.json())
      .then(data => setChecklist(data));
  }, [vehicleId]);

  const handlePass = () => {
    if (!photoData) {
      alert("Vänligen ta ett foto av registreringsskylten först.");
      return;
    }
    submitChecklist(true, photoData);
    onComplete();
  };

  const handleFail = () => {
    submitChecklist(false, photoData || 'NO_PHOTO');
    onComplete();
  };

  return (
    <div className="safety-check-container">
      <h2>Säkerhetskontroll</h2>
      <p className="subtitle">Fordon: <strong>{vehicleId}</strong></p>
      
      <div className="checklist">
        {checklist.map(item => (
          <div key={item.id} className="checklist-item">
            <span className="item-text">{item.text}</span>
            {item.isCritical && <AlertTriangle size={16} color="red" />}
          </div>
        ))}
      </div>

      <div className="photo-section">
        <button 
          className={`camera-btn ${photoData ? 'success' : ''}`}
          onClick={() => setPhotoData('mock_base64_image_data')}
        >
          <Camera size={24} />
          {photoData ? ' Reg-skylt fotad' : ' Fota Reg-skylt'}
        </button>
      </div>

      <div className="actions">
        <button className="btn-fail" onClick={handleFail}>Underkänn Fordon</button>
        <button className="btn-pass" onClick={handlePass}>Godkänn & Klar</button>
      </div>
    </div>
  );
}
