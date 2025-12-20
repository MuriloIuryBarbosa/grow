import { useState, useEffect, useMemo } from 'react';
import { readingsAPI, plantsAPI } from '../services/api';
import { DailySensorAverage, Plant } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '../utils/date.utils';
import '../styles/dashboard.css';

export default function SensorDashboard() {
  const [dailyData, setDailyData] = useState<DailySensorAverage[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar plantas para determinar período
      const plantsData = await plantsAPI.getAll();
      setPlants(plantsData);

      // Calcular período: da planta mais antiga até hoje
      const activePlants = plantsData.filter(p => p.status === 'ativa');
      
      if (activePlants.length > 0) {
        const oldestDate = activePlants.reduce((oldest, plant) => {
          const germinationDate = parseDate(plant.germination_date || plant.planting_date);
          return germinationDate < oldest ? germinationDate : oldest;
        }, parseDate(activePlants[0].germination_date || activePlants[0].planting_date));

        const startDate = format(oldestDate, 'yyyy-MM-dd');
        const endDate = format(new Date(), 'yyyy-MM-dd');
        
        setDateRange({ start: startDate, end: endDate });

        // Buscar médias diárias
        const data = await readingsAPI.getDailyAverages(startDate, endDate);
        setDailyData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar dados por sensor
  const sensorData = useMemo(() => {
    const grouped = new Map<number, DailySensorAverage[]>();
    
    dailyData.forEach(reading => {
      if (!grouped.has(reading.sensor_id)) {
        grouped.set(reading.sensor_id, []);
      }
      grouped.get(reading.sensor_id)!.push(reading);
    });

    return Array.from(grouped.entries()).map(([sensorId, data]) => ({
      sensor_id: sensorId,
      sensor_name: data[0].sensor_name,
      location: data[0].location,
      data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }));
  }, [dailyData]);

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (sensorData.length === 0) return [];

    // Obter todas as datas únicas
    const allDates = new Set<string>();
    sensorData.forEach(sensor => {
      sensor.data.forEach(d => allDates.add(d.date));
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(date => {
      const point: any = { date };
      
      sensorData.forEach(sensor => {
        const reading = sensor.data.find(d => d.date === date);
        if (reading) {
          point[`temp_${sensor.sensor_id}`] = reading.avg_temperature;
          point[`hum_${sensor.sensor_id}`] = reading.avg_humidity;
        }
      });

      return point;
    });
  }, [sensorData]);

  // Calcular limites dos gráficos
  const bounds = useMemo(() => {
    if (dailyData.length === 0) return { temp: { min: 0, max: 40 }, hum: { min: 0, max: 100 } };

    const temps = dailyData.map(d => d.avg_temperature).filter(t => t !== null) as number[];
    const hums = dailyData.map(d => d.avg_humidity).filter(h => h !== null) as number[];

    return {
      temp: {
        min: temps.length > 0 ? Math.floor(Math.min(...temps) - 2) : 0,
        max: temps.length > 0 ? Math.ceil(Math.max(...temps) + 2) : 40,
      },
      hum: {
        min: hums.length > 0 ? Math.floor(Math.min(...hums) - 5) : 0,
        max: hums.length > 0 ? Math.ceil(Math.max(...hums) + 5) : 100,
      },
    };
  }, [dailyData]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>⏳ Carregando dados...</p>
      </div>
    );
  }

  if (plants.filter(p => p.status === 'ativa').length === 0) {
    return (
      <div className="dashboard-empty">
        <p>🌱 Nenhuma planta ativa cadastrada</p>
        <p>Cadastre uma planta para visualizar o dashboard</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="dashboard-empty">
        <p>📊 Nenhuma leitura registrada</p>
        <p>Registre leituras dos sensores para visualizar os gráficos</p>
      </div>
    );
  }

  return (
    <div className="sensor-dashboard">
      <div className="dashboard-header">
        <h2>📊 Dashboard - Monitoramento Ambiental</h2>
        <p className="date-range">
          Período: {format(parseDate(dateRange.start), 'dd/MM/yyyy', { locale: ptBR })} até {format(parseDate(dateRange.end), 'dd/MM/yyyy', { locale: ptBR })}
          {' '}({chartData.length} dias)
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="stats-grid">
        {sensorData.map(sensor => {
          const avgTemp = sensor.data.reduce((sum, d) => sum + (d.avg_temperature || 0), 0) / sensor.data.length;
          const avgHum = sensor.data.reduce((sum, d) => sum + (d.avg_humidity || 0), 0) / sensor.data.length;
          
          return (
            <div key={sensor.sensor_id} className="stat-card">
              <h3>{sensor.sensor_name}</h3>
              <p className="stat-location">{sensor.location}</p>
              <div className="stat-values">
                {avgTemp > 0 && (
                  <div className="stat-value">
                    <span className="value">{avgTemp.toFixed(1)}°C</span>
                    <span className="label">Temp. Média</span>
                  </div>
                )}
                {avgHum > 0 && (
                  <div className="stat-value">
                    <span className="value">{avgHum.toFixed(1)}%</span>
                    <span className="label">Umid. Média</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de Temperatura */}
      <div className="chart-container">
        <h3>🌡️ Evolução da Temperatura</h3>
        <TemperatureChart 
          data={chartData}
          sensors={sensorData}
          bounds={bounds.temp}
        />
      </div>

      {/* Gráfico de Umidade */}
      <div className="chart-container">
        <h3>💧 Evolução da Umidade</h3>
        <HumidityChart 
          data={chartData}
          sensors={sensorData}
          bounds={bounds.hum}
        />
      </div>
    </div>
  );
}

// Componente de Gráfico de Temperatura
function TemperatureChart({ data, sensors, bounds }: any) {
  const width = 1000;
  const height = 400;
  const padding = { top: 20, right: 120, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  const scaleX = (index: number) => {
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const scaleY = (value: number) => {
    const range = bounds.max - bounds.min;
    return padding.top + chartHeight - ((value - bounds.min) / range) * chartHeight;
  };

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {/* Grid horizontal */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + chartHeight * ratio;
        const value = bounds.max - (bounds.max - bounds.min) * ratio;
        return (
          <g key={ratio}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padding.left - 10} y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
              {value.toFixed(1)}°C
            </text>
          </g>
        );
      })}

      {/* Grid vertical (a cada 7 dias) */}
      {data.filter((_: any, i: number) => i % 7 === 0).map((point: any, idx: number) => {
        const x = scaleX(data.indexOf(point));
        return (
          <g key={idx}>
            <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#e5e7eb" strokeWidth="1" />
            <text 
              x={x} 
              y={height - padding.bottom + 20} 
              textAnchor="middle" 
              fontSize="11" 
              fill="#6b7280"
            >
              {format(parseDate(point.date), 'dd/MM')}
            </text>
          </g>
        );
      })}

      {/* Linhas dos sensores */}
      {sensors.map((sensor: any, sensorIdx: number) => {
        const points = data.map((point: any, idx: number) => {
          const value = point[`temp_${sensor.sensor_id}`];
          if (value === undefined || value === null) return null;
          return { x: scaleX(idx), y: scaleY(value) };
        }).filter(Boolean);

        if (points.length === 0) return null;

        const pathData = points.map((p: any, i: number) => 
          `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
        ).join(' ');

        return (
          <g key={sensor.sensor_id}>
            <path
              d={pathData}
              fill="none"
              stroke={colors[sensorIdx % colors.length]}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p: any, i: number) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill={colors[sensorIdx % colors.length]}
              />
            ))}
          </g>
        );
      })}

      {/* Legenda */}
      {sensors.map((sensor: any, idx: number) => (
        <g key={sensor.sensor_id} transform={`translate(${width - padding.right + 10}, ${padding.top + idx * 25})`}>
          <rect x="0" y="-8" width="15" height="15" fill={colors[idx % colors.length]} rx="2" />
          <text x="20" y="4" fontSize="12" fill="#374151">
            {sensor.sensor_name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Componente de Gráfico de Umidade
function HumidityChart({ data, sensors, bounds }: any) {
  const width = 1000;
  const height = 400;
  const padding = { top: 20, right: 120, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const colors = ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

  const scaleX = (index: number) => {
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const scaleY = (value: number) => {
    const range = bounds.max - bounds.min;
    return padding.top + chartHeight - ((value - bounds.min) / range) * chartHeight;
  };

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      {/* Grid horizontal */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + chartHeight * ratio;
        const value = bounds.max - (bounds.max - bounds.min) * ratio;
        return (
          <g key={ratio}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padding.left - 10} y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
              {value.toFixed(1)}%
            </text>
          </g>
        );
      })}

      {/* Grid vertical (a cada 7 dias) */}
      {data.filter((_: any, i: number) => i % 7 === 0).map((point: any, idx: number) => {
        const x = scaleX(data.indexOf(point));
        return (
          <g key={idx}>
            <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#e5e7eb" strokeWidth="1" />
            <text 
              x={x} 
              y={height - padding.bottom + 20} 
              textAnchor="middle" 
              fontSize="11" 
              fill="#6b7280"
            >
              {format(parseDate(point.date), 'dd/MM')}
            </text>
          </g>
        );
      })}

      {/* Linhas dos sensores */}
      {sensors.map((sensor: any, sensorIdx: number) => {
        const points = data.map((point: any, idx: number) => {
          const value = point[`hum_${sensor.sensor_id}`];
          if (value === undefined || value === null) return null;
          return { x: scaleX(idx), y: scaleY(value) };
        }).filter(Boolean);

        if (points.length === 0) return null;

        const pathData = points.map((p: any, i: number) => 
          `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
        ).join(' ');

        return (
          <g key={sensor.sensor_id}>
            <path
              d={pathData}
              fill="none"
              stroke={colors[sensorIdx % colors.length]}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p: any, i: number) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill={colors[sensorIdx % colors.length]}
              />
            ))}
          </g>
        );
      })}

      {/* Legenda */}
      {sensors.map((sensor: any, idx: number) => (
        <g key={sensor.sensor_id} transform={`translate(${width - padding.right + 10}, ${padding.top + idx * 25})`}>
          <rect x="0" y="-8" width="15" height="15" fill={colors[idx % colors.length]} rx="2" />
          <text x="20" y="4" fontSize="12" fill="#374151">
            {sensor.sensor_name}
          </text>
        </g>
      ))}
    </svg>
  );
}
