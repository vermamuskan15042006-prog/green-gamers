import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  CheckSquare,
  CloudRain,
  Droplets,
  Edit3,
  GraduationCap,
  Layers,
  Leaf,
  Lock,
  LogOut,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Thermometer,
  Trash2,
  TreePine,
  TrendingUp,
  Trophy,
  Unlock,
  UserCheck,
  Users,
  Wind,
  X
} from 'lucide-react';
import api, { clearToken, getToken, setToken } from './services/api.js';
import { analyzePlantCanopy } from './utils/canvasGrowth.js';

const DEFAULT_COORDS = { lat: 28.6139, lng: 77.209 };

const STATUS_BADGE_STYLES = {
  Healthy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Thriving: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  'Needs Water': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'Needs Attention': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Dormant: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
};

const createCustomPinIcon = (color = '#10b981', label = '') =>
  L.divIcon({
    className: 'gg-map-pin',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${color};border:3px solid #ecfdf5;box-shadow:0 4px 12px rgba(0,0,0,0.45);color:#022c22;font-weight:700;font-size:11px;">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14]
  });

const SELECTED_PIN_ICON = createCustomPinIcon('#34d399', '★');
const NEARBY_PLANT_ICON = createCustomPinIcon('#fbbf24', '🌿');

function MapClickHandler({ onSelectCoords }) {
  useMapEvents({
    click(event) {
      onSelectCoords({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6))
      });
    }
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
}

function getBotanicalStage(level = 1) {
  if (level >= 5) {
    return { key: 'tree', label: 'Mighty Tree', subtitle: 'Lv 5+' };
  }
  if (level >= 3) {
    return { key: 'bloom', label: 'Blooming Plant', subtitle: 'Lv 3–4' };
  }
  if (level === 2) {
    return { key: 'sprout', label: 'Sprout', subtitle: 'Lv 2' };
  }
  return { key: 'seed', label: 'Seed', subtitle: 'Lv 1' };
}

function BotanicalStageGraphic({ level = 1, compact = false }) {
  const stage = getBotanicalStage(level);
  const sizeClass = compact ? 'w-11 h-11' : 'w-14 h-14';

  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-400/30 shadow-inner">
      <div
        className={`${sizeClass} rounded-xl bg-slate-950/70 border border-emerald-500/25 flex items-center justify-center shrink-0`}
        title={`Botanical Stage: ${stage.label} (${stage.subtitle})`}
      >
        {stage.key === 'seed' && (
          <svg viewBox="0 0 64 64" className="w-9 h-9" aria-label="Seed Stage">
            <ellipse cx="32" cy="49" rx="20" ry="6" fill="#451a03" opacity="0.85" />
            <path d="M16 49 Q32 41 48 49" fill="#78350f" />
            <path
              d="M32 24 C25 31 24 41 32 45 C40 41 39 31 32 24 Z"
              fill="#fbbf24"
              stroke="#34d399"
              strokeWidth="2"
            />
            <path d="M32 24 C32 19 35 16 38 15" stroke="#6ee7b7" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </svg>
        )}
        {stage.key === 'sprout' && (
          <svg viewBox="0 0 64 64" className="w-9 h-9" aria-label="Sprout Stage">
            <ellipse cx="32" cy="51" rx="20" ry="5.5" fill="#78350f" />
            <path d="M32 50 L32 26" stroke="#34d399" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M32 32 C23 30 18 23 20 18 C27 18 32 24 32 32 Z" fill="#10b981" />
            <path d="M32 28 C41 26 46 19 44 14 C37 14 32 20 32 28 Z" fill="#6ee7b7" />
          </svg>
        )}
        {stage.key === 'bloom' && (
          <svg viewBox="0 0 64 64" className="w-9 h-9" aria-label="Blooming Plant Stage">
            <ellipse cx="32" cy="52" rx="20" ry="5" fill="#78350f" />
            <path d="M32 51 L32 24" stroke="#10b981" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M32 40 C21 39 15 33 17 27 C24 27 30 33 32 40 Z" fill="#059669" />
            <path d="M32 37 C43 36 49 30 47 24 C40 24 34 30 32 37 Z" fill="#34d399" />
            <circle cx="32" cy="18" r="5" fill="#fbbf24" />
            <circle cx="25" cy="17" r="4" fill="#f472b6" opacity="0.9" />
            <circle cx="39" cy="17" r="4" fill="#f472b6" opacity="0.9" />
            <circle cx="32" cy="11" r="4" fill="#f472b6" opacity="0.9" />
            <circle cx="32" cy="18" r="3" fill="#fde047" />
          </svg>
        )}
        {stage.key === 'tree' && (
          <svg viewBox="0 0 64 64" className="w-9 h-9" aria-label="Mighty Tree Stage">
            <ellipse cx="32" cy="54" rx="20" ry="4.5" fill="#78350f" />
            <path d="M28 53 L29 33 L35 33 L36 53 Z" fill="#b45309" />
            <circle cx="22" cy="29" r="10" fill="#059669" />
            <circle cx="42" cy="29" r="10" fill="#10b981" />
            <circle cx="32" cy="19" r="12" fill="#34d399" />
            <circle cx="32" cy="27" r="9" fill="#6ee7b7" opacity="0.55" />
          </svg>
        )}
      </div>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
          Stage • {stage.subtitle}
        </p>
        <p className="text-xs font-bold text-white">{stage.label}</p>
      </div>
    </div>
  );
}

const ROBOT_CARE_TIPS = [
  'Tip: Check soil 3 cm deep before watering—roots love air pockets as much as moisture!',
  'Tip: Wipe dusty leaves with a damp cloth so photosynthesis stays at peak efficiency.',
  'Tip: Morning sunlight boosts compact foliage growth without scorching tender tips.',
  'Tip: Log a Canvas growth photo every week to watch your green pixel density climb!',
  'Tip: Planting in an advised Priority Zone unlocks +50 Bonus XP for your Eco profile.'
];

function getTimeGreeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

function LivePlantRobotCard({
  user,
  summary,
  toast,
  isNgo,
  weatherCare,
  onQuickCareClick
}) {
  const [hour, setHour] = useState(() => new Date().getHours());
  const [manualMoodIdx, setManualMoodIdx] = useState(null);
  const [tipIdx, setTipIdx] = useState(0);
  const [excitedEvent, setExcitedEvent] = useState(null);
  const prevXpRef = useRef(user?.xp ?? 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentXp = user?.xp ?? 0;
    if (toast && (toast.xp > 0 || /completed|registered|scanned|unlocked|posted|joined|launched/i.test(toast.message || ''))) {
      setExcitedEvent({
        message: toast.xp > 0 ? `Woohoo! +${toast.xp} XP! ${toast.message}` : toast.message,
        id: toast.id
      });
      setManualMoodIdx(null);
    } else if (currentXp > prevXpRef.current) {
      const gained = currentXp - prevXpRef.current;
      setExcitedEvent({
        message: `Level up energy! +${gained} XP added to your Eco Hub!`,
        id: Date.now()
      });
      setManualMoodIdx(null);
    }
    prevXpRef.current = currentXp;
  }, [toast, user?.xp]);

  useEffect(() => {
    if (!excitedEvent) return undefined;
    const timer = setTimeout(() => setExcitedEvent(null), 6500);
    return () => clearTimeout(timer);
  }, [excitedEvent]);

  const pendingCount = summary?.pendingRemindersCount || 0;
  const isNight = hour >= 21 || hour < 5;
  const isMorning = hour >= 5 && hour < 12;
  const timeGreeting = getTimeGreeting(hour);
  const displayName = user?.name?.trim() || 'Eco Ranger';

  const moodOrder = ['happy', 'excited', 'morning', 'thirsty', 'sleeping'];

  let autoMood = 'happy';
  if (excitedEvent) {
    autoMood = 'excited';
  } else if (pendingCount > 0 && !isNight) {
    autoMood = 'thirsty';
  } else if (isNight) {
    autoMood = 'sleeping';
  } else if (isMorning) {
    autoMood = 'morning';
  }

  const activeMood = manualMoodIdx !== null ? moodOrder[manualMoodIdx] : autoMood;

  const weatherWhisper = weatherCare?.botAlert ? ` ${weatherCare.botAlert}` : '';

  const moodMeta = {
    sleeping: {
      badge: 'Night Rest',
      dotColor: 'bg-indigo-400',
      screenGlow: 'border-indigo-400/35 shadow-indigo-500/10',
      title: 'Sleepy Sprout-Bot',
      speech:
        pendingCount > 0
          ? `${timeGreeting}, ${displayName}! Resting under the stars—${pendingCount} care task${pendingCount > 1 ? 's' : ''} queued for tomorrow.${weatherWhisper}`
          : `${timeGreeting}, ${displayName}! Photosynthesis is resting for tonight.${weatherWhisper}`
    },
    morning: {
      badge: 'Morning Greet',
      dotColor: 'bg-amber-400',
      screenGlow: 'border-amber-400/35 shadow-amber-500/10',
      title: 'Sunny Morning Sprout-Bot',
      speech: `${timeGreeting}, ${displayName}! Fresh sunlight is ready—let's check your plants.${weatherWhisper}`
    },
    excited: {
      badge: 'Cheering!',
      dotColor: 'bg-emerald-400',
      screenGlow: 'border-emerald-400/50 shadow-emerald-500/20',
      title: 'Hyped Sprout-Bot',
      speech:
        excitedEvent?.message ||
        (isNgo
          ? `Way to go, ${displayName}! Your plantation drive impact is growing fast!`
          : `Awesome eco care, ${displayName}! Your canopy & XP streak are glowing!`)
    },
    thirsty: {
      badge: 'Care Alert',
      dotColor: 'bg-sky-400',
      screenGlow: 'border-sky-400/40 shadow-sky-500/15',
      title: 'Thirsty Sprout-Bot',
      speech: `${timeGreeting}, ${displayName}! ${pendingCount} care reminder${pendingCount === 1 ? ' is' : 's are'} waiting—tap "Done +20" to hydrate!${weatherWhisper}`
    },
    happy: {
      badge: 'Active • Online',
      dotColor: 'bg-emerald-400',
      screenGlow: 'border-emerald-400/35 shadow-emerald-500/10',
      title: 'Sprout-Bot Companion',
      speech: `${timeGreeting}, ${displayName}! ${weatherCare?.botAlert || ROBOT_CARE_TIPS[tipIdx]}`
    }
  }[activeMood];

  const handleRobotClick = () => {
    setTipIdx((prev) => (prev + 1) % ROBOT_CARE_TIPS.length);
    setManualMoodIdx((prev) => (prev === null ? 0 : (prev + 1) % moodOrder.length));
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/85 border border-emerald-500/25 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Interactive Smart Planter-Bot OLED Face */}
        <button
          type="button"
          onClick={handleRobotClick}
          title="Click Sprout-Bot to cycle mood & care tips"
          className={`group relative w-28 h-24 rounded-2xl bg-slate-950 border-2 ${moodMeta.screenGlow} shadow-xl flex items-center justify-center shrink-0 transition transform hover:scale-[1.03] active:scale-95 focus:outline-none`}
        >
          {/* Top live status LED */}
          <span
            className={`absolute top-2 left-2.5 w-2 h-2 rounded-full ${moodMeta.dotColor} animate-pulse`}
          />
          <span className="absolute top-1.5 right-2.5 text-[9px] font-mono text-slate-500 group-hover:text-emerald-300 transition">
            BOT
          </span>

          {/* Floating Zzz for sleeping state */}
          {activeMood === 'sleeping' && (
            <span className="absolute -top-2 right-2 text-[11px] font-bold text-indigo-300 gg-zzz pointer-events-none">
              Zzz
            </span>
          )}

          {/* Expressive SVG Digital Face */}
          <svg viewBox="0 0 110 80" className="w-24 h-16" aria-label={moodMeta.title}>
            {/* Subtle scanline / inner screen */}
            <rect x="6" y="10" width="98" height="62" rx="14" fill="#04120d" stroke="#10b981" strokeOpacity="0.22" strokeWidth="1.5" />

            {/* Sprout antenna */}
            <path d="M55 10 L55 4" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
            <circle cx="55" cy="3.5" r="2.5" fill="#6ee7b7" />

            {/* Sparkles when excited or morning */}
            {(activeMood === 'excited' || activeMood === 'morning') && (
              <g className="gg-sparkle">
                <path d="M18 22 L20 17 L22 22 L27 24 L22 26 L20 31 L18 26 L13 24 Z" fill="#fbbf24" />
                <path d="M90 22 L91.5 18 L93 22 L97 23.5 L93 25 L91.5 29 L90 25 L86 23.5 Z" fill="#34d399" />
              </g>
            )}

            {/* Water droplet when thirsty */}
            {activeMood === 'thirsty' && (
              <path
                d="M91 18 C88 22 87 25 87 27 A4 4 0 0 0 95 27 C95 25 94 22 91 18 Z"
                fill="#38bdf8"
              />
            )}

            {/* EYES */}
            {activeMood === 'sleeping' && (
              <g stroke="#818cf8" strokeWidth="3" fill="none" strokeLinecap="round">
                <path d="M28 38 Q36 44 44 38" />
                <path d="M66 38 Q74 44 82 38" />
              </g>
            )}

            {activeMood === 'excited' && (
              <g stroke="#34d399" strokeWidth="3.5" fill="none" strokeLinecap="round">
                <path d="M28 40 Q36 28 44 40" />
                <path d="M66 40 Q74 28 82 40" />
              </g>
            )}

            {activeMood === 'morning' && (
              <g className="gg-robot-blink">
                <circle cx="36" cy="37" r="7" fill="#34d399" />
                <circle cx="74" cy="37" r="7" fill="#34d399" />
                <circle cx="34" cy="34.5" r="2.3" fill="#ecfdf5" />
                <circle cx="72" cy="34.5" r="2.3" fill="#ecfdf5" />
              </g>
            )}

            {activeMood === 'thirsty' && (
              <g>
                <ellipse cx="36" cy="38" rx="6.5" ry="7.5" fill="#38bdf8" />
                <ellipse cx="74" cy="38" rx="6.5" ry="7.5" fill="#38bdf8" />
                <circle cx="36" cy="39" r="2.5" fill="#082f49" />
                <circle cx="74" cy="39" r="2.5" fill="#082f49" />
                <path d="M27 28 L43 31" stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M83 28 L67 31" stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            )}

            {activeMood === 'happy' && (
              <g className="gg-robot-blink">
                <rect x="30" y="30" width="12" height="14" rx="5" fill="#34d399" />
                <rect x="68" y="30" width="12" height="14" rx="5" fill="#34d399" />
                <circle cx="34" cy="34" r="2" fill="#ecfdf5" />
                <circle cx="72" cy="34" r="2" fill="#ecfdf5" />
              </g>
            )}

            {/* MOUTH */}
            {activeMood === 'sleeping' && (
              <circle cx="55" cy="54" r="2.5" fill="#818cf8" opacity="0.85" />
            )}
            {activeMood === 'excited' && (
              <path d="M44 50 Q55 62 66 50 Z" fill="#34d399" />
            )}
            {(activeMood === 'morning' || activeMood === 'happy') && (
              <path
                d="M46 52 Q55 59 64 52"
                stroke="#6ee7b7"
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
              />
            )}
            {activeMood === 'thirsty' && (
              <path
                d="M47 56 Q55 50 63 56"
                stroke="#7dd3fc"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>

        {/* Speech Bubble & Status */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-white">{moodMeta.title}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-300 border border-emerald-500/30">
              <span className={`w-1.5 h-1.5 rounded-full ${moodMeta.dotColor}`} />
              {moodMeta.badge}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 leading-relaxed">
            {manualMoodIdx !== null && activeMood === 'happy'
              ? ROBOT_CARE_TIPS[tipIdx]
              : moodMeta.speech}
          </div>
          {manualMoodIdx !== null && (
            <p className="text-[11px] text-emerald-300/80">{ROBOT_CARE_TIPS[tipIdx]}</p>
          )}
        </div>
      </div>

      {/* Interactive Companion Controls */}
      <div className="flex sm:flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto shrink-0">
        <button
          type="button"
          onClick={handleRobotClick}
          className="flex-1 md:flex-none w-full md:w-auto px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/35 text-xs font-bold transition whitespace-nowrap"
        >
          Tap Bot • Next Tip
        </button>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onQuickCareClick}
              className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/35 text-[11px] font-semibold transition whitespace-nowrap"
            >
              Care Queue ({pendingCount})
            </button>
          )}
          {manualMoodIdx !== null && (
            <button
              type="button"
              onClick={() => setManualMoodIdx(null)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
            >
              Auto Mood
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('individual');
  const [organizationName, setOrganizationName] = useState('');
  const [location, setLocation] = useState('New Delhi, India');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'register'
          ? await api.register({
              name,
              email,
              password,
              role,
              organizationName: role === 'ngo' ? organizationName : '',
              location
            })
          : await api.login({ email, password });
      setToken(data.token);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/60 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-3xl overflow-hidden border border-emerald-500/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
        <div className="p-8 md:p-10 bg-gradient-to-br from-emerald-900/50 via-emerald-950/80 to-slate-900 flex flex-col justify-between border-b md:border-b-0 md:border-r border-emerald-500/20">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-6">
              <Sprout className="w-4 h-4" />
              Eco-Gamified Plant Intelligence
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Green Gamers
            </h1>
            <p className="text-emerald-100/80 text-sm md:text-base leading-relaxed mb-8">
              Empowering both Individual Gardeners and NGO Plantation Groups with Canvas canopy
              tracking, Green-Sense AI diagnostics, Eco-Academy courses, and community drives.
            </p>
            <div className="space-y-3 text-sm text-emerald-100/85">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Camera className="w-4 h-4" />
                </span>
                <span>HTML5 Canvas pixel-level canopy &amp; growth delta tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Building2 className="w-4 h-4" />
                </span>
                <span>Dual dashboards for Individual Caretakers &amp; NGO Drives</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <span>XP-unlocked Eco-Academy courses &amp; botanical badges</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Users className="w-4 h-4" />
                </span>
                <span>Plant Communities &amp; Live Location Advisor</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-emerald-300/60 mt-8">
            +50 XP on your first plant • +50 Bonus XP in Priority Zones
          </p>
        </div>

        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="flex gap-2 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                mode === 'register'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back, Eco Ranger' : 'Join the Green Ecosystem'}
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            {mode === 'login'
              ? 'Sign in to check your plants, courses, drives, and XP streak.'
              : 'Register as an Individual Grower or an NGO / Plantation Group.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('individual')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        role === 'individual'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ngo')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        role === 'ngo'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      NGO / Group
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="New Delhi, India"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {role === 'ngo' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Organization / Group Name
                    </label>
                    <input
                      type="text"
                      required
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="GreenRoots Plantation Collective"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@greengamers.eco"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In to Green Gamers'
                : 'Register & Claim Eco Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [dashboard, setDashboard] = useState(null);
  const [plants, setPlants] = useState([]);
  const [courses, setCourses] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [ngoOverview, setNgoOverview] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [toast, setToast] = useState(null);
  const [globalError, setGlobalError] = useState('');

  // Role & Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    role: 'individual',
    organizationName: '',
    location: '',
    bio: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // NGO Drives & Batch Modals
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveForm, setDriveForm] = useState({
    title: '',
    locationName: '',
    lat: DEFAULT_COORDS.lat,
    lng: DEFAULT_COORDS.lng,
    targetSaplings: 100,
    speciesList: 'Azadirachta indica (Neem), Pongamia pinnata',
    driveDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [savingDrive, setSavingDrive] = useState(false);

  const [batchModalDrive, setBatchModalDrive] = useState(null);
  const [batchForm, setBatchForm] = useState({
    batchLabel: 'Batch A',
    species: 'Azadirachta indica (Neem)',
    saplingsPlanted: 25,
    saplingsSurvived: 24,
    notes: ''
  });
  const [savingBatch, setSavingBatch] = useState(false);
  const [contributorSearch, setContributorSearch] = useState('');

  // Courses Reader Modal
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseActionLoading, setCourseActionLoading] = useState('');

  // Communities State
  const [selectedCommunitySlug, setSelectedCommunitySlug] = useState('');
  const [communityPostForm, setCommunityPostForm] = useState({
    postType: 'Care Update',
    content: '',
    locationTag: ''
  });
  const [postingCommunity, setPostingCommunity] = useState(false);

  // Plant Create/Edit Modal
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [plantForm, setPlantForm] = useState({
    plantName: '',
    speciesName: '',
    plantingDate: new Date().toISOString().slice(0, 10),
    locationPlot: 'Home Garden',
    lat: DEFAULT_COORDS.lat,
    lng: DEFAULT_COORDS.lng,
    initialHeightCm: 15,
    currentHeightCm: 15,
    wateringIntervalDays: 3,
    fertilizingIntervalDays: 14,
    status: 'Healthy',
    notes: '',
    imageUrl: '',
    isPriorityZone: false
  });
  const [plantImageFile, setPlantImageFile] = useState(null);
  const [savingPlant, setSavingPlant] = useState(false);

  // Plant Details & History Modal
  const [detailPlantData, setDetailPlantData] = useState(null);

  // Canvas Growth Tracker Modal
  const [growthModalPlant, setGrowthModalPlant] = useState(null);
  const [growthFile, setGrowthFile] = useState(null);
  const [growthMetrics, setGrowthMetrics] = useState(null);
  const [growthHeightInput, setGrowthHeightInput] = useState('');
  const [growthNotes, setGrowthNotes] = useState('');
  const [growthResult, setGrowthResult] = useState(null);
  const [analyzingCanvas, setAnalyzingCanvas] = useState(false);
  const [submittingGrowth, setSubmittingGrowth] = useState(false);
  const growthCanvasRef = useRef(null);

  // Green-Sense AI Scanner
  const [aiFile, setAiFile] = useState(null);
  const [aiImageUrl, setAiImageUrl] = useState('');
  const [aiSpeciesHint, setAiSpeciesHint] = useState('');
  const [aiPreview, setAiPreview] = useState('');
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Location Advisor & Live Weather Care
  const [selectedCoords, setSelectedCoords] = useState(DEFAULT_COORDS);
  const [advisorData, setAdvisorData] = useState(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [weatherCare, setWeatherCare] = useState(null);
  const [weatherCareLoading, setWeatherCareLoading] = useState(false);

  // Custom Reminder Modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    plantId: '',
    title: '',
    careType: 'Watering',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    intervalDays: 3,
    notes: ''
  });
  const [savingReminder, setSavingReminder] = useState(false);

  const showToast = useCallback((message, xp = 0, badges = []) => {
    setToast({ message, xp, badges, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadWorkspaceData = useCallback(async () => {
    setLoadingData(true);
    setGlobalError('');
    try {
      const [dashRes, plantsRes, coursesRes, communitiesRes, ngoRes, weatherCareRes] =
        await Promise.all([
          api.getDashboard(),
          api.getPlants(),
          api.getCourses().catch(() => ({ courses: [] })),
          api.getCommunities().catch(() => ({ communities: [] })),
          api.getNgoOverview().catch(() => ({
            drives: [],
            summary: {
              totalDrives: 0,
              totalTargetSaplings: 0,
              totalPlanted: 0,
              averageSurvivalRatePct: 100
            },
            contributors: []
          })),
          api.getWeatherCare().catch(() => null)
        ]);
      setDashboard(dashRes);
      setPlants(plantsRes?.plants || []);
      setCourses(coursesRes?.courses || []);
      const commList = communitiesRes?.communities || [];
      setCommunities(commList);
      setSelectedCommunitySlug((prev) => prev || commList[0]?.slug || '');
      setNgoOverview(ngoRes);
      if (weatherCareRes) {
        setWeatherCare(weatherCareRes);
      }
      if (dashRes?.user) {
        setUser(dashRes.user);
      }
    } catch (err) {
      setGlobalError(err.message || 'Failed to load workspace data.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
        await loadWorkspaceData();
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    init();
  }, [loadWorkspaceData]);

  const fetchAdvisorForCoords = useCallback(async (coords) => {
    setSelectedCoords(coords);
    setAdvisorLoading(true);
    try {
      const data = await api.getLocationAdvisor(coords.lat, coords.lng);
      setAdvisorData(data);
    } catch (err) {
      setGlobalError(err.message || 'Unable to fetch location advisory.');
    } finally {
      setAdvisorLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((activeTab === 'advisor' || user?.role === 'ngo') && !advisorData && !advisorLoading) {
      fetchAdvisorForCoords(selectedCoords);
    }
  }, [activeTab, user?.role, advisorData, advisorLoading, fetchAdvisorForCoords, selectedCoords]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setDashboard(null);
    setPlants([]);
    setCourses([]);
    setCommunities([]);
    setNgoOverview(null);
  };

  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      role: user.role || 'individual',
      organizationName: user.organizationName || '',
      location: user.location || 'New Delhi, India',
      bio: user.bio || ''
    });
    setProfileModalOpen(true);
  };

  const handleQuickRoleSwitch = async (nextRole) => {
    if (!user || user.role === nextRole) return;
    try {
      const res = await api.updateProfile({
        role: nextRole,
        organizationName:
          nextRole === 'ngo'
            ? user.organizationName || `${user.name} Plantation Collective`
            : user.organizationName
      });
      setUser(res.user);
      showToast(
        nextRole === 'ngo'
          ? 'Switched to NGO / Plantation Group Dashboard'
          : 'Switched to Individual Caretaker Dashboard'
      );
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to switch role');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile(profileForm);
      setUser(res.user);
      setProfileModalOpen(false);
      showToast('Updated profile settings');
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    setSavingDrive(true);
    setGlobalError('');
    try {
      const res = await api.createDrive({
        ...driveForm,
        organizationName: user.organizationName || `${user.name} Plantation Collective`
      });
      setDriveModalOpen(false);
      showToast(
        `Launched plantation drive "${driveForm.title}"`,
        res.xpAwarded,
        res.newlyUnlockedBadges
      );
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to create plantation drive');
    } finally {
      setSavingDrive(false);
    }
  };

  const handleLogDriveBatch = async (e) => {
    e.preventDefault();
    if (!batchModalDrive) return;
    setSavingBatch(true);
    setGlobalError('');
    try {
      const res = await api.logDriveBatch(batchModalDrive._id, batchForm);
      setBatchModalDrive(null);
      showToast(
        `Logged batch "${batchForm.batchLabel}" (${batchForm.saplingsPlanted} saplings)`,
        res.xpAwarded,
        res.newlyUnlockedBadges
      );
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to log batch plantation');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleUnlockCourse = async (course) => {
    setCourseActionLoading(course.slug);
    try {
      const res = await api.unlockCourse(course.slug);
      setUser(res.user);
      showToast(`Unlocked "${course.title}"!`);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Unable to unlock course');
    } finally {
      setCourseActionLoading('');
    }
  };

  const handleCompleteCourse = async (course) => {
    setCourseActionLoading(course.slug);
    try {
      const res = await api.completeCourse(course.slug);
      setUser(res.user);
      setActiveCourse(null);
      showToast(res.message, res.xpAwarded, res.newlyUnlockedBadges);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Unable to complete course');
    } finally {
      setCourseActionLoading('');
    }
  };

  const handleToggleCommunity = async (community) => {
    try {
      const res = community.isJoined
        ? await api.leaveCommunity(community.slug)
        : await api.joinCommunity(community.slug);
      setUser(res.user);
      showToast(res.message);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to update community membership');
    }
  };

  const handleCreateCommunityPost = async (e) => {
    e.preventDefault();
    if (!selectedCommunitySlug || !communityPostForm.content.trim()) return;
    setPostingCommunity(true);
    try {
      const res = await api.createCommunityPost(selectedCommunitySlug, communityPostForm);
      setCommunityPostForm((prev) => ({ ...prev, content: '' }));
      showToast(res.message, res.xpAwarded, res.newlyUnlockedBadges);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to post update');
    } finally {
      setPostingCommunity(false);
    }
  };

  const openAddPlantModal = (prefill = {}) => {
    setEditingPlant(null);
    setPlantImageFile(null);
    setPlantForm({
      plantName: prefill.plantName || '',
      speciesName: prefill.speciesName || '',
      plantingDate: new Date().toISOString().slice(0, 10),
      locationPlot: prefill.locationPlot || 'Home Garden',
      lat: prefill.lat ?? selectedCoords.lat,
      lng: prefill.lng ?? selectedCoords.lng,
      initialHeightCm: 15,
      currentHeightCm: 15,
      wateringIntervalDays: 3,
      fertilizingIntervalDays: 14,
      status: 'Healthy',
      notes: prefill.notes || '',
      imageUrl: '',
      isPriorityZone: Boolean(prefill.isPriorityZone)
    });
    setPlantModalOpen(true);
  };

  const openEditPlantModal = (plant) => {
    setEditingPlant(plant);
    setPlantImageFile(null);
    const coords = plant.location?.coordinates || [DEFAULT_COORDS.lng, DEFAULT_COORDS.lat];
    setPlantForm({
      plantName: plant.plantName || '',
      speciesName: plant.speciesName || '',
      plantingDate: plant.plantingDate
        ? new Date(plant.plantingDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      locationPlot: plant.locationPlot || 'Home Garden',
      lat: coords[1] ?? DEFAULT_COORDS.lat,
      lng: coords[0] ?? DEFAULT_COORDS.lng,
      initialHeightCm: plant.initialHeightCm ?? 15,
      currentHeightCm: plant.currentHeightCm ?? 15,
      wateringIntervalDays: plant.wateringIntervalDays ?? 3,
      fertilizingIntervalDays: plant.fertilizingIntervalDays ?? 14,
      status: plant.status || 'Healthy',
      notes: plant.notes || '',
      imageUrl: plant.imageUrl || '',
      isPriorityZone: Boolean(plant.isPriorityZone)
    });
    setPlantModalOpen(true);
  };

  const handleSavePlant = async (e) => {
    e.preventDefault();
    setSavingPlant(true);
    setGlobalError('');
    try {
      const formData = new FormData();
      formData.append('plantName', plantForm.plantName);
      formData.append('speciesName', plantForm.speciesName);
      formData.append('plantingDate', plantForm.plantingDate);
      formData.append('locationPlot', plantForm.locationPlot);
      formData.append('lat', String(plantForm.lat));
      formData.append('lng', String(plantForm.lng));
      formData.append('initialHeightCm', String(plantForm.initialHeightCm));
      formData.append('currentHeightCm', String(plantForm.currentHeightCm));
      formData.append('wateringIntervalDays', String(plantForm.wateringIntervalDays));
      formData.append('fertilizingIntervalDays', String(plantForm.fertilizingIntervalDays));
      formData.append('status', plantForm.status);
      formData.append('notes', plantForm.notes);
      formData.append('isPriorityZone', String(plantForm.isPriorityZone));
      if (plantForm.imageUrl) formData.append('imageUrl', plantForm.imageUrl);
      if (plantImageFile) formData.append('image', plantImageFile);

      if (editingPlant) {
        await api.updatePlant(editingPlant._id, formData);
        showToast(`Updated ${plantForm.plantName}`);
      } else {
        const res = await api.createPlant(formData);
        showToast(
          `Registered ${plantForm.plantName} & scheduled care reminders`,
          res.xpAwarded,
          res.newlyUnlockedBadges
        );
      }

      setPlantModalOpen(false);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to save plant');
    } finally {
      setSavingPlant(false);
    }
  };

  const handleDeletePlant = async (plant) => {
    if (!window.confirm(`Delete "${plant.plantName}" and all its growth logs and reminders?`)) {
      return;
    }
    try {
      await api.deletePlant(plant._id);
      showToast(`Removed ${plant.plantName}`);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to delete plant');
    }
  };

  const openPlantDetails = async (plant) => {
    try {
      const data = await api.getPlantDetails(plant._id);
      setDetailPlantData(data);
    } catch (err) {
      setGlobalError(err.message || 'Could not load plant details');
    }
  };

  const openGrowthTracker = (plant) => {
    setGrowthModalPlant(plant);
    setGrowthFile(null);
    setGrowthMetrics(null);
    setGrowthHeightInput('');
    setGrowthNotes('');
    setGrowthResult(null);
  };

  const handleGrowthImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGrowthFile(file);
    setGrowthResult(null);
    setAnalyzingCanvas(true);
    try {
      const metrics = await analyzePlantCanopy(file, {
        canvas: growthCanvasRef.current,
        highlightFoliage: true
      });
      setGrowthMetrics(metrics);
    } catch (err) {
      setGlobalError(err.message || 'Canvas image analysis failed');
    } finally {
      setAnalyzingCanvas(false);
    }
  };

  const handleSubmitGrowthUpdate = async (e) => {
    e.preventDefault();
    if (!growthModalPlant || !growthMetrics) return;
    setSubmittingGrowth(true);
    setGlobalError('');
    try {
      const formData = new FormData();
      if (growthFile) formData.append('image', growthFile);
      formData.append('greenPixels', String(growthMetrics.greenPixels));
      formData.append('canopyCoveragePct', String(growthMetrics.canopyCoveragePct));
      if (growthHeightInput) formData.append('heightCm', String(growthHeightInput));
      if (growthNotes) formData.append('notes', growthNotes);

      const res = await api.addPlantUpdate(growthModalPlant._id, formData);
      setGrowthResult(res);
      showToast(
        `Logged visual growth update for ${growthModalPlant.plantName}`,
        res.xpAwarded,
        res.newlyUnlockedBadges
      );
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to save progress update');
    } finally {
      setSubmittingGrowth(false);
    }
  };

  const handleAiFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiFile(file);
    const reader = new FileReader();
    reader.onload = () => setAiPreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleRunAiDiagnosis = async (e) => {
    e.preventDefault();
    if (!aiFile && !aiImageUrl.trim()) {
      setGlobalError('Upload a plant photo or paste an image URL first.');
      return;
    }
    setAiLoading(true);
    setGlobalError('');
    try {
      const formData = new FormData();
      if (aiFile) formData.append('image', aiFile);
      if (aiImageUrl.trim()) formData.append('imageUrl', aiImageUrl.trim());
      if (aiSpeciesHint.trim()) formData.append('speciesHint', aiSpeciesHint.trim());

      const res = await api.diagnosePlant(formData);
      setAiDiagnosis(res);
      if (res.imageUrl && !aiPreview) {
        setAiPreview(res.imageUrl);
      }
      showToast(
        `Green-Sense identified ${res.detectedSpecies}`,
        res.xpAwarded,
        res.newlyUnlockedBadges
      );
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'AI diagnosis failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCompleteReminder = async (reminder) => {
    try {
      const res = await api.completeReminder(reminder._id);
      showToast(`Completed "${reminder.title}"`, res.xpAwarded, res.newlyUnlockedBadges);
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to complete reminder');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await api.deleteReminder(reminderId);
      showToast('Reminder removed');
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to delete reminder');
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    setSavingReminder(true);
    try {
      await api.createReminder(reminderForm);
      setReminderModalOpen(false);
      showToast('Scheduled new care reminder');
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Failed to create reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleJoinChallenge = async (challengeId) => {
    try {
      const res = await api.joinChallenge(challengeId);
      showToast(
        res.duplicate ? 'Challenge already joined' : 'Joined Eco Challenge!',
        res.xpAwarded,
        res.newlyUnlockedBadges
      );
      await loadWorkspaceData();
    } catch (err) {
      setGlobalError(err.message || 'Could not join challenge');
    }
  };

  const handleUseBrowserGps = (onResult) => {
    if (!navigator.geolocation) {
      setGlobalError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onResult({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6))
        });
      },
      () => {
        setGlobalError('Location permission denied. Click directly on the map instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const xpProgressPct = useMemo(() => {
    if (!user) return 0;
    return Math.min(100, user.xp % 100);
  }, [user]);

  const activeCommunity = useMemo(
    () => communities.find((c) => c.slug === selectedCommunitySlug) || communities[0] || null,
    [communities, selectedCommunitySlug]
  );

  const filteredContributors = useMemo(() => {
    const list = ngoOverview?.contributors || [];
    const q = contributorSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        (c.badges || []).some((b) => b.toLowerCase().includes(q))
    );
  }, [ngoOverview, contributorSearch]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-300">
        <div className="flex items-center gap-3 text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading Green Gamers ecosystem...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthView
        onAuthSuccess={async (loggedInUser) => {
          setUser(loggedInUser);
          await loadWorkspaceData();
        }}
      />
    );
  }

  const isNgo = user.role === 'ngo';

  const summary = dashboard?.summary || {
    totalPlants: plants.length,
    careActivities: 0,
    estimatedCo2OffsetKg: 0,
    estimatedOxygenKg: 0,
    pendingRemindersCount: 0
  };

  const portfolio = dashboard?.plantCarePortfolio || {
    totalPlants: plants.length,
    uniqueSpeciesCount: 0,
    speciesList: [],
    healthBreakdown: {},
    growthLogsCount: 0
  };

  const readiness = dashboard?.ngoVolunteerReadiness || {
    readinessTier: 'Seedling Volunteer',
    readinessScore: 0,
    verifiedPlants: plants.length,
    healthyPlantsCount: 0,
    growthLogsCount: 0,
    completedRemindersCount: 0,
    aiScansCount: 0,
    eligibleForDrives: false
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'plants', label: 'My Plants', icon: Sprout },
    { id: 'courses', label: 'Eco-Academy', icon: GraduationCap },
    { id: 'communities', label: 'Communities', icon: Users },
    { id: 'scanner', label: 'Green-Sense AI', icon: Sparkles },
    { id: 'advisor', label: 'Location Advisor', icon: MapPin },
    { id: 'gamification', label: 'Reminders & XP', icon: Trophy }
  ];

  return (
    <div className="min-h-screen bg-[#07110d] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-emerald-500/20 bg-slate-950/85 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Green Gamers</h1>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                {isNgo ? user.organizationName || 'NGO Plantation Hub' : 'Smart Plant & Eco-XP Hub'}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openProfileModal}
              title="Edit Profile & Role"
              className="hidden sm:flex flex-col items-end px-2.5 py-1 rounded-xl hover:bg-slate-900/90 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  {isNgo ? user.organizationName || user.name : user.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isNgo
                      ? 'bg-teal-500/20 text-teal-300 border-teal-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  }`}
                >
                  {isNgo ? 'NGO' : `Lv ${user.level}`}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
                    style={{ width: `${xpProgressPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-emerald-300">{user.xp} XP</span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating +XP Feedback & Toast */}
      {toast && toast.xp > 0 && (
        <div
          key={`float-${toast.id}`}
          className="fixed top-20 right-6 z-50 pointer-events-none gg-float-xp"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/40 border border-emerald-200">
            <Sparkles className="w-4 h-4" />+{toast.xp} XP
          </span>
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-emerald-400/40 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl shadow-emerald-950/60 gg-toast-pop"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{toast.message}</p>
              {toast.xp > 0 && (
                <p className="text-xs font-bold text-emerald-300 mt-0.5">+{toast.xp} Eco XP earned!</p>
              )}
              {toast.badges?.length > 0 && (
                <p className="text-xs text-amber-300 mt-1">
                  Badge unlocked: {toast.badges.join(', ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {globalError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError('')}
              className="text-rose-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: ROLE-AWARE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Role Profile Hero + Quick Switcher */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-slate-900/90 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isNgo
                        ? 'bg-teal-500/20 text-teal-200 border-teal-400/35'
                        : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35'
                    }`}
                  >
                    {isNgo ? <Building2 className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    {isNgo ? 'NGO / Plantation Group Mode' : 'Individual Caretaker Mode'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {user.location || 'New Delhi, India'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {getTimeGreeting()}, {user.name}
                </h2>
                {isNgo && user.organizationName && (
                  <p className="text-xs font-semibold text-teal-300">
                    Organization: {user.organizationName}
                  </p>
                )}
                <p className="text-xs md:text-sm text-slate-300">
                  {user.bio ||
                    (isNgo
                      ? 'Coordinate urban plantation drives, monitor sapling survival rates, and recruit high-XP local caretakers.'
                      : 'Grow your botanical portfolio, unlock Eco-Academy courses with XP, and qualify for NGO plantation drives.')}
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <BotanicalStageGraphic level={user.level} compact />
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-700/70">
                    <button
                      type="button"
                      onClick={() => handleQuickRoleSwitch('individual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        !isNgo
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRoleSwitch('ngo')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isNgo
                          ? 'bg-teal-400 text-slate-950 shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      NGO / Group
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openProfileModal}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    Edit Profile
                  </button>
                  {isNgo ? (
                    <button
                      type="button"
                      onClick={() => setDriveModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Plantation Drive (+35 XP)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAddPlantModal()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Register Plant (+50 XP)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LIVE PLANT ROBOT & WEATHER CARE ADVISOR */}
            <div className="grid lg:grid-cols-3 gap-4 items-stretch">
              <div className="lg:col-span-2">
                <LivePlantRobotCard
                  user={user}
                  summary={summary}
                  toast={toast}
                  isNgo={isNgo}
                  weatherCare={weatherCare}
                  onQuickCareClick={() => setActiveTab('gamification')}
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/85 border border-emerald-500/25 flex flex-col justify-between space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {weatherCare?.weather?.precipitationMm > 0.5 ? (
                        <CloudRain className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-400" />
                      )}
                      Weather &amp; Plant Care Advisor
                    </h3>
                    <p className="text-[11px] text-emerald-300/80">
                      {weatherCare?.locationName || user.location || 'New Delhi, India'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setWeatherCareLoading(true);
                      try {
                        const wc = await api.getWeatherCare(user.location);
                        setWeatherCare(wc);
                      } catch {
                        // ignore transient error
                      } finally {
                        setWeatherCareLoading(false);
                      }
                    }}
                    title="Refresh live weather"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 transition"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${weatherCareLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>

                {weatherCare ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Thermometer className="w-3 h-3 text-rose-400" /> Temp
                        </span>
                        <p className="font-bold text-white mt-0.5">
                          {weatherCare.weather.temperatureC}°C
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Droplets className="w-3 h-3 text-cyan-400" /> Humidity
                        </span>
                        <p className="font-bold text-white mt-0.5">
                          {weatherCare.weather.humidityPct}%
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Wind className="w-3 h-3 text-sky-400" /> Rain/Wind
                        </span>
                        <p className="font-bold text-white mt-0.5">
                          {weatherCare.weather.precipitationMm > 0
                            ? `${weatherCare.weather.precipitationMm}mm`
                            : `${weatherCare.weather.windSpeedKmh}km/h`}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] font-semibold text-amber-300">
                      {weatherCare.weatherHeadline}
                    </p>

                    <div className="space-y-1.5 max-h-28 overflow-y-auto gg-scrollbar pr-1">
                      {(weatherCare.plantCareTips || []).length > 0 ? (
                        weatherCare.plantCareTips.map((item) => (
                          <div
                            key={item.plantId}
                            className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[11px] text-slate-200 leading-snug"
                          >
                            <span className="font-bold text-emerald-300">{item.plantName}: </span>
                            {item.tip}
                          </div>
                        ))
                      ) : (
                        (weatherCare.generalTips || []).map((gt, idx) => (
                          <p
                            key={idx}
                            className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300"
                          >
                            {gt}
                          </p>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Loading live Open-Meteo weather &amp; plant tips...
                  </p>
                )}
              </div>
            </div>

            {/* INDIVIDUAL DASHBOARD SPECIFIC CARDS */}
            {!isNgo && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Plant Care Portfolio */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-emerald-400" />
                        Plant Care Portfolio
                      </h3>
                      <p className="text-xs text-slate-400">
                        Verified species diversity, health summary &amp; Canvas growth logs
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      Level {user.level} • {user.xp} XP
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <span className="text-slate-400 block">Total Plants</span>
                      <span className="text-xl font-bold text-white">{portfolio.totalPlants}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <span className="text-slate-400 block">Unique Species</span>
                      <span className="text-xl font-bold text-emerald-300">
                        {portfolio.uniqueSpeciesCount}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <span className="text-slate-400 block">Growth Logs</span>
                      <span className="text-xl font-bold text-teal-300">
                        {portfolio.growthLogsCount}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                      <span className="text-slate-400 block">Courses Done</span>
                      <span className="text-xl font-bold text-amber-300">
                        {user.completedCourses?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-2">Tracked Species</p>
                      {portfolio.speciesList?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {portfolio.speciesList.map((sp) => (
                            <span
                              key={sp}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-xs"
                            >
                              {sp}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Register a plant to build your species portfolio.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-2">Health Status Mix</p>
                      {Object.keys(portfolio.healthBreakdown || {}).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(portfolio.healthBreakdown).map(([st, count]) => (
                            <span
                              key={st}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                                STATUS_BADGE_STYLES[st] || STATUS_BADGE_STYLES.Healthy
                              }`}
                            >
                              {st}: {count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No health entries yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* NGO Volunteer Readiness Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-950/60 to-slate-900/90 border border-teal-400/30 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                        NGO Volunteer Readiness
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-200 border border-teal-400/35">
                        {readiness.readinessScore}/100
                      </span>
                    </div>
                    <p className="text-sm font-bold text-teal-300">{readiness.readinessTier}</p>
                    <p className="text-xs text-slate-300 mt-1">
                      {readiness.eligibleForDrives
                        ? 'Your verified plant care record makes you visible to local NGOs for plantation drives.'
                        : 'Log your first plant & care activity to appear as a verified volunteer.'}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${readiness.readinessScore}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                      <div className="p-2 rounded-lg bg-slate-900/70">
                        Healthy Plants: <strong className="text-white">{readiness.healthyPlantsCount}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/70">
                        Care Tasks: <strong className="text-white">{readiness.completedRemindersCount}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/70">
                        Growth Logs: <strong className="text-white">{readiness.growthLogsCount}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/70">
                        AI Scans: <strong className="text-white">{readiness.aiScansCount}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('communities')}
                    className="w-full py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/35 text-xs font-bold transition"
                  >
                    Connect in NGO &amp; Campus Network
                  </button>
                </div>
              </div>
            )}

            {/* NGO / GROUP DASHBOARD SPECIFIC SECTIONS */}
            {isNgo && (
              <div className="space-y-6">
                {/* NGO KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/25">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Active Drives</span>
                      <TreePine className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {ngoOverview?.summary?.totalDrives || 0}
                    </p>
                    <p className="text-[11px] text-teal-300/80 mt-1">Coordinated initiatives</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/25">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Target Saplings</span>
                      <Target className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {ngoOverview?.summary?.totalTargetSaplings || 0}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Planned plantation goal</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/25">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Saplings Planted</span>
                      <Sprout className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {ngoOverview?.summary?.totalPlanted || 0}
                    </p>
                    <p className="text-[11px] text-emerald-300/80 mt-1">Logged across batches</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/25">
                    <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                      <span>Survival Rate</span>
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {ngoOverview?.summary?.averageSurvivalRatePct ?? 100}%
                    </p>
                    <p className="text-[11px] text-amber-300/80 mt-1">Verified sapling survival</p>
                  </div>
                </div>

                {/* Active Plantation Drives + Location Advisor Species Integration */}
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <TreePine className="w-4 h-4 text-emerald-400" />
                          Active Plantation Drives
                        </h3>
                        <p className="text-xs text-slate-400">
                          Track target saplings, survival rates, and log batch plantations.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDriveModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Drive
                      </button>
                    </div>

                    {(ngoOverview?.drives || []).length > 0 ? (
                      <div className="space-y-3">
                        {ngoOverview.drives.map((drive) => {
                          const progressPct = Math.min(
                            100,
                            Math.round(
                              ((drive.plantedCount || 0) / Math.max(1, drive.targetSaplings)) * 100
                            )
                          );
                          return (
                            <div
                              key={drive._id}
                              className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-white">{drive.title}</h4>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                      {drive.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {drive.organizationName} • {drive.locationName}
                                  </p>
                                </div>
                                {drive.isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBatchModalDrive(drive);
                                      setBatchForm({
                                        batchLabel: `Batch ${(drive.batchLogs?.length || 0) + 1}`,
                                        species:
                                          drive.speciesList?.[0] || 'Azadirachta indica (Neem)',
                                        saplingsPlanted: 25,
                                        saplingsSurvived: 24,
                                        notes: ''
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-200 hover:text-slate-950 border border-teal-400/35 text-xs font-bold transition"
                                  >
                                    + Log Batch (+25 XP)
                                  </button>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-300">
                                    Planted: <strong className="text-white">{drive.plantedCount}</strong>{' '}
                                    / {drive.targetSaplings} saplings ({progressPct}%)
                                  </span>
                                  <span className="text-emerald-300 font-semibold">
                                    Survival: {drive.survivalRatePct}%
                                  </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                                <div className="flex flex-wrap gap-1.5">
                                  {(drive.speciesList || []).map((sp) => (
                                    <span
                                      key={sp}
                                      className="px-2 py-0.5 rounded-md bg-slate-900 text-emerald-300 border border-slate-700"
                                    >
                                      {sp}
                                    </span>
                                  ))}
                                </div>
                                <span>{drive.batchLogs?.length || 0} batch logs</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl border border-dashed border-emerald-500/30 text-center text-sm text-slate-400">
                        No plantation drives yet. Launch your first NGO drive to log batch saplings
                        and mobilize local Green Gamers!
                      </div>
                    )}
                  </div>

                  {/* Location Advisor Species Recommendations Integration */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          Advisor Species Intel
                        </h3>
                        <button
                          type="button"
                          onClick={() => fetchAdvisorForCoords(selectedCoords)}
                          className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${advisorLoading ? 'animate-spin' : ''}`}
                          />
                          Sync
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Live recommendations from Location Advisor ({selectedCoords.lat.toFixed(2)},{' '}
                        {selectedCoords.lng.toFixed(2)}):
                      </p>

                      {advisorData ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-800/80">
                              <span className="text-slate-400 block">US AQI</span>
                              <span className="text-base font-bold text-white">
                                {advisorData.airQuality.usAqi}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-800/80">
                              <span className="text-slate-400 block">Climate</span>
                              <span className="text-base font-bold text-white">
                                {advisorData.weather.temperatureC}°C •{' '}
                                {advisorData.weather.humidityPct}%
                              </span>
                            </div>
                          </div>

                          <ul className="space-y-1.5 text-xs text-slate-200">
                            {advisorData.recommendedSpecies.map((sp, idx) => (
                              <li
                                key={idx}
                                className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20"
                              >
                                {sp}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          Syncing Open-Meteo climate data...
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (advisorData) {
                            setDriveForm((prev) => ({
                              ...prev,
                              lat: advisorData.coordinates.lat,
                              lng: advisorData.coordinates.lng,
                              speciesList: advisorData.recommendedSpecies
                                .map((s) => s.split(' — ')[0])
                                .join(', ')
                            }));
                          }
                          setDriveModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                      >
                        Start Drive with Advised Species
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('advisor')}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                      >
                        Pick Custom Coordinates on Map
                      </button>
                    </div>
                  </div>
                </div>

                {/* Local High-XP Individual Contributors Directory */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-400" />
                        Local High-XP Individual Contributors
                      </h3>
                      <p className="text-xs text-slate-400">
                        Verified individual caretakers available for NGO plantation drives &amp;
                        sapling stewardship.
                      </p>
                    </div>
                    <input
                      type="text"
                      value={contributorSearch}
                      onChange={(e) => setContributorSearch(e.target.value)}
                      placeholder="Filter by name, city, or badge..."
                      className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white w-full sm:w-64 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {filteredContributors.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredContributors.map((contrib) => (
                        <div
                          key={contrib._id}
                          className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-white">{contrib.name}</p>
                              <p className="text-xs text-slate-400">
                                {contrib.location || 'Local Volunteer'} • {contrib.plantCount || 0}{' '}
                                plants
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                              {contrib.xp} XP
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-teal-300 text-[10px] font-semibold">
                              Lv {contrib.level}
                            </span>
                            {(contrib.badges || []).slice(0, 2).map((b) => (
                              <span
                                key={b}
                                className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 text-[10px]"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4">
                      No matching contributors found yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Existing KPI Cards (Preserved) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Total Plants</span>
                  <Sprout className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">{summary.totalPlants}</p>
                <p className="text-[11px] text-emerald-300/80 mt-1">Active green assets</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Care Activities</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl font-bold text-white">{summary.careActivities}</p>
                <p className="text-[11px] text-slate-400 mt-1">Logs, scans &amp; tasks</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>CO2 Offset / Yr</span>
                  <Leaf className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">{summary.estimatedCo2OffsetKg} kg</p>
                <p className="text-[11px] text-emerald-300/80 mt-1">Estimated annual capture</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Oxygen Generated</span>
                  <Wind className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-2xl font-bold text-white">{summary.estimatedOxygenKg} kg</p>
                <p className="text-[11px] text-sky-300/80 mt-1">Estimated annual O2</p>
              </div>

              <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-amber-500/25">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Pending Care</span>
                  <Bell className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-white">{summary.pendingRemindersCount}</p>
                <p className="text-[11px] text-amber-300/80 mt-1">+20 XP per task completed</p>
              </div>
            </div>

            {/* Chart + Pending Reminders */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Plant Growth &amp; Canopy Trajectory
                    </h3>
                    <p className="text-xs text-slate-400">
                      Height (cm) &amp; Canvas canopy coverage (%) across logged updates
                    </p>
                  </div>
                  {loadingData && <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />}
                </div>
                <div className="h-64 w-full">
                  {dashboard?.growthSeries?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboard.growthSeries}>
                        <defs>
                          <linearGradient id="heightGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="canopyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '12px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="heightCm"
                          name="Height (cm)"
                          stroke="#10b981"
                          fill="url(#heightGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="canopyCoveragePct"
                          name="Canopy (%)"
                          stroke="#38bdf8"
                          fill="url(#canopyGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm text-center">
                      <Sprout className="w-8 h-8 text-emerald-500/50 mb-2" />
                      Register a plant and log a visual growth update to see your trajectory chart.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Pending Reminders
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderForm((prev) => ({
                        ...prev,
                        plantId: plants[0]?._id || ''
                      }));
                      setReminderModalOpen(true);
                    }}
                    disabled={plants.length === 0}
                    className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                  >
                    + Custom
                  </button>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-64 gg-scrollbar pr-1">
                  {dashboard?.pendingReminders?.length > 0 ? (
                    dashboard.pendingReminders.slice(0, 6).map((rem) => (
                      <div
                        key={rem._id}
                        className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/70 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{rem.title}</p>
                          <p className="text-xs text-slate-400">
                            {rem.careType} • Due {new Date(rem.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCompleteReminder(rem)}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold transition"
                        >
                          Done +20
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8 text-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500/60 mb-2" />
                      All care reminders caught up!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Leaderboard & Challenges & Badges */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Green Gamers Leaderboard
                </h3>
                <div className="space-y-2">
                  {(dashboard?.leaderboard || []).map((entry, idx) => (
                    <div
                      key={entry._id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {entry.role === 'ngo' && entry.organizationName
                              ? entry.organizationName
                              : entry.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {entry.role === 'ngo' ? 'NGO' : `Lv ${entry.level}`} •{' '}
                            {entry.badges?.length || 0} badges
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-300">{entry.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Eco Challenges
                </h3>
                <div className="space-y-3">
                  {(dashboard?.challenges || []).map((challenge) => (
                    <div
                      key={challenge.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{challenge.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{challenge.description}</p>
                        </div>
                        <button
                          type="button"
                          disabled={challenge.joined}
                          onClick={() => handleJoinChallenge(challenge.id)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            challenge.joined
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {challenge.joined ? 'Joined' : `Join +${challenge.rewardXp} XP`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-400" />
                    Milestone &amp; Earned Badges
                  </h3>
                  <span className="text-xs text-emerald-300 font-semibold">
                    {user.badges?.length || 0} unlocked
                  </span>
                </div>

                {/* 4 Clean Visual Milestone Badges */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'first-plant',
                      title: 'First Plant',
                      hint: 'Register 1 plant',
                      icon: Sprout,
                      unlocked:
                        summary.totalPlants >= 1 ||
                        (user.badges || []).includes('Seedling Starter')
                    },
                    {
                      id: 'leaf-detective',
                      title: 'Leaf Detective',
                      hint: 'Run 1 AI scan',
                      icon: Sparkles,
                      unlocked:
                        readiness.aiScansCount >= 1 ||
                        (user.badges || []).includes('Green-Sense Scout')
                    },
                    {
                      id: 'course-scholar',
                      title: 'Course Scholar',
                      hint: 'Finish 1 course',
                      icon: GraduationCap,
                      unlocked:
                        (user.completedCourses?.length || 0) >= 1 ||
                        (user.badges || []).includes('Eco Scholar')
                    },
                    {
                      id: 'community-builder',
                      title: 'Community Builder',
                      hint: 'Join or post',
                      icon: Users,
                      unlocked:
                        (user.joinedCommunities?.length || 0) >= 1 ||
                        (user.badges || []).includes('Community Voice') ||
                        (user.badges || []).includes('Drive Initiator')
                    }
                  ].map((m) => {
                    const MIcon = m.icon;
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition ${
                          m.unlocked
                            ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-800/45 border-slate-700/50 text-slate-400 opacity-70'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            m.unlocked
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <MIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{m.title}</p>
                          <p className="text-[10px] truncate opacity-80">
                            {m.unlocked ? 'Unlocked ✓' : m.hint}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {user.badges?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                    {user.badges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/25 text-emerald-200 text-[11px] font-semibold"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY PLANTS & GROWTH TRACKER */}
        {activeTab === 'plants' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">My Plant Collection</h2>
                <p className="text-sm text-slate-400">
                  Manage your plants and launch the HTML5 Canvas visual growth tracker.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openAddPlantModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add New Plant
              </button>
            </div>

            {plants.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-emerald-500/30 bg-slate-900/40 text-center">
                <Sprout className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No plants registered yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
                  Add your first plant to earn +50 XP, generate care reminders automatically, and
                  start tracking foliage growth.
                </p>
                <button
                  type="button"
                  onClick={() => openAddPlantModal()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
                >
                  Register First Plant
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {plants.map((plant) => (
                  <div
                    key={plant._id}
                    className="rounded-2xl bg-slate-900/80 border border-emerald-500/20 overflow-hidden flex flex-col"
                  >
                    <div className="h-44 bg-slate-800 relative overflow-hidden">
                      {plant.imageUrl ? (
                        <img
                          src={plant.imageUrl}
                          alt={plant.plantName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-950 to-slate-900">
                          <Leaf className="w-12 h-12 text-emerald-500/40" />
                        </div>
                      )}
                      <span
                        className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          STATUS_BADGE_STYLES[plant.status] || STATUS_BADGE_STYLES.Healthy
                        }`}
                      >
                        {plant.status}
                      </span>
                      {plant.isPriorityZone && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950">
                          Priority Zone
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{plant.plantName}</h3>
                        <p className="text-xs text-emerald-300 font-medium">{plant.speciesName}</p>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-300">
                          <div className="p-2 rounded-lg bg-slate-800/70">
                            <span className="text-slate-400 block">Height</span>
                            <span className="font-semibold text-white">
                              {plant.currentHeightCm} cm
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/70">
                            <span className="text-slate-400 block">Plot</span>
                            <span className="font-semibold text-white truncate block">
                              {plant.locationPlot}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/70">
                            <span className="text-slate-400 block">Water Every</span>
                            <span className="font-semibold text-sky-300">
                              {plant.wateringIntervalDays}d
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-800/70">
                            <span className="text-slate-400 block">CO2 Offset</span>
                            <span className="font-semibold text-emerald-300">
                              {plant.co2OffsetKgPerYear} kg/yr
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => openGrowthTracker(plant)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Track Growth
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlantDetails(plant)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                        >
                          Logs
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPlantModal(plant)}
                          title="Edit Plant"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlant(plant)}
                          title="Delete Plant"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ECO-ACADEMY (XP-UNLOCKED COURSES) */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-emerald-400" />
                  Eco-Academy Courses
                </h2>
                <p className="text-sm text-slate-400">
                  Unlock structured botanical &amp; reforestation courses as your Eco XP grows—without
                  spending your level progress.
                </p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/25 text-xs">
                <span className="text-slate-400">Your XP:</span>
                <strong className="text-emerald-300 text-sm">{user.xp} XP</strong>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  Completed: <strong>{user.completedCourses?.length || 0}</strong>/{courses.length}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {courses.map((course) => {
                const xpMissing = Math.max(0, course.requiredXp - (user.xp || 0));
                return (
                  <div
                    key={course.slug}
                    className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                      course.completed
                        ? 'bg-emerald-950/35 border-emerald-400/40'
                        : course.unlocked
                        ? 'bg-slate-900/85 border-emerald-500/25'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-emerald-300 border border-slate-700">
                          {course.category} • {course.durationMinutes} min
                        </span>
                        {course.completed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/35">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        ) : course.unlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/35">
                            <Unlock className="w-3.5 h-3.5" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-amber-300 border border-amber-500/30">
                            <Lock className="w-3.5 h-3.5" />
                            Requires {course.requiredXp} XP
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-white">{course.title}</h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                          <Award className="w-3.5 h-3.5" />
                          Badge: {course.badgeName}
                        </span>
                        <span>•</span>
                        <span>Completion Bonus: +{course.rewardXp} XP</span>
                        <span>•</span>
                        <span>{course.lessons?.length || 0} Lessons</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                      {course.unlocked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveCourse(course)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                          >
                            <BookOpen className="w-4 h-4" />
                            {course.completed ? 'Review Lessons' : 'Open Course Lessons'}
                          </button>
                          {!course.completed && (
                            <button
                              type="button"
                              disabled={courseActionLoading === course.slug}
                              onClick={() => handleCompleteCourse(course)}
                              className="px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-200 hover:text-slate-950 border border-teal-400/35 text-xs font-bold transition"
                            >
                              Mark Done (+{course.rewardXp} XP)
                            </button>
                          )}
                        </>
                      ) : course.eligibleToUnlock ? (
                        <button
                          type="button"
                          disabled={courseActionLoading === course.slug}
                          onClick={() => handleUnlockCourse(course)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
                        >
                          <Unlock className="w-4 h-4" />
                          {courseActionLoading === course.slug
                            ? 'Unlocking...'
                            : `Unlock Course (${course.requiredXp} XP Reached)`}
                        </button>
                      ) : (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-slate-800/70 border border-slate-700/70 text-center text-xs text-slate-400">
                          Earn <strong className="text-amber-300">{xpMissing} more XP</strong> via
                          plants, AI scans, or reminders to unlock
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PLANT COMMUNITIES */}
        {activeTab === 'communities' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-400" />
                Plant Communities &amp; Drive Network
              </h2>
              <p className="text-sm text-slate-400">
                Join botanical groups, follow NGO plantation announcements, and share care updates
                (+10 XP per helpful post).
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {communities.map((comm) => {
                const isSelected = activeCommunity?.slug === comm.slug;
                return (
                  <div
                    key={comm.slug}
                    onClick={() => setSelectedCommunitySlug(comm.slug)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-400 shadow-lg shadow-emerald-950/40'
                        : 'bg-slate-900/80 border-emerald-500/20 hover:border-emerald-400/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 text-[10px] font-semibold">
                          {comm.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {comm.memberCount} {comm.memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{comm.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-3">{comm.description}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      <div className="flex flex-wrap gap-1">
                        {(comm.focusTags || []).slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCommunity(comm);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          comm.isJoined
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-400/40'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {comm.isJoined ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeCommunity && (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Share in {activeCommunity.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Post care tips, progress milestones, or NGO plantation drive announcements
                      (+10 XP).
                    </p>
                  </div>

                  <form onSubmit={handleCreateCommunityPost} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Post Type</label>
                      <select
                        value={communityPostForm.postType}
                        onChange={(e) =>
                          setCommunityPostForm({ ...communityPostForm, postType: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                      >
                        <option value="Care Update">Care Update</option>
                        <option value="Drive Announcement">Drive Announcement</option>
                        <option value="Milestone">Milestone</option>
                        <option value="Question">Question</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Location Tag (optional)
                      </label>
                      <input
                        type="text"
                        value={communityPostForm.locationTag}
                        onChange={(e) =>
                          setCommunityPostForm({
                            ...communityPostForm,
                            locationTag: e.target.value
                          })
                        }
                        placeholder={user.location || 'City / Neighborhood'}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Update Message</label>
                      <textarea
                        rows={4}
                        required
                        value={communityPostForm.content}
                        onChange={(e) =>
                          setCommunityPostForm({ ...communityPostForm, content: e.target.value })
                        }
                        placeholder="Share your watering tip, sapling survival update, or weekend drive callout..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={postingCommunity}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {postingCommunity ? 'Posting...' : 'Post Update (+10 XP)'}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">
                      {activeCommunity.name} — Community Feed
                    </h3>
                    <span className="text-xs text-slate-400">
                      {activeCommunity.posts?.length || 0} posts
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto gg-scrollbar pr-1">
                    {(activeCommunity.posts || []).map((post, idx) => (
                      <div
                        key={post._id || idx}
                        className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {post.authorRole === 'ngo' && post.authorOrg
                                ? post.authorOrg
                                : post.authorName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                post.authorRole === 'ngo'
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-400/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {post.authorRole === 'ngo' ? 'NGO' : 'Grower'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[10px] font-semibold">
                              {post.postType}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {post.locationTag ? `${post.locationTag} • ` : ''}
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">{post.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GREEN-SENSE AI SCANNER */}
        {activeTab === 'scanner' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Green-Sense AI Species &amp; Health Check
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Upload a leaf or plant photo to detect species, inspect health issues, get care
                  tips, and earn +15 XP.
                </p>
              </div>

              <form onSubmit={handleRunAiDiagnosis} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Upload Plant Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAiFileChange}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:bg-emerald-500/20 file:text-emerald-300 file:font-semibold hover:file:bg-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Or Paste Image URL
                  </label>
                  <input
                    type="url"
                    value={aiImageUrl}
                    onChange={(e) => setAiImageUrl(e.target.value)}
                    placeholder="https://example.com/plant-leaf.jpg"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Optional Species Hint
                  </label>
                  <input
                    type="text"
                    value={aiSpeciesHint}
                    onChange={(e) => setAiSpeciesHint(e.target.value)}
                    placeholder="e.g., Monstera deliciosa, Holy Basil..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {aiPreview && (
                  <div className="rounded-xl overflow-hidden border border-slate-700 max-h-56">
                    <img src={aiPreview} alt="AI Preview" className="w-full h-56 object-cover" />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={aiLoading}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold text-sm transition"
                >
                  {aiLoading ? 'Analyzing with Green-Sense...' : 'Run AI Diagnosis (+15 XP)'}
                </button>
              </form>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Diagnostic Report</h3>
              {aiDiagnosis ? (
                <div className="space-y-4">
                  {aiDiagnosis.imageUrl && (
                    <img
                      src={aiDiagnosis.imageUrl}
                      alt={aiDiagnosis.detectedSpecies}
                      className="w-full h-48 object-cover rounded-xl border border-slate-700"
                    />
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-400">Detected Species</span>
                      <p className="text-lg font-bold text-white">{aiDiagnosis.detectedSpecies}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        STATUS_BADGE_STYLES[aiDiagnosis.healthStatus] || STATUS_BADGE_STYLES.Healthy
                      }`}
                    >
                      {aiDiagnosis.healthStatus}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-2">
                      Issues Detected
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
                      {(aiDiagnosis.issuesDetected || []).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/25">
                    <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide mb-2">
                      Recommended Care Tips
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-emerald-100">
                      {(aiDiagnosis.careTips || []).map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-slate-500">
                    Engine: {aiDiagnosis.provider || 'green-sense'}
                  </p>
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-sm text-center">
                  <Sparkles className="w-10 h-10 text-emerald-500/50 mb-3" />
                  Submit an image on the left to view AI species recognition, detected issues, and
                  personalized care advice.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SMART LOCATION ADVISOR */}
        {activeTab === 'advisor' && (
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white">Smart Plantation Location Advisor</h2>
                  <p className="text-xs text-slate-400">
                    Click anywhere on the map or use GPS to check live AQI, weather &amp; nearby
                    green cover (2.5 km radius).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUseBrowserGps(fetchAdvisorForCoords)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-xs font-bold transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Use My GPS
                </button>
              </div>

              <div className="h-[440px] rounded-2xl overflow-hidden border border-emerald-500/25 shadow-xl">
                <MapContainer
                  center={[selectedCoords.lat, selectedCoords.lng]}
                  zoom={13}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap center={selectedCoords} />
                  <MapClickHandler onSelectCoords={fetchAdvisorForCoords} />

                  <Circle
                    center={[selectedCoords.lat, selectedCoords.lng]}
                    radius={2500}
                    pathOptions={{
                      color: advisorData?.isPrioritySpot ? '#f59e0b' : '#10b981',
                      fillColor: advisorData?.isPrioritySpot ? '#f59e0b' : '#10b981',
                      fillOpacity: 0.14
                    }}
                  />

                  <Marker
                    position={[selectedCoords.lat, selectedCoords.lng]}
                    icon={SELECTED_PIN_ICON}
                  >
                    <Popup>
                      Selected Spot ({selectedCoords.lat}, {selectedCoords.lng})
                    </Popup>
                  </Marker>

                  {(advisorData?.nearbyPlants || []).map((np) => {
                    const c = np.location?.coordinates;
                    if (!c || c.length < 2) return null;
                    return (
                      <Marker key={np._id} position={[c[1], c[0]]} icon={NEARBY_PLANT_ICON}>
                        <Popup>
                          <strong>{np.plantName}</strong>
                          <br />
                          {np.speciesName}
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between space-y-4">
              {advisorLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-emerald-300 text-sm py-12">
                  <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                  Fetching Open-Meteo AQI &amp; checking nearby plants...
                </div>
              ) : advisorData ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs text-slate-400">Selected Coordinates</span>
                        <p className="text-sm font-mono text-white">
                          {advisorData.coordinates.lat.toFixed(4)},{' '}
                          {advisorData.coordinates.lng.toFixed(4)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          advisorData.isPrioritySpot
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        }`}
                      >
                        {advisorData.priorityStatus}
                      </span>
                    </div>

                    {advisorData.bonusXpEligible && (
                      <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-semibold flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>
                          Priority Zone Eligible: Planting here awards +50 Bonus XP (+100 XP total)!
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Wind className="w-3.5 h-3.5 text-sky-400" /> US AQI
                        </span>
                        <p className="text-lg font-bold text-white mt-1">
                          {advisorData.airQuality.usAqi}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          PM2.5: {advisorData.airQuality.pm25} µg/m³
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-rose-400" /> Temperature
                        </span>
                        <p className="text-lg font-bold text-white mt-1">
                          {advisorData.weather.temperatureC} °C
                        </p>
                        <span className="text-[11px] text-slate-400">
                          Wind: {advisorData.weather.windSpeedKmh} km/h
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Humidity
                        </span>
                        <p className="text-lg font-bold text-white mt-1">
                          {advisorData.weather.humidityPct}%
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-emerald-400" /> Nearby (2.5 km)
                        </span>
                        <p className="text-lg font-bold text-white mt-1">
                          {advisorData.nearbyPlantCount} plants
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {advisorData.advisorySummary}
                    </p>

                    <div>
                      <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide mb-2">
                        Recommended Species
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {advisorData.recommendedSpecies.map((sp, i) => (
                          <li
                            key={i}
                            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50"
                          >
                            {sp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        openAddPlantModal({
                          lat: advisorData.coordinates.lat,
                          lng: advisorData.coordinates.lng,
                          speciesName: advisorData.recommendedSpecies[0]?.split(' — ')[0] || '',
                          locationPlot: advisorData.isPrioritySpot
                            ? 'Priority Green Spot'
                            : 'Community Plot',
                          isPriorityZone: advisorData.isPrioritySpot
                        })
                      }
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
                    >
                      {advisorData.isPrioritySpot
                        ? 'Plant Here (+50 Bonus XP)'
                        : 'Register Plant at This Spot'}
                    </button>
                    {isNgo && (
                      <button
                        type="button"
                        onClick={() => {
                          setDriveForm((prev) => ({
                            ...prev,
                            lat: advisorData.coordinates.lat,
                            lng: advisorData.coordinates.lng,
                            speciesList: advisorData.recommendedSpecies
                              .map((s) => s.split(' — ')[0])
                              .join(', ')
                          }));
                          setDriveModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/35 font-bold text-xs transition"
                      >
                        Create NGO Drive at This Location
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* TAB 7: REMINDERS & REWARDS */}
        {activeTab === 'gamification' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Care Reminders ({dashboard?.allReminders?.length || 0})
                </h2>
                <button
                  type="button"
                  disabled={plants.length === 0}
                  onClick={() => {
                    setReminderForm((prev) => ({
                      ...prev,
                      plantId: plants[0]?._id || ''
                    }));
                    setReminderModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Reminder
                </button>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto gg-scrollbar pr-1">
                {(dashboard?.allReminders || []).map((rem) => (
                  <div
                    key={rem._id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      rem.completed
                        ? 'bg-slate-900/40 border-slate-800 opacity-70'
                        : 'bg-slate-800/70 border-slate-700/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          rem.completed ? 'line-through text-slate-400' : 'text-white'
                        }`}
                      >
                        {rem.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rem.plantId?.plantName || 'Plant'} • {rem.careType} • Due{' '}
                        {new Date(rem.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!rem.completed ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteReminder(rem)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                        >
                          Complete +20 XP
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400">Completed</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                Eco XP Ledger
              </h2>
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto gg-scrollbar pr-1">
                {(dashboard?.recentRewards || []).map((rew) => (
                  <div
                    key={rew._id}
                    className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {rew.description || rew.action}
                      </p>
                      <p className="text-xs text-slate-400">
                        {rew.action} • {new Date(rew.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0">
                      +{rew.xp} XP
                    </span>
                  </div>
                ))}
                {(!dashboard?.recentRewards || dashboard.recentRewards.length === 0) && (
                  <p className="text-sm text-slate-400 py-8 text-center">
                    No XP events yet. Register a plant or run an AI scan to start earning!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PROFILE & ROLE EDITOR MODAL */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Profile &amp; Account Role</h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, role: 'individual' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                      profileForm.role === 'individual'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, role: 'ngo' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                      profileForm.role === 'ngo'
                        ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    NGO / Group
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              {profileForm.role === 'ngo' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={profileForm.organizationName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, organizationName: e.target.value })
                    }
                    placeholder="GreenRoots Collective"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-300 mb-1">Location</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Bio</label>
                <textarea
                  rows={2}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NGO PLANTATION DRIVE MODAL */}
      {driveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Launch Plantation Drive</h3>
              <button
                type="button"
                onClick={() => setDriveModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDrive} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Drive Title *</label>
                <input
                  type="text"
                  required
                  value={driveForm.title}
                  onChange={(e) => setDriveForm({ ...driveForm, title: e.target.value })}
                  placeholder="Yamuna Green Belt Monsoon Drive"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={driveForm.locationName}
                    onChange={(e) => setDriveForm({ ...driveForm, locationName: e.target.value })}
                    placeholder="Sector 14 Park, New Delhi"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Target Saplings *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={driveForm.targetSaplings}
                    onChange={(e) =>
                      setDriveForm({ ...driveForm, targetSaplings: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Target Species (comma-separated)
                </label>
                <input
                  type="text"
                  value={driveForm.speciesList}
                  onChange={(e) => setDriveForm({ ...driveForm, speciesList: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={driveForm.lat}
                    onChange={(e) => setDriveForm({ ...driveForm, lat: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={driveForm.lng}
                    onChange={(e) => setDriveForm({ ...driveForm, lng: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={driveForm.notes}
                  onChange={(e) => setDriveForm({ ...driveForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDriveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDrive}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                >
                  {savingDrive ? 'Launching...' : 'Launch Drive (+35 XP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG BATCH PLANTATION MODAL */}
      {batchModalDrive && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-teal-400/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Log Batch Plantation</h3>
                <p className="text-xs text-teal-300">{batchModalDrive.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalDrive(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLogDriveBatch} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Batch Label *</label>
                <input
                  type="text"
                  required
                  value={batchForm.batchLabel}
                  onChange={(e) => setBatchForm({ ...batchForm, batchLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Species *</label>
                <input
                  type="text"
                  required
                  value={batchForm.species}
                  onChange={(e) => setBatchForm({ ...batchForm, species: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Saplings Planted *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchForm.saplingsPlanted}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, saplingsPlanted: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Saplings Survived</label>
                  <input
                    type="number"
                    min="0"
                    max={batchForm.saplingsPlanted}
                    value={batchForm.saplingsSurvived}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, saplingsSurvived: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Batch Notes</label>
                <input
                  type="text"
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  placeholder="Mulched & watered with 8 volunteers"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalDrive(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBatch}
                  className="px-5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-sm"
                >
                  {savingBatch ? 'Saving...' : 'Log Batch (+25 XP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COURSE LESSON READER MODAL */}
      {activeCourse && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl my-8 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-300 uppercase">
                  {activeCourse.category}
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">{activeCourse.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto gg-scrollbar pr-1">
              {(activeCourse.lessons || []).map((lesson, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/70 space-y-2.5"
                >
                  <h4 className="text-sm font-bold text-emerald-300">{lesson.title}</h4>
                  <p className="text-sm text-slate-200 leading-relaxed">{lesson.content}</p>
                  {lesson.checklist?.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Action Checklist
                      </p>
                      {lesson.checklist.map((item, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Reward: <strong className="text-emerald-300">+{activeCourse.rewardXp} XP</strong> &amp;
                badge <strong className="text-amber-300">{activeCourse.badgeName}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCourse(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Close
                </button>
                {!activeCourse.completed && (
                  <button
                    type="button"
                    disabled={courseActionLoading === activeCourse.slug}
                    onClick={() => handleCompleteCourse(activeCourse)}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                  >
                    {courseActionLoading === activeCourse.slug
                      ? 'Completing...'
                      : `Complete Course (+${activeCourse.rewardXp} XP)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PLANT MODAL */}
      {plantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingPlant ? `Edit ${editingPlant.plantName}` : 'Register New Plant'}
              </h3>
              <button
                type="button"
                onClick={() => setPlantModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlant} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Plant Name *</label>
                  <input
                    type="text"
                    required
                    value={plantForm.plantName}
                    onChange={(e) => setPlantForm({ ...plantForm, plantName: e.target.value })}
                    placeholder="e.g., Balcony Neem"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Species Name *</label>
                  <input
                    type="text"
                    required
                    value={plantForm.speciesName}
                    onChange={(e) => setPlantForm({ ...plantForm, speciesName: e.target.value })}
                    placeholder="e.g., Azadirachta indica"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Plot / Area</label>
                  <input
                    type="text"
                    value={plantForm.locationPlot}
                    onChange={(e) => setPlantForm({ ...plantForm, locationPlot: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Planting Date</label>
                  <input
                    type="date"
                    value={plantForm.plantingDate}
                    onChange={(e) => setPlantForm({ ...plantForm, plantingDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Initial Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={plantForm.initialHeightCm}
                    onChange={(e) =>
                      setPlantForm({ ...plantForm, initialHeightCm: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Status</label>
                  <select
                    value={plantForm.status}
                    onChange={(e) => setPlantForm({ ...plantForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  >
                    {Object.keys(STATUS_BADGE_STYLES).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Water Interval (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={plantForm.wateringIntervalDays}
                    onChange={(e) =>
                      setPlantForm({ ...plantForm, wateringIntervalDays: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Fertilize Interval (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={plantForm.fertilizingIntervalDays}
                    onChange={(e) =>
                      setPlantForm({ ...plantForm, fertilizingIntervalDays: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={plantForm.lat}
                    onChange={(e) => setPlantForm({ ...plantForm, lat: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={plantForm.lng}
                    onChange={(e) => setPlantForm({ ...plantForm, lng: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUseBrowserGps((coords) =>
                      setPlantForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
                    )
                  }
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-emerald-500/30"
                >
                  Use My GPS
                </button>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Plant Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPlantImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={plantForm.notes}
                  onChange={(e) => setPlantForm({ ...plantForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              {!editingPlant && (
                <label className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                  <input
                    type="checkbox"
                    checked={plantForm.isPriorityZone}
                    onChange={(e) =>
                      setPlantForm({ ...plantForm, isPriorityZone: e.target.checked })
                    }
                    className="rounded border-slate-600 bg-slate-800"
                  />
                  Planted in an advised Priority Zone (+50 Bonus XP)
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlantModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlant}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                >
                  {savingPlant ? 'Saving...' : editingPlant ? 'Save Changes' : 'Register Plant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANVAS VISUAL GROWTH TRACKER MODAL */}
      {growthModalPlant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  Canvas Growth Tracker — {growthModalPlant.plantName}
                </h3>
                <p className="text-xs text-slate-400">
                  Analyzes green foliage pixels on HTML5 &lt;canvas&gt; and updates growth &amp;
                  health.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGrowthModalPlant(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGrowthUpdate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Select New Plant Photo *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleGrowthImageSelect}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:bg-emerald-500/20 file:text-emerald-300 file:font-semibold"
                />
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex flex-col items-center">
                <canvas
                  ref={growthCanvasRef}
                  className={`max-w-full max-h-60 rounded-lg ${growthMetrics ? 'block' : 'hidden'}`}
                />
                {analyzingCanvas && (
                  <p className="text-xs text-emerald-300 py-6">Measuring green pixels...</p>
                )}
                {!growthMetrics && !analyzingCanvas && (
                  <p className="text-xs text-slate-500 py-8">
                    Upload an image to highlight green foliage &amp; calculate canopy coverage.
                  </p>
                )}
                {growthMetrics && (
                  <div className="w-full grid grid-cols-2 gap-3 mt-3 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/25">
                      <span className="text-[11px] text-slate-400 block">Green Pixels</span>
                      <span className="text-base font-bold text-emerald-300">
                        {growthMetrics.greenPixels.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/25">
                      <span className="text-[11px] text-slate-400 block">Canopy Coverage</span>
                      <span className="text-base font-bold text-teal-300">
                        {growthMetrics.canopyCoveragePct}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Manual Height (cm, optional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={growthHeightInput}
                    onChange={(e) => setGrowthHeightInput(e.target.value)}
                    placeholder="Auto-estimate from canopy"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Notes</label>
                  <input
                    type="text"
                    value={growthNotes}
                    onChange={(e) => setGrowthNotes(e.target.value)}
                    placeholder="New leaves sprouting..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              {growthResult && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-400/35 text-xs space-y-1">
                  <p className="font-bold text-emerald-300">
                    Saved! Growth Delta: {growthResult.update.growthPercentage}% • New Height:{' '}
                    {growthResult.plant.currentHeightCm} cm
                  </p>
                  <p className="text-slate-200">
                    AI Health Status: <strong>{growthResult.aiDiagnosis.healthStatus}</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGrowthModalPlant(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!growthMetrics || submittingGrowth}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm"
                >
                  {submittingGrowth ? 'Saving Update...' : 'Save Progress (+20 XP)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLANT DETAILS & UPDATE HISTORY MODAL */}
      {detailPlantData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {detailPlantData.plant.plantName} — History
                </h3>
                <p className="text-xs text-emerald-300">{detailPlantData.plant.speciesName}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPlantData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto gg-scrollbar pr-1">
              {detailPlantData.updates?.length > 0 ? (
                detailPlantData.updates.map((upd) => (
                  <div
                    key={upd._id}
                    className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {upd.heightCm} cm ({upd.growthPercentage >= 0 ? '+' : ''}
                        {upd.growthPercentage}%)
                      </span>
                      <span className="text-slate-400">
                        {new Date(upd.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-emerald-300">
                      Green Pixels: {upd.greenPixels.toLocaleString()} • Canopy:{' '}
                      {upd.canopyCoveragePct}% • AI Status: {upd.aiHealthStatus}
                    </p>
                    {upd.notes && <p className="text-slate-300">{upd.notes}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No visual progress updates recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM REMINDER MODAL */}
      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Schedule Care Reminder</h3>
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReminder} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Plant</label>
                <select
                  required
                  value={reminderForm.plantId}
                  onChange={(e) => setReminderForm({ ...reminderForm, plantId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                >
                  {plants.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.plantName} ({p.speciesName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  placeholder="e.g., Mist leaves & check soil"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Care Type</label>
                  <select
                    value={reminderForm.careType}
                    onChange={(e) => setReminderForm({ ...reminderForm, careType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  >
                    <option value="Watering">Watering</option>
                    <option value="Fertilizing">Fertilizing</option>
                    <option value="Pruning">Pruning</option>
                    <option value="Health Check">Health Check</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={reminderForm.dueDate}
                    onChange={(e) => setReminderForm({ ...reminderForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Repeat Every (days, 0 = one-time)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reminderForm.intervalDays}
                  onChange={(e) =>
                    setReminderForm({ ...reminderForm, intervalDays: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReminderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReminder}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                >
                  {savingReminder ? 'Saving...' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
