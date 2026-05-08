import { TestBed } from '@angular/core/testing';
import { GestionarMiembrosComponent } from './gestionar-miembros';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../../services/tenant.service';
import { signal, EnvironmentInjector, runInInjectionContext } from '@angular/core';

describe('GestionarMiembrosComponent', () => {
  let component: GestionarMiembrosComponent;
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
      generateResetLink: vi.fn().mockResolvedValue({ link: 'http://test-link.com' }),
      updateUserRole: vi.fn().mockResolvedValue({}),
      deleteUser: vi.fn().mockResolvedValue({}),
      isAdmin: vi.fn().mockReturnValue(true),
      isManager: vi.fn().mockReturnValue(true)
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    mockTenantService = {
      tenantInfo: signal({ name: 'Test Club' })
    };

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    // Mock confirm
    window.confirm = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastService, useValue: mockToastService },
        { provide: TenantService, useValue: mockTenantService }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    runInInjectionContext(injector, () => {
      component = new GestionarMiembrosComponent();
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

  it('should filter out admin users in displayUsers', async () => {
    await component.ngOnInit();

    const displayed = component.displayUsers();
    expect(displayed.length).toBe(2);
    expect(displayed.find(u => u.role === 'admin')).toBeUndefined();
    expect(displayed.find(u => u.role === 'staff')).toBeDefined();
  });

  it('should generate a reset link and copy to clipboard', async () => {
    await component.ngOnInit();

    const user = mockUsers[2];
    await component.generateResetLink(user);

    expect(window.confirm).toHaveBeenCalledWith(`¿Generar enlace de recuperación para ${user.displayName}?`);
    expect(mockAuthService.generateResetLink).toHaveBeenCalledWith(user.uid);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://test-link.com');
    expect(mockToastService.success).toHaveBeenCalledWith('Enlace de recuperación copiado al portapapeles');
  });

  it('should update user role and show success toast', async () => {
    await component.ngOnInit();

    const user = mockUsers[2]; // Currently 'user'
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

  it('should open and close delete modal', () => {
    const user = mockUsers[2];
    component.openDeleteModal(user);
    
    expect(component.userToDelete()).toEqual(user);
    expect(document.body.style.overflow).toBe('hidden');

    component.closeDeleteModal();
    
    expect(component.userToDelete()).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should delete user and update state', async () => {
    await component.ngOnInit();

    const user = mockUsers[2];
    component.openDeleteModal(user);
    
    await component.confirmDelete();

    expect(mockAuthService.deleteUser).toHaveBeenCalledWith(user.id);
    expect(component.users().find(u => u.uid === user.uid)).toBeUndefined();
    expect(component.userToDelete()).toBeNull();
    expect(mockToastService.success).toHaveBeenCalledWith(`Usuario ${user.displayName} y sus perros han sido eliminados correctamente`);
  });

  it('should handle error when deleting user', async () => {
    await component.ngOnInit();

    mockAuthService.deleteUser.mockRejectedValueOnce({ error: { message: 'No se puede eliminar al usuario' } });
    
    const user = mockUsers[2];
    component.openDeleteModal(user);
    
    await component.confirmDelete();

    expect(mockToastService.error).toHaveBeenCalledWith('No se puede eliminar al usuario');
    expect(component.isDeleting()).toBe(false);
  });

  it('should open and close image zoom modal', () => {
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
