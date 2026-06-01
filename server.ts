import express from "express";
import path from "path";
import axios from "axios";
import { createServer as createViteServer } from "vite";

// In-memory storage for livestock data
let livestockData = [
  { 
    id: 'S001', name: 'Sapi Bali Alpha', type: 'cow', 
    lat: -8.2917, lng: 117.9708, alt: 350, health: 'good', battery: 85, 
    lastUpdate: new Date().toISOString(), heartRate: [65, 68, 72, 69, 75, 78, 74],
    speed: 2.4,
    heartRateSensor: {
      currentRate: 74,
      lastReadingTime: new Date().toISOString()
    },
    temperatureSensor: {
      currentTemp: 38.6,
      lastReadingTime: new Date().toISOString()
    },
    loraQuality: {
      rssi: -78,
      snr: 9.3,
      spreadingFactor: 7,
      frequency: 921.3,
      gatewayName: "GP Tambora Alpha",
      packetLossRate: 0.5
    }
  },
  { 
    id: 'K002', name: 'Kambing Etawa Beta', type: 'goat', 
    lat: -8.2950, lng: 117.9750, alt: 362, health: 'excellent', battery: 92, 
    lastUpdate: new Date().toISOString(), heartRate: [82, 85, 88, 86, 90, 89, 87],
    speed: 1.2,
    heartRateSensor: {
      currentRate: 87,
      lastReadingTime: new Date().toISOString()
    },
    temperatureSensor: {
      currentTemp: 39.1,
      lastReadingTime: new Date().toISOString()
    },
    loraQuality: {
      rssi: -94,
      snr: 5.2,
      spreadingFactor: 8,
      frequency: 921.5,
      gatewayName: "GP Savana Barat",
      packetLossRate: 1.1
    }
  },
  { 
    id: 'H003', name: 'Kuda Sumbawa Gamma', type: 'horse', 
    lat: -8.2850, lng: 117.9650, alt: 345, health: 'fair', battery: 42, 
    lastUpdate: new Date().toISOString(), heartRate: [45, 48, 52, 50, 55, 58, 54],
    speed: 8.5,
    heartRateSensor: {
      currentRate: 54,
      lastReadingTime: new Date().toISOString()
    },
    temperatureSensor: {
      currentTemp: 38.2,
      lastReadingTime: new Date().toISOString()
    },
    loraQuality: {
      rssi: -108,
      snr: -2.4,
      spreadingFactor: 11,
      frequency: 921.1,
      gatewayName: "GP Tambora Alpha",
      packetLossRate: 5.8
    }
  },
  { 
    id: 'S004', name: 'Sapi Bali Delta', type: 'cow', 
    lat: -8.3000, lng: 117.9600, alt: 330, health: 'poor', battery: 65, 
    lastUpdate: new Date(Date.now() - 3600000).toISOString(), heartRate: [55, 58, 52, 48, 50, 45, 42],
    speed: 0.5,
    heartRateSensor: {
      currentRate: 42,
      lastReadingTime: new Date(Date.now() - 3600000).toISOString()
    },
    temperatureSensor: {
      currentTemp: 39.8,
      lastReadingTime: new Date().toISOString()
    },
    loraQuality: {
      rssi: -115,
      snr: -8.1,
      spreadingFactor: 12,
      frequency: 921.7,
      gatewayName: "GP Savana Barat",
      packetLossRate: 14.2
    }
  },
];

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Live API for livestock data with simulated variations
  app.get("/api/livestock/live", (req, res) => {
    // Add some random "live" jitter to the stored data
    const liveData = livestockData.map(animal => {
      const nextHeartRateValue = Math.round(animal.heartRate[animal.heartRate.length-1] + (Math.random() - 0.5) * 3);
      
      // Get base temperature or generate default base
      const baseTemp = (animal.temperatureSensor && animal.temperatureSensor.currentTemp) || 38.6;
      const nextTempValue = parseFloat(Math.max(37.5, Math.min(41.0, baseTemp + (Math.random() - 0.5) * 0.15)).toFixed(1));

      // Get base LoRa parameters or generate default base
      const baseLora = animal.loraQuality || {
        rssi: -90,
        snr: 6.0,
        spreadingFactor: 9,
        frequency: 921.3,
        gatewayName: "GP Tambora Alpha",
        packetLossRate: 1.5
      };
      
      const nextRssi = Math.max(-125, Math.min(-60, baseLora.rssi + Math.round((Math.random() - 0.5) * 4)));
      const nextSnr = parseFloat(Math.max(-15.0, Math.min(15.0, baseLora.snr + (Math.random() - 0.5) * 0.8)).toFixed(1));
      const nextLoss = parseFloat(Math.max(0.0, Math.min(100.0, baseLora.packetLossRate + (Math.random() - 0.5) * 0.2)).toFixed(2));

      return {
        ...animal,
        lat: animal.lat + (Math.random() - 0.5) * 0.0002,
        lng: animal.lng + (Math.random() - 0.5) * 0.0002,
        alt: Math.round(animal.alt + (Math.random() - 0.5) * 2),
        battery: Math.max(0, Math.min(100, animal.battery + (Math.random() - 0.5) * 0.5)),
        speed: Math.max(0, parseFloat((animal.speed + (Math.random() - 0.5) * 0.5).toFixed(1))),
        heartRate: [...animal.heartRate.slice(1), nextHeartRateValue],
        lastUpdate: new Date().toISOString(),
        heartRateSensor: {
          currentRate: nextHeartRateValue,
          lastReadingTime: new Date().toISOString()
        },
        temperatureSensor: {
          currentTemp: nextTempValue,
          lastReadingTime: new Date().toISOString()
        },
        loraQuality: {
          ...baseLora,
          rssi: nextRssi,
          snr: nextSnr,
          packetLossRate: nextLoss
        }
      };
    });

    res.json(liveData);
  });

  // Create new livestock
  app.post("/api/livestock", (req, res) => {
    try {
      const { name, type, lat, lng, alt, health, battery, speed } = req.body;
      
      const newHeartRate = Array.from({ length: 10 }, () => Math.floor(Math.random() * (90 - 64 + 1) + 64));
      const spreadingFactor = [7, 8, 9, 10, 11, 12][Math.floor(Math.random() * 6)];
      const randomFreq = [921.1, 921.3, 921.5, 921.7][Math.floor(Math.random() * 4)];
      const randomGateway = ["GP Tambora Alpha", "GP Savana Barat"][Math.floor(Math.random() * 2)];

      const newAnimal = {
        id: `ID-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        name: name || "Ternak Baru",
        type: type || "cow",
        lat: Number(lat) || -8.2917,
        lng: Number(lng) || 117.9708,
        alt: Number(alt) || 350,
        health: health || "good",
        battery: Number(battery) || 100,
        speed: Number(speed) || 0,
        lastUpdate: new Date().toISOString(),
        heartRate: newHeartRate,
        heartRateSensor: {
          currentRate: newHeartRate[newHeartRate.length - 1],
          lastReadingTime: new Date().toISOString()
        },
        temperatureSensor: {
          currentTemp: parseFloat((38.2 + Math.random() * 1.2).toFixed(1)),
          lastReadingTime: new Date().toISOString()
        },
        loraQuality: {
          rssi: -90 + Math.round((Math.random() - 0.5) * 20),
          snr: parseFloat((5.0 + (Math.random() - 0.5) * 4).toFixed(1)),
          spreadingFactor: spreadingFactor,
          frequency: randomFreq,
          gatewayName: randomGateway,
          packetLossRate: parseFloat((Math.random() * 2).toFixed(2))
        }
      };
      
      livestockData.push(newAnimal);
      console.log('Added new animal:', newAnimal.id);
      res.status(201).json(newAnimal);
    } catch (err) {
      console.error('Error adding animal:', err);
      res.status(500).json({ error: 'Gagal menambah data' });
    }
  });

  // Update livestock
  app.put("/api/livestock/:id", (req, res) => {
    try {
      const { id } = req.params;
      const index = livestockData.findIndex(animal => animal.id === id);
      if (index !== -1) {
        const updates = req.body;
        
        // Convert numbers clearly
        if (updates.lat) updates.lat = Number(updates.lat);
        if (updates.lng) updates.lng = Number(updates.lng);
        if (updates.alt) updates.alt = Number(updates.alt);
        if (updates.battery) updates.battery = Number(updates.battery);
        if (updates.speed) updates.speed = Number(updates.speed);

        livestockData[index] = {
          ...livestockData[index],
          ...updates,
          id: id, // Ensure ID doesn't change
          lastUpdate: new Date().toISOString()
        };
        res.json(livestockData[index]);
      } else {
        res.status(404).json({ message: "Hewan tidak ditemukan" });
      }
    } catch (err) {
      console.error('Error updating animal:', err);
      res.status(500).json({ error: 'Gagal memperbarui data' });
    }
  });

  // Delete livestock
  app.delete("/api/livestock/:id", (req, res) => {
    const { id } = req.params;
    const initialLength = livestockData.length;
    livestockData = livestockData.filter(animal => animal.id !== id);
    
    if (livestockData.length < initialLength) {
      res.status(200).json({ message: "Berhasil dihapus" });
    } else {
      res.status(404).json({ message: "Hewan tidak ditemukan" });
    }
  });

  // Weather Proxy API
  app.get("/api/weather", async (req, res) => {
    try {
      const lat = req.query.lat || -8.2917;
      const lon = req.query.lon || 117.9708;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;
      
      const response = await axios.get(url);
      res.json(response.data);
    } catch (err) {
      console.error('Weather fetch error:', err);
      res.status(500).json({ error: 'Gagal mengambil data cuaca' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
