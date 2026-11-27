import express from 'express';
import Plant from '../models/Plant.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

const geocodeLocationName = async (locationName) => {
  const fallback = {
    name: 'New Delhi, India',
    lat: 28.6139,
    lng: 77.209,
    source: 'default'
  };
  const trimmed = String(locationName || '').trim();
  if (!trimmed) return fallback;

  const candidates = [trimmed];
  if (trimmed.includes(',')) {
    candidates.push(trimmed.split(',')[0].trim());
  }

  for (const query of candidates) {
    if (!query) continue;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=1&language=en&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        const match = data?.results?.[0];
        if (match && Number.isFinite(match.latitude) && Number.isFinite(match.longitude)) {
          return {
            name: [match.name, match.admin1, match.country].filter(Boolean).join(', '),
            lat: Number(match.latitude),
            lng: Number(match.longitude),
            source: 'open-meteo-geocoding'
          };
        }
      }
    } catch {
      // fall through to next candidate or default
    }
  }

  return { ...fallback, name: trimmed };
};

const buildPlantSpecificWeatherTips = (plants, weather) => {
  const { temperatureC, humidityPct, precipitationMm, windSpeedKmh } = weather;
  const tips = [];

  for (const p of (plants || []).slice(0, 6)) {
    const species = `${p.speciesName || ''} ${p.plantName || ''}`.toLowerCase();
    const label = p.plantName || p.speciesName || 'Plant';
    let tip = '';

    if (species.includes('tulsi') || species.includes('ocimum') || species.includes('basil')) {
      if (temperatureC <= 15) {
        tip = `Protect ${label} from chilly night air (${temperatureC}°C)—shift near a sheltered window or cover overnight.`;
      } else if (precipitationMm > 0.5) {
        tip = `Rainy conditions (${precipitationMm} mm): skip manual watering for ${label} and clear saucer runoff.`;
      } else if (temperatureC >= 32) {
        tip = `Warm day (${temperatureC}°C): water ${label} early morning and pinch flower spikes to keep leaves dense.`;
      } else {
        tip = `Ideal weather for ${label}: give 5–6 hrs sun and water every ${p.wateringIntervalDays || 3} day(s).`;
      }
    } else if (
      species.includes('aloe') ||
      species.includes('snake') ||
      species.includes('sansevieria') ||
      species.includes('cactus') ||
      species.includes('succulent')
    ) {
      if (humidityPct >= 75 || precipitationMm > 0.5) {
        tip = `High moisture (${humidityPct}% RH): hold off watering ${label} and maximize airflow to guard against root rot.`;
      } else if (temperatureC <= 10) {
        tip = `Cold snap (${temperatureC}°C): keep ${label} in a dry indoor spot away from cold glass.`;
      } else {
        tip = `${label} is thriving in ${temperatureC}°C—water sparingly only when soil is completely dry.`;
      }
    } else if (
      species.includes('monstera') ||
      species.includes('pothos') ||
      species.includes('lily') ||
      species.includes('fern') ||
      species.includes('palm')
    ) {
      if (humidityPct <= 40) {
        tip = `Dry air (${humidityPct}% RH): mist ${label} or place near a pebble water tray to prevent crispy tips.`;
      } else if (temperatureC <= 14) {
        tip = `Cool air (${temperatureC}°C): move tropical ${label} away from cold drafts and reduce watering.`;
      } else {
        tip = `Comfortable ${temperatureC}°C & ${humidityPct}% RH for ${label}—keep in bright indirect light.`;
      }
    } else if (
      species.includes('neem') ||
      species.includes('peepal') ||
      species.includes('arjuna') ||
      species.includes('pongamia') ||
      species.includes('ficus')
    ) {
      if (windSpeedKmh >= 25) {
        tip = `Breezy winds (${windSpeedKmh} km/h): check stakes and mulch around ${label} sapling.`;
      } else if (temperatureC >= 34) {
        tip = `High heat (${temperatureC}°C): add a 5 cm dry-leaf mulch ring around ${label} to retain root moisture.`;
      } else {
        tip = `${label} outdoor canopy is steady at ${temperatureC}°C—inspect weekly for fresh shoots.`;
      }
    } else if (p.status === 'Needs Water' || temperatureC >= 31) {
      tip = `${label} (${p.speciesName || 'Plant'}): check soil moisture today as temps hit ${temperatureC}°C.`;
    } else if (precipitationMm > 0.5) {
      tip = `Light/steady rain (${precipitationMm} mm): pause watering for ${label} and check pot drainage.`;
    } else if (temperatureC <= 14) {
      tip = `Cool night ahead (${temperatureC}°C): shield ${label} from chilly breezes and water lightly.`;
    } else {
      tip = `${label} (${p.speciesName || 'Plant'}): balanced ${temperatureC}°C & ${humidityPct}% RH—keep regular ${p.wateringIntervalDays || 3}d schedule.`;
    }

    tips.push({
      plantId: p._id,
      plantName: label,
      speciesName: p.speciesName || '',
      status: p.status || 'Healthy',
      tip
    });
  }

  return tips;
};

const recommendSpeciesForClimate = ({ temperatureC, humidityPct, usAqi }) => {
  const recommendations = [];

  if (usAqi >= 80) {
    recommendations.push(
      'Areca Palm (Dypsis lutescens) — high particulate & VOC bio-filter',
      'Snake Plant (Sansevieria) — resilient low-maintenance O2 producer',
      'Neem Tree (Azadirachta indica) — urban heat & dust mitigator'
    );
  } else if (temperatureC >= 28 && humidityPct < 50) {
    recommendations.push(
      'Aloe Vera — drought-hardy arid climate succulent',
      'Bougainvillea — heat-tolerant flowering canopy',
      'Pongamia pinnata — hardy shade-giving native tree'
    );
  } else if (humidityPct >= 65) {
    recommendations.push(
      'Peace Lily (Spathiphyllum) — thrives in humid microclimates',
      'Boston Fern — lush humidity-loving air purifier',
      'Bamboo Palm — rapid carbon-sequestering foliage'
    );
  } else {
    recommendations.push(
      'Holy Basil (Tulsi) — aromatic pollinator-friendly herb',
      'Ficus benjamina — strong urban canopy builder',
      'Golden Pothos — adaptable rapid-growth air cleaner'
    );
  }

  return recommendations;
};

router.get('/advisor', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Valid lat and lng query parameters are required.' });
    }

    let weather = { temperatureC: 24, humidityPct: 58, windSpeedKmh: 9 };
    let airQuality = { usAqi: 68, pm25: 19.4, pm10: 32.1 };
    let dataSource = 'open-meteo';

    try {
      const [aqiRes, weatherRes] = await Promise.all([
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10`
        ),
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
        )
      ]);

      if (aqiRes.ok) {
        const aqiData = await aqiRes.json();
        if (aqiData?.current) {
          airQuality = {
            usAqi: Number(aqiData.current.us_aqi ?? 55),
            pm25: Number(aqiData.current.pm2_5 ?? 14),
            pm10: Number(aqiData.current.pm10 ?? 24)
          };
        }
      } else {
        dataSource = 'partial-fallback';
      }

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        if (weatherData?.current) {
          weather = {
            temperatureC: Number(weatherData.current.temperature_2m ?? 24),
            humidityPct: Number(weatherData.current.relative_humidity_2m ?? 55),
            windSpeedKmh: Number(weatherData.current.wind_speed_10m ?? 8)
          };
        }
      } else {
        dataSource = 'partial-fallback';
      }
    } catch {
      dataSource = 'offline-fallback';
    }

    const radiusMeters = 2500;
    const nearbyPlants = await Plant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusMeters
        }
      }
    })
      .select('plantName speciesName location')
      .lean();

    const nearbyPlantCount = nearbyPlants.length;
    const isPrioritySpot =
      (airQuality.usAqi >= 150 && nearbyPlantCount < 3) ||
      (airQuality.usAqi >= 220 && nearbyPlantCount < 5);

    let priorityStatus = 'Balanced Green Zone';
    if (airQuality.usAqi >= 180 && nearbyPlantCount <= 1) {
      priorityStatus = 'High Priority Zone';
    } else if (isPrioritySpot) {
      priorityStatus = 'Recommended Zone';
    }

    const recommendedSpecies = recommendSpeciesForClimate({
      temperatureC: weather.temperatureC,
      humidityPct: weather.humidityPct,
      usAqi: airQuality.usAqi
    });

    const advisorySummary = isPrioritySpot
      ? `Only ${nearbyPlantCount} registered plant(s) within 2.5 km and US AQI is ${airQuality.usAqi}. Planting here qualifies for +50 Bonus XP!`
      : `Healthy green density (${nearbyPlantCount} nearby plants within 2.5 km) with US AQI ${airQuality.usAqi}. Great spot to expand biodiversity.`;

    return res.json({
      coordinates: { lat, lng },
      weather,
      airQuality,
      nearbyPlantCount,
      nearbyPlants: nearbyPlants.slice(0, 10),
      radiusMeters,
      priorityStatus,
      isPrioritySpot,
      bonusXpEligible: isPrioritySpot,
      bonusXp: isPrioritySpot ? 50 : 0,
      recommendedSpecies,
      advisorySummary,
      dataSource
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/weather-care', authMiddleware, async (req, res, next) => {
  try {
    const [user, plants] = await Promise.all([
      User.findById(req.userId).select('name location').lean(),
      Plant.find({ userId: req.userId })
        .select('plantName speciesName status wateringIntervalDays')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const requestedLoc =
      (req.query.location && String(req.query.location).trim()) ||
      user?.location ||
      'New Delhi, India';

    const geo = await geocodeLocationName(requestedLoc);

    let weather = {
      temperatureC: 22,
      humidityPct: 54,
      precipitationMm: 0,
      windSpeedKmh: 8,
      weatherCode: 0
    };
    let dataSource = 'open-meteo';

    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`
      );
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        if (wData?.current) {
          weather = {
            temperatureC: Number(wData.current.temperature_2m ?? 22),
            humidityPct: Number(wData.current.relative_humidity_2m ?? 54),
            precipitationMm: Number(wData.current.precipitation ?? 0),
            windSpeedKmh: Number(wData.current.wind_speed_10m ?? 8),
            weatherCode: Number(wData.current.weather_code ?? 0)
          };
        }
      } else {
        dataSource = 'fallback';
      }
    } catch {
      dataSource = 'offline-fallback';
    }

    let weatherHeadline = 'Mild & balanced plant weather';
    let botAlert = `Today in ${geo.name.split(',')[0]}: ${weather.temperatureC}°C & ${weather.humidityPct}% humidity—great conditions for your plants!`;

    if (weather.temperatureC <= 14) {
      weatherHeadline = 'Cool night protection advised';
      botAlert = `Weather alert for ${geo.name.split(',')[0]}: Chilly ${weather.temperatureC}°C! Keep sensitive plants sheltered tonight.`;
    } else if (weather.precipitationMm > 0.5) {
      weatherHeadline = 'Rainfall active — pause outdoor watering';
      botAlert = `Rain check in ${geo.name.split(',')[0]} (${weather.precipitationMm} mm): skip outdoor watering and check pot drainage!`;
    } else if (weather.temperatureC >= 32) {
      weatherHeadline = 'Warm weather — early morning hydration';
      botAlert = `Warm ${weather.temperatureC}°C in ${geo.name.split(',')[0]}! Water early morning and check topsoil moisture.`;
    } else if (weather.humidityPct <= 35) {
      weatherHeadline = 'Dry air — mist foliage or group pots';
      botAlert = `Low humidity (${weather.humidityPct}%) in ${geo.name.split(',')[0]}—mist tropical leaves gently today.`;
    } else if (weather.windSpeedKmh >= 25) {
      weatherHeadline = 'Breezy winds — secure tall pots & saplings';
      botAlert = `Gusty ${weather.windSpeedKmh} km/h winds in ${geo.name.split(',')[0]}—check tall planters and sapling stakes.`;
    }

    const plantCareTips = buildPlantSpecificWeatherTips(plants, weather);
    const generalTips =
      plantCareTips.length === 0
        ? [
            'Register your first plant in My Plants to receive species-specific weather care alerts.',
            weatherHeadline
          ]
        : [];

    return res.json({
      locationName: geo.name,
      coordinates: { lat: geo.lat, lng: geo.lng },
      weather,
      weatherHeadline,
      botAlert,
      plantCareTips,
      generalTips,
      dataSource
    });
  } catch (error) {
    return next(error);
  }
});

export default router;