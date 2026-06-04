import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { AttendanceHistoryService, AttendanceGeneralStats, MemberAttendanceStats } from '../../services/attendance-history.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';

// ECharts
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

// Shared Components
import { InstruccionesComponent } from '../shared/instrucciones/instrucciones.component';

@Component({
  selector: 'app-historial-asistencia',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    NgxEchartsDirective,
    InstruccionesComponent
  ],
  templateUrl: './historial-asistencia.component.html',
  styleUrl: './historial-asistencia.component.css'
})
export class HistorialAsistenciaComponent implements OnInit {
  attendanceService = inject(AttendanceHistoryService);
  authService = inject(AuthService);
  tenantService = inject(TenantService);

  // Users for autocomplete
  allUsers = signal<any[]>([]);
  filteredUsers = signal<any[]>([]);
  searchControl = new FormControl<string | any>('');

  // UI state
  selectedUserId = signal<number | null>(null);
  selectedTab = signal<number>(0); // 0 = General, 1 = Por Miembro (on mobile)
  filterType = signal<'todos' | 'clase' | 'evento'>('todos');

  // ECharts Options Signals
  generalChartOptions = signal<EChartsOption>({});
  classesChartOptions = signal<EChartsOption>({});
  eventsChartOptions = signal<EChartsOption>({});

  // Computed state
  loading = computed(() => this.attendanceService.loading());
  generalStats = computed(() => this.attendanceService.generalStats());
  selectedMemberStats = computed(() => this.attendanceService.selectedMemberStats());

  // Filtered individual history list
  filteredHistoryList = computed(() => {
    const stats = this.selectedMemberStats();
    if (!stats) return [];
    const type = this.filterType();
    if (type === 'todos') return stats.history_list;
    return stats.history_list.filter(item => item.type === type);
  });

  constructor() {
    // Listen for theme colors change if the tenant information loads asynchronously
    effect(() => {
      const stats = this.generalStats();
      if (stats) {
        this.buildGeneralChart(stats);
      }
    });

    effect(() => {
      const stats = this.selectedMemberStats();
      if (stats) {
        this.buildMemberCharts(stats);
      }
    });
  }

  ngOnInit() {
    this.attendanceService.clearSelectedMember();
    this.loadGeneralStats();
    this.loadUsers();

    // Autocomplete filtering setup
    this.searchControl.valueChanges.subscribe(value => {
      const filterValue = typeof value === 'string' ? value.toLowerCase() : (value?.name || '').toLowerCase();
      this.filteredUsers.set(
        this.allUsers().filter(u => 
          u.name.toLowerCase().includes(filterValue) || 
          u.email.toLowerCase().includes(filterValue)
        )
      );
    });
  }

  loadGeneralStats() {
    this.attendanceService.fetchGeneralStats().subscribe();
  }

  async loadUsers() {
    try {
      const users = await this.authService.getMinimalUsers();
      // Filter out admins from member stats search
      const membersOnly = users.filter((u: any) => u.role !== 'admin');
      this.allUsers.set(membersOnly);
      this.filteredUsers.set(membersOnly);
    } catch (err) {
      console.error('Error loading users for search autocomplete:', err);
    }
  }

  /**
   * Helper to display user name in search autocomplete input
   */
  displayFn(user: any): string {
    return user && user.name ? user.name : '';
  }

  /**
   * Handler when a member is selected from autocomplete
   */
  onMemberSelected(event: any) {
    const user = event.option.value;
    if (user && user.id) {
      this.selectedUserId.set(user.id);
      this.attendanceService.fetchMemberStats(user.id).subscribe();
      
      // On mobile, automatically switch to the Member tab
      if (window.innerWidth < 960) {
        this.selectedTab.set(1);
      }
    }
  }

  /**
   * Clears currently selected member
   */
  clearMemberSelection() {
    this.selectedUserId.set(null);
    this.searchControl.setValue('');
    this.attendanceService.clearSelectedMember();
    this.classesChartOptions.set({});
    this.eventsChartOptions.set({});
  }

  /**
   * Helper to extract active theme colors from document style
   */
  private getThemeColors() {
    const docStyle = getComputedStyle(document.documentElement);
    const primary = docStyle.getPropertyValue('--primary-color').trim() || '#0073CF';
    const accent = docStyle.getPropertyValue('--accent-color').trim() || '#F6D312';
    return { primary, accent };
  }

  /**
   * Build club general attendance monthly trend chart (ECharts)
   */
  private buildGeneralChart(stats: AttendanceGeneralStats) {
    const colors = this.getThemeColors();
    const months = stats.monthly_trend.map(t => t.month);
    const classesData = stats.monthly_trend.map(t => t.classes);
    const eventsData = stats.monthly_trend.map(t => t.events);

    const option: EChartsOption = {
      color: [colors.primary, colors.accent],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        top: '0',
        data: ['Clases', 'Eventos'],
        textStyle: {
          color: '#334155',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      },
      grid: {
        top: '40px',
        left: '3%',
        right: '4%',
        bottom: '5%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: months,
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          axisLabel: { color: '#64748b' }
        }
      ],
      yAxis: [
        {
          type: 'value',
          splitLine: { lineStyle: { color: '#f1f5f9' } },
          axisLabel: { color: '#64748b' }
        }
      ],
      series: [
        {
          name: 'Clases',
          type: 'bar',
          barGap: 0,
          emphasis: { focus: 'series' },
          data: classesData,
          itemStyle: { borderRadius: [4, 4, 0, 0] }
        },
        {
          name: 'Eventos',
          type: 'bar',
          emphasis: { focus: 'series' },
          data: eventsData,
          itemStyle: { borderRadius: [4, 4, 0, 0] }
        }
      ]
    };

    this.generalChartOptions.set(option);
  }

  /**
   * Build member-specific doughnut charts (ECharts)
   */
  private buildMemberCharts(stats: MemberAttendanceStats) {
    const colors = this.getThemeColors();
    const summary = stats.summary;

    const buildDoughnut = (title: string, attended: number, possible: number, color: string): EChartsOption => {
      const missed = possible - attended;
      const pct = possible > 0 ? Math.round((attended / possible) * 100) : 100;

      return {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)'
        },
        series: [
          {
            type: 'pie',
            radius: ['60%', '80%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            label: {
              show: true,
              position: 'center',
              formatter: `${pct}%`,
              fontSize: 22,
              fontWeight: 'bold',
              color: '#1e293b'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 24,
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: [
              { value: attended, name: 'Asistidos', itemStyle: { color } },
              { value: missed, name: 'Ausentes', itemStyle: { color: '#cbd5e1' } }
            ]
          }
        ]
      };
    };

    this.classesChartOptions.set(
      buildDoughnut('Clases', summary.total_classes_attended, summary.total_classes_possible, colors.primary)
    );
    this.eventsChartOptions.set(
      buildDoughnut('Eventos', summary.total_events_attended, summary.total_events_possible, colors.accent)
    );
  }
}
