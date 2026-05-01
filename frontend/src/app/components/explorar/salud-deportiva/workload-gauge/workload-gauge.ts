import { Component, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

import { AcwrData } from '../../../../models/dog-workload.model';

@Component({
  selector: 'app-workload-gauge',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './workload-gauge.html',
  styleUrls: ['./workload-gauge.css']
})
export class WorkloadGaugeComponent {
  acwrData = input.required<AcwrData>();
  dogName = input<string>('Tu compañero');
  transparentMode = input<boolean>(false);
  chartOptions = signal<EChartsOption>({});
  
  rotation: number = 0;
  statusText: string = 'ÓPTIMO';
  statusClass: string = 'text-success';
  statusDescription: string = 'Carga equilibrada.';
  confidenceText: string = '';
  confidenceClass: string = '';
  
  yellowAngle: number = 117;
  redAngle: number = 135;

  constructor() {
    effect(() => {
      this.calculateGauge(this.acwrData(), this.dogName());
    });
  }

  calculateGauge(data: AcwrData, name: string) {
    if (!data) return;
    
    const maxVal = 2.0;
    const yThresh = data.yellow_threshold || 1.30;
    const rThresh = data.red_threshold || 1.50;
    
    // Configuramos los cortes del velocímetro en porcentajes del maxVal (0.0 al 1.0)
    // Amarillo bajante: 0 a 0.8
    const underPreparedEnd = 0.8 / maxVal;
    // Verde óptimo: 0.8 a yThresh (normalmente 1.3)
    const optimalEnd = yThresh / maxVal;
    // Naranja sobreesfuerzo: yThresh a rThresh (1.3 a 1.5)
    const cautionEnd = rThresh / maxVal;
    // Fases de maduración biológica
    const days = data.calibration_days || 0;
    const isPhase1 = days < 14; 
    const isPhase2 = days >= 14 && days < 28;
    const isPhase3 = days >= 28;
    
    if (isPhase1) {
       this.confidenceText = 'Fiabilidad: Baja';
       this.confidenceClass = 'badge-calibrating';
    } else if (isPhase2) {
       this.confidenceText = 'Fiabilidad: Media';
       this.confidenceClass = 'badge-maturing';
    } else {
       this.confidenceText = 'Fiabilidad: Alta';
       this.confidenceClass = 'badge-gold';
    }
    
    // Scale colors: Fog of war (Phase 1) vs Full Color (Phase 2 & 3)
    let activeColors;
    if (isPhase1) {
      activeColors = [
        [underPreparedEnd, '#e2e8f0'], // Azul grisáceo pálido
        [optimalEnd, '#cbd5e1'],       // Slate claro
        [cautionEnd, '#94a3b8'],       // Slate medio
        [1, '#64748b']                 // Slate oscuro
      ];
    } else {
      activeColors = [
        [underPreparedEnd, '#3b82f6'], // Zona baja (Azul frío)
        [optimalEnd, '#10b981'],       // Zona óptima (Verde)
        [cautionEnd, '#f97316'],       // Zona precaución (Naranja)
        [1, '#ef4444']                 // Zona Peligro (Rojo)
      ];
    }
    
    // Explicit color for the text so 1.3 (which technically falls into orange logic) is orange, not green
    let valueColor = '#64748b';
    if (!isPhase1) {
      if (data.acwr < 0.8) valueColor = '#3b82f6';
      else if (data.acwr < yThresh) valueColor = '#10b981';
      else if (data.acwr < rThresh) valueColor = '#f97316';
      else valueColor = '#ef4444';
    }
    
    const currentRatio = Math.min(1, data.acwr / maxVal);
    const trackColor = this.transparentMode() ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';

    let dynamicColors: any[] = [];
    if (!isPhase1) {
      if (currentRatio > 0) {
        if (currentRatio <= underPreparedEnd) {
          dynamicColors.push([currentRatio, '#3b82f6']);
        } else {
          dynamicColors.push([underPreparedEnd, '#3b82f6']);
          if (currentRatio <= optimalEnd) {
            dynamicColors.push([currentRatio, '#10b981']);
          } else {
            dynamicColors.push([optimalEnd, '#10b981']);
            if (currentRatio <= cautionEnd) {
              dynamicColors.push([currentRatio, '#f97316']);
            } else {
              dynamicColors.push([cautionEnd, '#f97316']);
              dynamicColors.push([currentRatio, '#ef4444']);
            }
          }
        }
      }
      if (currentRatio < 1) {
        dynamicColors.push([1, trackColor]);
      }
    } else {
      if (currentRatio > 0) {
        if (currentRatio <= underPreparedEnd) {
          dynamicColors.push([currentRatio, '#cbd5e1']);
        } else {
          dynamicColors.push([underPreparedEnd, '#cbd5e1']);
          if (currentRatio <= optimalEnd) {
            dynamicColors.push([currentRatio, '#94a3b8']);
          } else {
            dynamicColors.push([optimalEnd, '#94a3b8']);
            if (currentRatio <= cautionEnd) {
              dynamicColors.push([currentRatio, '#64748b']);
            } else {
              dynamicColors.push([cautionEnd, '#64748b']);
              dynamicColors.push([currentRatio, '#475569']);
            }
          }
        }
      }
      if (currentRatio < 1) {
        dynamicColors.push([1, trackColor]);
      }
    }

    this.chartOptions.set({
      series: [
        {
          type: 'gauge',
          min: 0,
          max: maxVal,
          startAngle: 180,
          endAngle: 0,
          radius: '125%', // Un punto medio perfecto
          center: ['50%', '80%'], // Lo mantenemos en 80% para tener buen margen superior
          splitNumber: 10,
          progress: {
            show: false // No anillo continuo
          },
          axisLine: {
            show: true,
            lineStyle: {
              width: 0, // Pista invisible, solo usamos su mapa de colores
              color: dynamicColors,
            }
          },
          pointer: {
            show: false
          },
          anchor: {
            show: false
          },
          axisTick: {
            show: true,
            splitNumber: 4,
            distance: 0,
            length: 28, // Píldoras un poco más cortas pero más "gorditas"
            lineStyle: {
              width: 6, // Más grosor para efecto LED
              color: 'auto',
              cap: 'round'
            }
          },
          splitLine: {
            show: true,
            distance: 0,
            length: 28,
            lineStyle: {
              width: 6,
              color: 'auto',
              cap: 'round'
            }
          },
          axisLabel: {
            show: false
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}',
            color: valueColor, 
            fontSize: 44, // Un poco más pequeño para mayor elegancia
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            offsetCenter: [0, '-10%'] // Reajustamos altura al ser más pequeño
          },
          data: [
            {
              value: data.acwr,
              name: '',
              title: {
                show: false
              }
            }
          ]
        }
      ]
    });

    if (isPhase1) {
      const remaining = Math.ceil(Math.max(0, 14 - days));
      this.statusText = '🔬 FASE DE CALIBRACIÓN';
      this.statusClass = 'text-calibrating';
      this.statusDescription = `La brújula está aprendiendo el metabolismo de ${name}. Registra entrenamientos durante ${remaining} días más para establecer su perfil base y desbloquear la telemetría a color.`;
    } else {
      if (data.acwr < 0.8) {
        this.statusText = '🧊 SUB-PREPARACIÓN';
        this.statusClass = 'text-info';
        this.statusDescription = `Carga crónica baja detectada. Estadísticamente hay una desadaptación al esfuerzo físico intenso.`;
      } else if (data.acwr < yThresh) {
        this.statusText = '✅ ZONA ÓPTIMA';
        this.statusClass = 'text-success';
        this.statusDescription = `La carga de trabajo se encuentra dentro de los márgenes estadísticos de mantenimiento óptimo.`;
      } else if (data.acwr < rThresh) {
         this.statusText = '⚠️ ZONA DE FATIGA';
         this.statusClass = 'text-warning';
         if (yThresh < 1.3) {
             this.statusDescription = `El historial clínico de ${name} indica una tolerancia reducida a este nivel de carga.`;
         } else {
             this.statusDescription = `Incremento inusual de fatiga detectado respecto al histórico de las últimas 4 semanas.`;
         }
      } else {
        this.statusText = '🚨 RIESGO ALTO DE LESIÓN';
        this.statusClass = 'text-danger';
        this.statusDescription = `Pico de sobrecarga aguda. El ratio de esfuerzo supera drásticamente el margen normal de adaptación.`;
      }
    }
  }
}
