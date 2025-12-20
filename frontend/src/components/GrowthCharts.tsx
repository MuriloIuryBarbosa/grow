import { DailyRecord, Plant } from '../types';
import { format, differenceInDays, addDays } from 'date-fns';
import { memo, useMemo, useState } from 'react';
import { parseDate } from '../utils/date.utils';

interface GrowthChartsProps {
  records: DailyRecord[];
  plant: Plant;
}

interface DataPoint {
  day: number;
  date: Date;
  formattedDate: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
}

interface PhaseMarker {
  day: number;
  phase: string;
  label: string;
}

// Função para criar curvas suaves usando Catmull-Rom splines
function createSmoothPath(points: Array<{x: number, y: number}>): string {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Pontos de controle para curva suave
    const prev = i > 0 ? points[i - 1] : current;
    const after = i < points.length - 2 ? points[i + 2] : next;
    
    const tension = 0.3;
    const cp1x = current.x + (next.x - prev.x) * tension;
    const cp1y = current.y + (next.y - prev.y) * tension;
    const cp2x = next.x - (after.x - current.x) * tension;
    const cp2y = next.y - (after.y - current.y) * tension;
    
    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }
  
  return path;
}

function GrowthCharts({ records, plant }: GrowthChartsProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: DataPoint } | null>(null);

  const sortedRecords = useMemo(() => 
    [...records].sort((a, b) => 
      parseDate(a.record_date).getTime() - parseDate(b.record_date).getTime()
    ),
    [records]
  );

  // Agrupar registros por dia e calcular médias
  const dailyAverages = useMemo(() => {
    const grouped = new Map<string, DailyRecord[]>();
    
    sortedRecords.forEach(record => {
      const dateKey = record.record_date.split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(record);
    });

    return Array.from(grouped.entries()).map(([date, dayRecords]) => {
      const avg = (values: (number | null | undefined)[]) => {
        const validValues = values.filter(v => v !== null && v !== undefined) as number[];
        return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : undefined;
      };

      return {
        record_date: date,
        plant_size: avg(dayRecords.map(r => r.plant_size)),
        leaf_count: avg(dayRecords.map(r => r.leaf_count)),
        branch_count: avg(dayRecords.map(r => r.branch_count)),
        temperature: avg(dayRecords.map(r => r.temperature)),
        humidity: avg(dayRecords.map(r => r.humidity)),
        ppfd: avg(dayRecords.map(r => r.ppfd)),
        vpd: avg(dayRecords.map(r => r.vpd)),
      };
    });
  }, [sortedRecords]);

  // Calcular dados interpolados desde a germinação
  const chartData = useMemo(() => {
    if (dailyAverages.length === 0 || !plant.germination_date) return [];

    const germinationDate = parseDate(plant.germination_date);
    const lastRecordDate = parseDate(dailyAverages[dailyAverages.length - 1].record_date);
    const totalDays = differenceInDays(lastRecordDate, germinationDate);

    const data: DataPoint[] = [];
    let lastValues = {
      plant_size: undefined as number | undefined,
      leaf_count: undefined as number | undefined,
      branch_count: undefined as number | undefined,
      temperature: undefined as number | undefined,
      humidity: undefined as number | undefined,
      ppfd: undefined as number | undefined,
      vpd: undefined as number | undefined,
    };

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = addDays(germinationDate, day);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Procurar média para este dia
      const dayData = dailyAverages.find(r => r.record_date === dateStr);
      
      if (dayData) {
        // Atualizar últimos valores conhecidos
        if (dayData.plant_size !== undefined) lastValues.plant_size = dayData.plant_size;
        if (dayData.leaf_count !== undefined) lastValues.leaf_count = dayData.leaf_count;
        if (dayData.branch_count !== undefined) lastValues.branch_count = dayData.branch_count;
        if (dayData.temperature !== undefined) lastValues.temperature = dayData.temperature;
        if (dayData.humidity !== undefined) lastValues.humidity = dayData.humidity;
        if (dayData.ppfd !== undefined) lastValues.ppfd = dayData.ppfd;
        if (dayData.vpd !== undefined) lastValues.vpd = dayData.vpd;
      }

      // Adicionar ponto de dados (usando últimos valores conhecidos)
      data.push({
        day,
        date: currentDate,
        formattedDate: format(currentDate, 'dd/MM'),
        ...lastValues
      });
    }

    return data;
  }, [dailyAverages, plant.germination_date]);

  // Calcular marcadores de fase
  const phaseMarkers = useMemo(() => {
    if (!plant.germination_date) return [];
    
    const markers: PhaseMarker[] = [];
    const germinationDate = parseDate(plant.germination_date);
    const today = new Date();
    
    // Adicionar marcador de germinação com duração
    const germinationHistory = plant.phase_history?.find(h => h.phase === 'germinacao');
    let germinationDays = 0;
    if (germinationHistory) {
      germinationDays = germinationHistory.duration_days || 0;
      // Se ainda está na fase de germinação (ended_at é null)
      if (!germinationHistory.ended_at) {
        germinationDays = differenceInDays(today, parseDate(germinationHistory.started_at));
      }
    }
    
    markers.push({
      day: 0,
      phase: 'germinacao',
      label: `🌱 Germinação (${germinationDays} dias)`
    });

    // Adicionar marcadores baseados no histórico de fases
    if (plant.phase_history && plant.phase_history.length > 0) {
      plant.phase_history.forEach(history => {
        const phaseStartDate = parseDate(history.started_at);
        const daysSinceGermination = differenceInDays(phaseStartDate, germinationDate);
        
        // Não adicionar se for germinação (já adicionamos)
        if (history.phase !== 'germinacao' && daysSinceGermination >= 0) {
          // Calcular duração da fase
          let phaseDuration = history.duration_days || 0;
          if (!history.ended_at) {
            // Fase atual ainda em andamento
            phaseDuration = differenceInDays(today, phaseStartDate);
          }
          
          let label = '';
          switch(history.phase) {
            case 'muda':
              label = `🌿 Muda (${phaseDuration} dias)`;
              break;
            case 'vegetacao':
              label = `🌱 Vegetação (${phaseDuration} dias)`;
              break;
            case 'floracao':
              label = `🌸 Floração (${phaseDuration} dias)`;
              break;
          }
          
          markers.push({
            day: daysSinceGermination,
            phase: history.phase,
            label
          });
        }
      });
    }
    
    return markers.sort((a, b) => a.day - b.day);
  }, [plant.germination_date, plant.phase_history?.length, JSON.stringify(plant.phase_history)]);

  const hasPlantData = useMemo(() => 
    chartData.some(d => d.plant_size || d.leaf_count || d.branch_count),
    [chartData]
  );
  
  const hasEnvironmentData = useMemo(() => 
    chartData.some(d => d.temperature || d.humidity || d.ppfd || d.vpd),
    [chartData]
  );

  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
        <p>📊 Sem dados suficientes para gerar gráficos</p>
      </div>
    );
  }

  const maxDay = Math.max(...chartData.map(d => d.day));

  return (
    <div>
      {hasPlantData && (
        <div className="card mb-2">
          <h3 style={{ marginBottom: '1rem' }}>📈 Evolução da Planta</h3>
          
          {/* Gráfico combinado: Tamanho, Folhas e Ramos */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
              Crescimento Geral
            </h4>
            <div style={{ position: 'relative', height: '300px', background: 'var(--bg)', borderRadius: '8px', padding: '1rem' }}>
              {/* Tooltip */}
              {tooltip && (
                <div style={{
                  position: 'absolute',
                  left: tooltip.x + 10,
                  top: tooltip.y - 10,
                  background: 'rgba(0, 0, 0, 0.9)',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  minWidth: '150px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>
                    {tooltip.data.formattedDate}
                  </div>
                  {tooltip.data.plant_size !== undefined && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--primary)' }}>●</span> Tamanho: {tooltip.data.plant_size.toFixed(1)} cm
                    </div>
                  )}
                  {tooltip.data.leaf_count !== undefined && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ color: '#10b981' }}>●</span> Folhas: {Math.round(tooltip.data.leaf_count)}
                    </div>
                  )}
                  {tooltip.data.branch_count !== undefined && (
                    <div>
                      <span style={{ color: '#f59e0b' }}>●</span> Ramos: {Math.round(tooltip.data.branch_count)}
                    </div>
                  )}
                </div>
              )}
              
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 900 250" 
                preserveAspectRatio="none" 
                style={{ overflow: 'visible' }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Eixos */}
                <line x1="60" y1="220" x2="880" y2="220" stroke="var(--border)" strokeWidth="2" />
                <line x1="60" y1="20" x2="60" y2="220" stroke="var(--border)" strokeWidth="2" />
                
                {(() => {
                  const dataWithSize = chartData.filter(d => d.plant_size !== undefined);
                  const dataWithLeaves = chartData.filter(d => d.leaf_count !== undefined);
                  const dataWithBranches = chartData.filter(d => d.branch_count !== undefined);
                  
                  // Encontrar valores máximos e mínimos para normalização
                  const allValues = [
                    ...(dataWithSize.map(d => d.plant_size!)),
                    ...(dataWithLeaves.map(d => d.leaf_count!)),
                    ...(dataWithBranches.map(d => d.branch_count!))
                  ];
                  
                  if (allValues.length === 0) return null;
                  
                  const maxValue = Math.max(...allValues);
                  const minValue = Math.min(...allValues);
                  const valueRange = maxValue - minValue || 1;
                  
                  return (
                    <>
                      {/* Linhas de grade verticais com datas */}
                      {chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 8)) === 0).map(point => {
                        const x = 60 + ((point.day / maxDay) * 820);
                        return (
                          <g key={`grid-${point.day}`}>
                            <line x1={x} y1="20" x2={x} y2="220" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4" opacity="0.2" />
                            <line x1={x} y1="220" x2={x} y2="225" stroke="var(--border)" strokeWidth="2" />
                            <text x={x} y="240" fontSize="11" fill="var(--text)" textAnchor="middle">{point.formattedDate}</text>
                          </g>
                        );
                      })}
                      
                      {/* Marcadores de fase */}
                      {phaseMarkers.map(marker => {
                        const x = 60 + ((marker.day / maxDay) * 820);
                        return (
                          <g key={`phase-${marker.phase}-${marker.day}`}>
                            <line x1={x} y1="20" x2={x} y2="220" stroke="var(--primary)" strokeWidth="2" strokeDasharray="8" opacity="0.5" />
                            <text x={x + 5} y="35" fontSize="12" fill="var(--primary)" fontWeight="bold">{marker.label}</text>
                          </g>
                        );
                      })}
                      
                      {/* Linha de Tamanho */}
                      {dataWithSize.length > 0 && (
                        <>
                          <path
                            d={createSmoothPath(dataWithSize.map(d => ({
                              x: 60 + ((d.day / maxDay) * 820),
                              y: 220 - (((d.plant_size! - minValue) / valueRange) * 180)
                            })))}
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {dailyAverages.filter(r => r.plant_size).map((avg, idx) => {
                            const day = differenceInDays(parseDate(avg.record_date), parseDate(plant.germination_date!));
                            const x = 60 + ((day / maxDay) * 820);
                            const y = 220 - (((avg.plant_size! - minValue) / valueRange) * 180);
                            return (
                              <g key={`size-${idx}`}>
                                <circle cx={x} cy={y} r="4" fill="var(--primary)" />
                              </g>
                            );
                          })}
                        </>
                      )}
                      
                      {/* Linha de Folhas */}
                      {dataWithLeaves.length > 0 && (
                        <>
                          <path
                            d={createSmoothPath(dataWithLeaves.map(d => ({
                              x: 60 + ((d.day / maxDay) * 820),
                              y: 220 - (((d.leaf_count! - minValue) / valueRange) * 180)
                            })))}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {dailyAverages.filter(r => r.leaf_count).map((avg, idx) => {
                            const day = differenceInDays(parseDate(avg.record_date), parseDate(plant.germination_date!));
                            const x = 60 + ((day / maxDay) * 820);
                            const y = 220 - (((avg.leaf_count! - minValue) / valueRange) * 180);
                            return (
                              <g key={`leaf-${idx}`}>
                                <circle cx={x} cy={y} r="4" fill="#10b981" />
                              </g>
                            );
                          })}
                        </>
                      )}
                      
                      {/* Linha de Ramos */}
                      {dataWithBranches.length > 0 && (
                        <>
                          <path
                            d={createSmoothPath(dataWithBranches.map(d => ({
                              x: 60 + ((d.day / maxDay) * 820),
                              y: 220 - (((d.branch_count! - minValue) / valueRange) * 180)
                            })))}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          {dailyAverages.filter(r => r.branch_count).map((avg, idx) => {
                            const day = differenceInDays(parseDate(avg.record_date), parseDate(plant.germination_date!));
                            const x = 60 + ((day / maxDay) * 820);
                            const y = 220 - (((avg.branch_count! - minValue) / valueRange) * 180);
                            return (
                              <g key={`branch-${idx}`}>
                                <circle cx={x} cy={y} r="4" fill="#f59e0b" />
                              </g>
                            );
                          })}
                        </>
                      )}
                      
                      {/* Linhas de grade horizontais com valores */}
                      {[0, 25, 50, 75, 100].map(percent => {
                        const y = 220 - (percent * 2);
                        const value = (minValue + (valueRange * percent / 100)).toFixed(1);
                        return (
                          <g key={percent}>
                            <line x1="60" y1={y} x2="880" y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4" opacity="0.3" />
                            <text x="10" y={y + 4} fontSize="10" fill="var(--text-light)">{value}</text>
                          </g>
                        );
                      })}
                      
                      {/* Áreas invisíveis para hover tooltip */}
                      {chartData.map((point, idx) => {
                        const x = 60 + ((point.day / maxDay) * 820);
                        return (
                          <rect
                            key={`hover-${idx}`}
                            x={x - 10}
                            y={20}
                            width={20}
                            height={200}
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                              if (svgRect) {
                                setTooltip({
                                  x: rect.left - svgRect.left + 10,
                                  y: rect.top - svgRect.top + 100,
                                  data: point
                                });
                              }
                            }}
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              {chartData.some(d => d.plant_size) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '30px', height: '3px', background: 'var(--primary)', borderRadius: '2px' }} />
                  <span style={{ fontSize: '0.875rem' }}>Tamanho (cm)</span>
                </div>
              )}
              {chartData.some(d => d.leaf_count) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '30px', height: '3px', background: '#10b981', borderRadius: '2px' }} />
                  <span style={{ fontSize: '0.875rem' }}>🍃 Folhas</span>
                </div>
              )}
              {chartData.some(d => d.branch_count) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '30px', height: '3px', background: '#f59e0b', borderRadius: '2px' }} />
                  <span style={{ fontSize: '0.875rem' }}>🌿 Ramos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasEnvironmentData && (
        <div className="card mb-2">
          <h3 style={{ marginBottom: '1rem' }}>🌡️ Condições Ambientais</h3>
          
          {/* Temperatura e Umidade */}
          {(chartData.some(d => d.temperature) || chartData.some(d => d.humidity)) && (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
                Temperatura e Umidade
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {dailyAverages.filter(r => r.temperature || r.humidity).map((avg, idx) => {
                  const date = format(parseDate(avg.record_date), 'dd/MM');
                  return (
                    <div key={idx} style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                        {date}
                      </div>
                      {avg.temperature && (
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          🌡️ {avg.temperature.toFixed(1)}°C
                        </div>
                      )}
                      {avg.humidity && (
                        <div style={{ fontSize: '0.875rem' }}>
                          💧 {avg.humidity.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PPFD e VPD */}
          {(dailyAverages.some(r => r.ppfd) || dailyAverages.some(r => r.vpd)) && (
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
                Iluminação e VPD
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {dailyAverages.filter(r => r.ppfd || r.vpd).map((avg, idx) => {
                  const date = format(parseDate(avg.record_date), 'dd/MM');
                  return (
                    <div key={idx} style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                        {date}
                      </div>
                      {avg.ppfd && (
                        <div style={{ marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                          💡 {avg.ppfd.toFixed(0)}
                        </div>
                      )}
                      {avg.vpd && (
                        <div style={{ fontSize: '0.875rem' }}>
                          💨 {avg.vpd.toFixed(2)} kPa
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(GrowthCharts);
