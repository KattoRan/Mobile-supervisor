import axios from 'axios';

type Device = {
  name: string;
  phoneNumber: string;
  lat: number;
  lng: number;
};

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 1000);
const STEP_METERS = Number(process.env.STEP_METERS ?? 12);

const DEVICES: Device[] = [
  {
    phoneNumber: '0987000001',
    name: 'device-01',
    lat: 10.776889,
    lng: 106.700806,
  },
  {
    phoneNumber: '0987000002',
    name: 'device-02',
    lat: 10.776889,
    lng: 106.700806,
  },
];

function nextPos(lat: number, lng: number) {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const dir = Math.random() * 2 * Math.PI;
  const dx = STEP_METERS * Math.cos(dir);
  const dy = STEP_METERS * Math.sin(dir);
  return { lat: lat + dy / metersPerDegLat, lng: lng + dx / metersPerDegLng };
}

async function tick(): Promise<void> {
  const nowIso = new Date().toISOString();

  await Promise.all(
    DEVICES.map(async (d) => {
      const np = nextPos(d.lat, d.lng);
      d.lat = np.lat;
      d.lng = np.lng;

      const body = {
        phoneNumber: d.phoneNumber,
        latitude: d.lat,
        longitude: d.lng,
        isoTimestamp: nowIso,
      };

      try {
        await axios.post(`${API_BASE}/ingest/position`, body, {
          timeout: 5000,
        });
        console.log(
          `[OK] ${d.name} -> ${d.lat.toFixed(6)}, ${d.lng.toFixed(6)}`,
        );
      } catch (e: any) {
        const status =
          e?.response?.status ?? e?.code ?? e?.message ?? 'unknown';
        console.error(`[ERR] ${d.name} ${status}`);
      }
    }),
  );
}

console.log(`Simulator sender to ${API_BASE} every ${INTERVAL_MS}ms`);
const timer = setInterval(() => {
  void tick();
}, INTERVAL_MS);

// Graceful stop (Ctrl+C)
process.on('SIGINT', () => {
  clearInterval(timer);
  console.log('Stopped.');
  process.exit(0);
});
