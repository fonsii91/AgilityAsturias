import { TestBed } from '@angular/core/testing';
import { AdminUsuariosComponent } from './admin-usuarios';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../../services/tenant.service';
import { signal, EnvironmentInjector, runInInjectionContext } from '@angular/core';

describe('AdminUsuariosComponent', () => {
  let component: AdminUsuariosComponent;
  let mockAuthService: any;
  let mockToastService: any;
  let mockTenantService: any;

  const mockUsers: UserProfile[] = [
    { id: 1, uid: 1, name: 'Admin User', displayName: 'Admin User', email: 'admin@test.com', role: 'admin' },
    { id: 2, uid: 2, name: 'Staff User', displayName: 'Staff User', email: 'staff@test.com', role: 'staff' },
    { id: 3, uid: 3, name: 'Normal User', displayName: 'Normal User', email: 'user@test.com', role: 'user' },
  ];

  beforeEach(() => {
    mockAuthService = {
      getAllUsers: vi.fn().mockResolvedValue(mockUsers),
      updateUserRole: vi.fn().mockResolvedValue({})
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockTenantService = {
      tenantInfo: signal({ name: 'Test Club' })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: TenantService, useValue: mockTenantService }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    runInInjectionContext(injector, () => {
      component = new AdminUsuariosComponent();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and load users on init', async () => {
    expect(component).toBeTruthy();
    
    await component.ngOnInit();
    
    expect(mockAuthService.getAllUsers).toHaveBeenCalled();
    expect(component.users().length).toBe(3);
    expect(component.loading()).toBe(false);
  });

  it('should handle error when loading users on init', async () => {
    mockAuthService.getAllUsers.mockRejectedValueOnce(new Error('Fetch failed'));
    
    await component.ngOnInit();
    
    expect(mockAuthService.getAllUsers).toHaveBeenCalled();
    expect(mockToastService.error).toHaveBeenCalledWith('Error al cargar usuarios');
    expect(component.loading()).toBe(false);
  });

  it('should not update role if role is the same', async () => {
    await component.ngOnInit();
    
    const user = mockUsers[0]; // role is 'admin'
    await component.updateRole(user, 'admin');

    expect(mockAuthService.updateUserRole).not.toHaveBeenCalled();
  });

  it('should update user role and show success toast', async () => {
    await component.ngOnInit();

    const user = mockUsers[2]; // role is 'user'
    await component.updateRole(user, 'member');

    expect(mockAuthService.updateUserRole).toHaveBeenCalledWith(user.id, 'member');
    expect(component.users().find(u => u.uid === user.uid)?.role).toBe('member');
    expect(mockToastService.success).toHaveBeenCalledWith(`Rol de ${user.displayName} actualizado a Miembro`);
  });

  it('should handle error when updating user role', async () => {
    await component.ngOnInit();

    mockAuthService.updateUserRole.mockRejectedValueOnce({ error: { message: 'Rol inválido' } });
    
    const user = mockUsers[2];
    await component.updateRole(user, 'member');

    expect(mockToastService.error).toHaveBeenCalledWith('Rol inválido');
  });

  it('should handle generic error without message when updating user role', async () => {
    await component.ngOnInit();

    mockAuthService.updateUserRole.mockRejectedValueOnce(new Error('Unknown error'));
    
    const user = mockUsers[2];
    await component.updateRole(user, 'member');

    expect(mockToastService.error).toHaveBeenCalledWith('Error al actualizar rol');
  });

  it('should open and close image zoom modal', () => {
    // Attempt to open without URL
    component.openImageZoom(null);
    expect(component.isZoomModalOpen).toBe(false);

    component.openImageZoom('http://test.com/image.jpg');
    
    expect(component.zoomedImageURL).toBe('http://test.com/image.jpg');
    expect(component.isZoomModalOpen).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    component.closeImageZoom();
    
    expect(component.zoomedImageURL).toBeNull();
    expect(component.isZoomModalOpen).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
  });
});
