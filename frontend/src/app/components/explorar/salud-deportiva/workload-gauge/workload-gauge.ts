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
    
    this.chartOptions.set({
      series: [
        {
          type: 'gauge',
          min: 0,
          max: maxVal,
          startAngle: 180,
          endAngle: 0,
          radius: '100%',
          center: ['50%', '70%'], // Baja el centro porque es un medio círculo
          axisLine: {
            lineStyle: {
              width: 25,
              color: activeColors as any
            }
          },
          pointer: {
            itemStyle: {
              color: '#334155' // Slate 700 aguja
            },
            length: '50%',
            width: 6
          },
          axisTick: {
            distance: -25,
            length: 8,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          splitLine: {
            distance: -25,
            length: 25,
            lineStyle: {
              color: '#fff',
              width: 3
            }
          },
          axisLabel: {
            color: 'inherit',
            distance: 35,
            fontSize: 12,
            formatter: (value: number) => {
              if (value === 0.8 || value === Number(yThresh.toFixed(1)) || value === Number(rThresh.toFixed(1))) {
                return value.toFixed(1);
              }
              return '';
            }
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}',
            color: valueColor,
            fontSize: 34,
            fontWeight: 'bold',
            align: 'center',
            offsetCenter: [0, '25%'] // Centrado exacto debajo de la aguja sin el título estorbando
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
