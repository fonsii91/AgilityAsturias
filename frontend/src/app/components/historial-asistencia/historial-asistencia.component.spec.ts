import { TestBed } from '@angular/core/testing';
import { HistorialAsistenciaComponent } from './historial-asistencia.component';
import { AttendanceHistoryService } from '../../services/attendance-history.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi, beforeAll } from 'vitest';

describe('HistorialAsistenciaComponent', () => {
  let attendanceHistoryServiceMock: any;
  let authServiceMock: any;
  let tenantServiceMock: any;

  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  });

  beforeEach(async () => {
    attendanceHistoryServiceMock = {
      loading: vi.fn().mockReturnValue(false),
      generalStats: vi.fn().mockReturnValue({
        total_members: 10,
        global_attendance_rate: 80,
        classes_attendance_count: 50,
        events_attendance_count: 10,
        monthly_trend: [
          { month: 'Ene 26', classes: 20, events: 5 },
          { month: 'Feb 26', classes: 30, events: 5 }
        ]
      }),
      selectedMemberStats: vi.fn().mockReturnValue(null),
      fetchGeneralStats: vi.fn().mockReturnValue(of({
        total_members: 10,
        global_attendance_rate: 80,
        classes_attendance_count: 50,
        events_attendance_count: 10,
        monthly_trend: [
          { month: 'Ene 26', classes: 20, events: 5 },
          { month: 'Feb 26', classes: 30, events: 5 }
        ]
      })),
      fetchMemberStats: vi.fn().mockReturnValue(of({
        member_info: { id: 1, name: 'Socio Test', email: 'test@club.com', dogs: [] },
        summary: {
          total_classes_attended: 5,
          total_classes_possible: 10,
          attendance_rate_classes: 50,
          total_events_attended: 2,
          total_events_possible: 2,
          attendance_rate_events: 100
        },
        history_list: []
      })),
      clearSelectedMember: vi.fn()
    };

    authServiceMock = {
      getMinimalUsers: vi.fn().mockResolvedValue([
        { id: 1, name: 'Socio Test', email: 'test@club.com', role: 'member' },
        { id: 2, name: 'Admin Test', email: 'admin@club.com', role: 'admin' }
      ]),
      isStaff: vi.fn().mockReturnValue(true),
      currentUserSignal: vi.fn().mockReturnValue({ id: 1, name: 'Socio Test', role: 'member' }),
      isLoading: vi.fn().mockReturnValue(false)
    };

    tenantServiceMock = {
      tenantInfo: vi.fn().mockReturnValue({ name: 'Club Test' }),
      isTenantLoading: vi.fn().mockReturnValue(false),
      getTenantSlug: vi.fn().mockReturnValue('club-test')
    };

    TestBed.configureTestingModule({
      imports: [HistorialAsistenciaComponent],
      providers: [
        { provide: AttendanceHistoryService, useValue: attendanceHistoryServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: TenantService, useValue: tenantServiceMock },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimations()
      ]
    });
    await TestBed.compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(HistorialAsistenciaComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load general stats and users list on init', async () => {
    const fixture = TestBed.createComponent(HistorialAsistenciaComponent);
    const component = fixture.componentInstance;
    
    component.ngOnInit();
    
    expect(attendanceHistoryServiceMock.fetchGeneralStats).toHaveBeenCalled();
    expect(attendanceHistoryServiceMock.clearSelectedMember).toHaveBeenCalled();
    
    // Wait for the async users retrieval
    await fixture.whenStable();
    
    expect(authServiceMock.getMinimalUsers).toHaveBeenCalled();
    // Verify that admin user is filtered out of allUsers
    expect(component.allUsers().length).toBe(1);
    expect(component.allUsers()[0].role).toBe('member');
  });

  it('should fetch member stats when autocomplete option is selected', () => {
    const fixture = TestBed.createComponent(HistorialAsistenciaComponent);
    const component = fixture.componentInstance;
    
    const mockSelectEvent = {
      option: {
        value: { id: 1, name: 'Socio Test', email: 'test@club.com' }
      }
    };
    
    component.onMemberSelected(mockSelectEvent);
    
    expect(component.selectedUserId()).toBe(1);
    expect(attendanceHistoryServiceMock.fetchMemberStats).toHaveBeenCalledWith(1);
  });
});
