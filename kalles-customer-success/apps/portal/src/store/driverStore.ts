import { create } from 'zustand';
import { API_URL } from '../config';

interface DriverState {
  driverId: string;
  status: 'OFF_DUTY' | 'PRE_TRIP_REQUIRED' | 'READY_FOR_DEPARTURE' | 'IN_TRANSIT';
  schedule: any | null;
  fetchState: () => Promise<void>;
  clockIn: () => Promise<void>;
  submitChecklist: (passed: boolean, photoData: string) => Promise<void>;
  startTour: (tourId: string) => Promise<void>;
}

export const useDriverStore = create<DriverState>((set, get) => ({
  driverId: 'DRIVER-007',
  status: 'OFF_DUTY',
  schedule: null,

  fetchState: async () => {
    const { driverId } = get();
    try {
      const res = await fetch(`${API_URL}/driver/${driverId}/state`);
      const data = await res.json();
      set({ status: data.state.status, schedule: data.schedule });
    } catch (e) {
      console.error('Failed to fetch state', e);
    }
  },

  clockIn: async () => {
    const { driverId } = get();
    await fetch(`${API_URL}/driver/${driverId}/clock-in`, { method: 'POST' });
    await get().fetchState();
  },

  submitChecklist: async (passed, photoData) => {
    const { driverId, schedule } = get();
    const vehicleId = schedule?.tours[0]?.vehicleId;
    
    const res = await fetch(`${API_URL}/vehicle/${vehicleId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, passed, photoEvidence: photoData })
    });

    if (!res.ok) {
      alert('Säkerhetskontroll underkänd. Fordon avställt. Kontakta trafikledning.');
      return;
    }
    await get().fetchState();
  },

  startTour: async (tourId) => {
    const { driverId } = get();
    await fetch(`${API_URL}/tour/${tourId}/start`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId })
    });
    await get().fetchState();
  }
}));
