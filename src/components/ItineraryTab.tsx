'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MapPin, Clock, Edit2, Trash2, IndianRupee, X, Sun, Moon, Waves, Thermometer, CheckSquare, Square, Briefcase } from 'lucide-react';
import { Activity, PackingItem } from '@/lib/db';

interface ItineraryTabProps {
  currentUser: string;
}

export default function ItineraryTab({ currentUser }: ItineraryTabProps) {
  const [itinerary, setItinerary] = useState<Activity[]>([]);
  const [packingList, setPackingList] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [packingLoading, setPackingLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Weather states
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Activity | null>(null);

  // Activity Form states
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('09:00 AM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Beach');
  const [location, setLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  // Packing Form states
  const [newPackItem, setNewPackItem] = useState('');
  const [newPackCat, setNewPackCat] = useState('Essentials');

  const fetchItinerary = async () => {
    try {
      const res = await fetch('/api/itinerary');
      if (!res.ok) throw new Error('Failed to fetch itinerary');
      const data = await res.json();
      setItinerary(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
  };

  const fetchPackingList = async () => {
    try {
      const res = await fetch('/api/packing');
      if (!res.ok) throw new Error('Failed to fetch packing list');
      const data = await res.json();
      setPackingList(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchLiveWeather = async () => {
    try {
      setWeatherLoading(true);
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=15.5997&longitude=73.7402&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=Asia%2FKolkata');
      if (!res.ok) throw new Error('Weather API failed');
      const data = await res.json();
      setWeatherData(data.current);
    } catch (e) {
      console.error("Failed to load live weather, using fallback profile");
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchItinerary(), fetchPackingList(), fetchLiveWeather()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setDay(1);
    setTime('09:00 AM');
    setTitle('');
    setDescription('');
    setCategory('Beach');
    setLocation('');
    setEstimatedCost('');
    setIsOpen(true);
  };

  const openEditModal = (item: Activity) => {
    setEditingItem(item);
    setDay(item.day);
    setTime(item.time);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setLocation(item.location || '');
    setEstimatedCost(item.estimatedCost.toString());
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !day) return;

    const body = {
      id: editingItem?.id,
      day: Number(day),
      time,
      title,
      description,
      category,
      location,
      estimatedCost: Number(estimatedCost) || 0
    };

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch('/api/itinerary', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to save activity');
      
      setIsOpen(false);
      fetchItinerary();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      const res = await fetch(`/api/itinerary?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete activity');
      fetchItinerary();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePacking = async (itemId: string) => {
    setPackingLoading(true);
    try {
      const res = await fetch('/api/packing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          userName: currentUser
        })
      });
      if (!res.ok) throw new Error('Failed to toggle packing check');
      const data = await res.json();
      setPackingList(data.packingList);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPackingLoading(false);
    }
  };

  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackItem.trim()) return;

    try {
      const res = await fetch('/api/packing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: newPackItem.trim(),
          category: newPackCat
        })
      });
      if (!res.ok) throw new Error('Failed to add packing item');
      const data = await res.json();
      setPackingList(data.packingList);
      setNewPackItem('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Group activities by Day
  const groupedActivities: Record<number, Activity[]> = {};
  itinerary.forEach(act => {
    if (!groupedActivities[act.day]) {
      groupedActivities[act.day] = [];
    }
    groupedActivities[act.day].push(act);
  });

  const totalBudget = itinerary.reduce((sum, act) => sum + act.estimatedCost, 0);

  const getCategoryBadge = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'beach': return 'badge-beach';
      case 'adventure': return 'badge-adventure';
      case 'nightlife': return 'badge-nightlife';
      case 'culture': return 'badge-culture';
      default: return 'badge-other';
    }
  };

  // Custom live weather condition rendering based on Open-Meteo API or clock fallback
  const getGoaWeather = () => {
    const hour = new Date().getHours();
    const fallbackNight = hour >= 18 || hour < 6;

    const getWeatherDesc = (code: number) => {
      if (code === 0) return 'Clear Sky';
      if (code <= 3) return 'Partly Cloudy';
      if (code === 45 || code === 48) return 'Foggy';
      if (code <= 65 || (code >= 80 && code <= 82)) return 'Rain Showers';
      if (code >= 95) return 'Thunderstorm';
      return 'Clear Sky';
    };

    if (weatherData) {
      const isNight = weatherData.is_day === 0;
      return {
        temp: `${Math.round(weatherData.temperature_2m)}°C`,
        condition: getWeatherDesc(weatherData.weather_code),
        sunsetText: isNight ? 'Sunset has passed 🌅' : 'Sunset at 6:48 PM 🌅',
        icon: isNight ? <Moon size={24} style={{ color: '#FFE082' }} /> : <Sun size={24} style={{ color: '#FFB300' }} />,
        wave: '0.8m (Safe)',
        waterTemp: '28°C',
        advise: isNight 
          ? `Beach night breeze feels like ${Math.round(weatherData.apparent_temperature)}°C. Time for shacks! 🍹`
          : `Perfect beach day: Feels like ${Math.round(weatherData.apparent_temperature)}°C. Apply SPF 50! 🧴`,
        humidity: `${weatherData.relative_humidity_2m}%`,
        wind: `${weatherData.wind_speed_10m} km/h`
      };
    }

    return {
      temp: fallbackNight ? '27°C' : '32°C',
      condition: fallbackNight ? 'Clear Night Sky' : 'Sunny & Humid',
      sunsetText: fallbackNight ? 'Sunset has passed 🌅' : 'Sunset at 6:48 PM 🌅',
      icon: fallbackNight ? <Moon size={24} style={{ color: '#FFE082' }} /> : <Sun size={24} style={{ color: '#FFB300' }} />,
      wave: '0.9m (Safe)',
      waterTemp: '28°C',
      advise: fallbackNight ? 'Perfect for beachside feni & shacks 🍹' : 'Apply SPF 50+ sunscreen before going out! 🧴',
      humidity: '76%',
      wind: '12 km/h'
    };
  };

  const weather = getGoaWeather();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      
      {/* 1. Next-Level Weather & Sunset Widget */}
      <div className="glass-card" style={styles.weatherCard}>
        <div style={styles.weatherTop}>
          <div style={styles.weatherHeader}>
            {weather.icon}
            <div>
              <h3 style={styles.weatherLoc}>Vagator Beach, North Goa</h3>
              <span style={styles.weatherSub}>{weather.condition} • {weather.temp}</span>
            </div>
          </div>
          <div style={styles.weatherSunset}>{weather.sunsetText}</div>
        </div>
        <div style={styles.weatherGrid}>
          <div style={styles.weatherStat}>
            <Waves size={16} style={{ color: 'var(--primary-teal)' }} />
            <span>Waves: <strong>{weather.wave}</strong></span>
          </div>
          <div style={styles.weatherStat}>
            <Thermometer size={16} style={{ color: 'var(--accent-terracotta)' }} />
            <span>Water: <strong>{weather.waterTemp}</strong></span>
          </div>
          <div style={{ ...styles.weatherStat, opacity: 0.8 }}>
            <span>Humidity: <strong>{weather.humidity}</strong></span>
          </div>
          <div style={{ ...styles.weatherStat, opacity: 0.8 }}>
            <span>Wind: <strong>{weather.wind}</strong></span>
          </div>
        </div>
        <div style={styles.weatherAdvise}>{weather.advise}</div>
      </div>

      {/* Overview Card */}
      <div className="glass-card" style={styles.budgetCard}>
        <div style={styles.budgetHeader}>
          <div>
            <div style={styles.budgetText}>ESTIMATED TRIP BUDGET</div>
            <div className="mono-amount" style={styles.budgetAmount}>
              ₹{totalBudget.toLocaleString('en-IN')}
            </div>
          </div>
          <button onClick={openAddModal} className="btn-primary" style={styles.addBtn}>
            <Plus size={18} /> Add Plan
          </button>
        </div>
      </div>

      {/* Itinerary Day Cards */}
      {loading && itinerary.length === 0 ? (
        <div style={styles.centerText}>Loading Goan vibes...</div>
      ) : itinerary.length === 0 ? (
        <div style={styles.emptyState}>
          <Calendar size={48} style={{ color: 'var(--primary-teal)', opacity: 0.4 }} />
          <h3>No plans added yet</h3>
          <p>Tap "Add Plan" to structure the days in Goa!</p>
        </div>
      ) : (
        Object.keys(groupedActivities)
          .map(Number)
          .sort((a, b) => a - b)
          .map(dayNum => (
            <div key={dayNum} style={styles.daySection}>
              <h2 style={styles.dayTitle}>DAY {dayNum}</h2>
              <div style={styles.cardContainer}>
                {groupedActivities[dayNum].map(activity => (
                  <div key={activity.id} className="glass-card" style={styles.activityCard}>
                    <div style={styles.cardHeader}>
                      <span className={`badge ${getCategoryBadge(activity.category)}`}>
                        {activity.category}
                      </span>
                      <div style={styles.actions}>
                        <button onClick={() => openEditModal(activity)} style={styles.actionBtn} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(activity.id)} style={styles.actionBtnDelete} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 style={styles.cardTitle}>{activity.title}</h3>

                    {activity.description && (
                      <p style={styles.cardDesc}>{activity.description}</p>
                    )}

                    <div style={styles.cardDetails}>
                      <div style={styles.detailItem}>
                        <Clock size={14} />
                        <span>{activity.time}</span>
                      </div>
                      
                      {activity.location && (
                        <div style={styles.detailItem}>
                          <MapPin size={14} />
                          <span>{activity.location}</span>
                        </div>
                      )}

                      {activity.estimatedCost > 0 && (
                        <div style={{ ...styles.detailItem, color: 'var(--accent-terracotta)', fontWeight: 600 }}>
                          <IndianRupee size={13} />
                          <span className="mono-amount">{activity.estimatedCost.toLocaleString('en-IN')} / person</span>
                        </div>
                      )}
                    </div>

                    {/* Google Maps Shortcut */}
                    {activity.location && (
                      <div style={styles.mapShortcutRow}>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location + " Goa")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.mapBtn}
                        >
                          🗺️ Navigate in Maps
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      {/* 2. Shared Packing Checklist Section */}
      <div className="glass-card" style={styles.packingCard}>
        <div style={styles.packingHeaderBlock}>
          <Briefcase size={20} style={{ color: 'var(--primary-teal)' }} />
          <h2 style={styles.packingHeaderTitle}>SHARED PACKING CHECKLIST</h2>
        </div>
        <p style={styles.packingSub}>Toggle item once packed so the group knows we're fully loaded.</p>
        
        <div style={styles.packingList}>
          {packingList.map(item => {
            const isChecked = item.checkedBy.includes(currentUser);
            return (
              <div 
                key={item.id} 
                onClick={() => handleTogglePacking(item.id)}
                style={styles.packingRow}
              >
                <div style={styles.packingLeft}>
                  {isChecked ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary-teal)' }} />
                  ) : (
                    <Square size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: isChecked ? '600' : '400',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    color: isChecked ? 'var(--text-muted)' : 'var(--text-charcoal)'
                  }}>
                    {item.item}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase' }}>
                    ({item.category})
                  </span>
                </div>
                <div style={styles.packingRight}>
                  {item.checkedBy.length > 0 ? (
                    <div style={styles.checkedAvatars}>
                      {item.checkedBy.map(name => (
                        <span key={name} style={styles.packAvatar} title={name}>
                          {name.substring(0, 1)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unpacked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add custom packing item form */}
        <form onSubmit={handleAddPackingItem} style={styles.packForm}>
          <input 
            type="text" 
            placeholder="Add essential item (e.g. Chargers)..." 
            style={styles.packInput}
            value={newPackItem}
            onChange={(e) => setNewPackItem(e.target.value)}
          />
          <select 
            style={styles.packSelect}
            value={newPackCat}
            onChange={(e) => setNewPackCat(e.target.value)}
          >
            <option value="Essentials">Essentials 🎒</option>
            <option value="Clothing">Clothing 👕</option>
            <option value="Fun">Fun 🍹</option>
            <option value="First-Aid">First-Aid 💊</option>
          </select>
          <button type="submit" style={styles.packSubmitBtn}>Add</button>
        </form>
      </div>

      {/* Add/Edit Activity Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Activity' : 'Add Activity'}</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Day of Trip</label>
                <select 
                  className="input-field"
                  value={day} 
                  onChange={(e) => setDay(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>Day {n}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Time</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. 09:00 AM, Evening, Flexible"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Activity Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Scuba diving at Grand Island"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <select 
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Beach">Beach 🏖️</option>
                  <option value="Adventure">Adventure 🏄‍♂️</option>
                  <option value="Nightlife">Nightlife 🍻</option>
                  <option value="Culture">Culture 🏛️</option>
                  <option value="Food">Food 🍛</option>
                  <option value="Other">Other 📍</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Location (Optional)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Coco Beach / Vagator"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Estimated Cost per Person (₹, Optional)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g. 1500"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Description (Optional)</label>
                <textarea 
                  className="input-field"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Details, dress codes, list of things to carry..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                {editingItem ? 'Save Changes' : 'Create Activity'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  weatherCard: {
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  weatherTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  weatherLoc: {
    fontSize: '15px',
    fontWeight: '700',
  },
  weatherSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  weatherSunset: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--accent-terracotta)',
  },
  weatherGrid: {
    display: 'flex',
    gap: '24px',
    borderTop: '1.5px solid var(--border-color)',
    paddingTop: '10px',
  },
  weatherStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  weatherAdvise: {
    fontSize: '12px',
    backgroundColor: 'rgba(232, 163, 61, 0.08)',
    border: '1px solid rgba(232, 163, 61, 0.2)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-charcoal)',
    fontWeight: '500',
    textAlign: 'center',
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--border-color)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetText: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  budgetAmount: {
    fontSize: '24px',
    color: 'var(--primary-teal)',
    marginTop: '2px',
  },
  addBtn: {
    width: 'auto',
    padding: '10px 16px',
    fontSize: '14px',
    height: '42px',
  },
  daySection: {
    marginBottom: '28px',
  },
  dayTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    letterSpacing: '0.02em',
    marginBottom: '12px',
    borderBottom: '2px solid var(--primary-teal)',
    display: 'inline-block',
    paddingBottom: '2px',
  },
  cardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '16px',
    border: '1.5px solid var(--border-color)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  actionBtnDelete: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--accent-terracotta)',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-charcoal)',
    lineHeight: '1.3',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.45',
  },
  cardDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(27, 75, 90, 0.08)',
    paddingTop: '10px',
    marginTop: '2px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  mapShortcutRow: {
    borderTop: '1px solid rgba(27, 75, 90, 0.05)',
    paddingTop: '8px',
    marginTop: '2px',
  },
  mapBtn: {
    display: 'inline-flex',
    fontSize: '12px',
    color: 'var(--primary-teal)',
    fontWeight: '700',
    textDecoration: 'none',
    backgroundColor: 'var(--primary-teal-soft)',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(27, 75, 90, 0.15)',
  },
  packingCard: {
    padding: '16px',
    marginTop: '10px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  packingHeaderBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  packingHeaderTitle: {
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '0.02em',
  },
  packingSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  packingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '220px',
    overflowY: 'auto',
    border: '1.5px solid var(--border-color)',
    borderRadius: '10px',
    padding: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  packingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(27, 75, 90, 0.06)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  packingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  packingRight: {
    display: 'flex',
    alignItems: 'center',
  },
  checkedAvatars: {
    display: 'flex',
    gap: '-4px',
    position: 'relative',
  },
  packAvatar: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-teal)',
    color: 'var(--bg-sand)',
    fontSize: '9px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #FFFFFF',
    marginLeft: '-4px',
  },
  packForm: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  packInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1.5px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  packSelect: {
    padding: '0 8px',
    border: '1.5px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '12px',
    backgroundColor: '#FFFFFF',
    outline: 'none',
  },
  packSubmitBtn: {
    backgroundColor: 'var(--primary-teal)',
    color: 'var(--bg-sand)',
    border: 'none',
    padding: '0 14px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '50px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '16px',
    border: '1.5px dashed var(--border-color)',
    gap: '12px',
  },
};
