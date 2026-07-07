import { Routes, ResolveFn } from '@angular/router';
import { environment } from '../environments/environment';

import { inject } from '@angular/core';
import { TenantService } from './services/tenant.service';

const titleResolver: ResolveFn<string> = (route, state) => {
    const tenantService = inject(TenantService);
    const clubName = tenantService.tenantInfo()?.name || 'Club Agility';
    return `${route.data?.['pageTitle']} | ${clubName}`;
};

import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { staffGuard } from './guards/staff.guard';
import { adminGuard } from './guards/admin.guard';
import { memberGuard } from './guards/member.guard';
import { managerGuard } from './guards/manager.guard';
import { featureGuard } from './guards/feature.guard';
import { gamificationGuard } from './guards/gamification.guard';
import { provisionFondosGuard } from './guards/provision-fondos.guard';
import { ligaNorteGuard } from './guards/liga-norte.guard';
import { subscriptionActiveGuard } from './guards/subscription-active.guard';

export const routes: Routes = [
    // ==========================================
    // Rutas Públicas (Sin validación de suscripción)
    // ==========================================
    {
        path: '',
        component: HomeComponent,
        canActivate: [subscriptionActiveGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'login',
        component: LoginComponent,
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'register',
        loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./components/reset-password/reset-password').then(m => m.ResetPasswordComponent),
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./components/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent),
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'contacto',
        loadComponent: () => import('./components/contacto/contacto.component').then(m => m.ContactoComponent),
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'galeria',
        loadComponent: () => import('./components/galeria/galeria.component').then(m => m.GaleriaComponent),
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'videos-publicos',
        loadComponent: () => import('./components/galeria-videos-publica/galeria-videos-publica.component').then(m => m.GaleriaVideosPublicaComponent),
        canActivate: [featureGuard('galeria-videos')],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'patrocinadores',
        loadComponent: () => import('./components/patrocinadores/patrocinadores').then(m => m.PatrocinadoresComponent),
        title: titleResolver, data: { pageTitle: 'Patrocinadores' }
    },

    // ==========================================
    // Rutas de Control de Suspensión y Facturación
    // ==========================================
    {
        path: 'suscripcion-suspendida',
        loadComponent: () => import('./components/subscription-suspended/subscription-suspended').then(m => m.SubscriptionSuspendedComponent),
        canActivate: [authGuard, subscriptionActiveGuard],
        title: titleResolver, data: { pageTitle: 'Servicio Suspendido' }
    },
    {
        path: 'configuracion/facturacion',
        loadComponent: () => import('./components/gestor/facturacion/facturacion').then(m => m.FacturacionComponent),
        canActivate: [managerGuard, subscriptionActiveGuard],
        title: titleResolver, data: { pageTitle: 'Suscripción y Facturación' }
    },
    {
        path: 'configuracion/modulos',
        loadComponent: () => import('./components/gestor/funcionalidades/funcionalidades.component').then(m => m.FuncionalidadesClubComponent),
        canActivate: [managerGuard, subscriptionActiveGuard],
        title: titleResolver, data: { pageTitle: 'Funcionalidades del club' }
    },

    // ==========================================
    // Rutas Protegidas por Suscripción Activa
    // ==========================================
    {
        path: '',
        canActivate: [subscriptionActiveGuard],
        children: [
            {
                path: 'admin/clubs',
                loadComponent: () => import('./components/admin/clubs-list.component').then(m => m.ClubsListComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Gestión de Clubes' }
            },
            {
                path: 'admin/clubs/new',
                loadComponent: () => import('./components/admin/club-form/club-form.component').then(m => m.ClubFormComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Nuevo Club' }
            },
            {
                path: 'admin/clubs/edit/:id',
                loadComponent: () => import('./components/admin/club-form/club-form.component').then(m => m.ClubFormComponent),
                canActivate: [managerGuard],
                title: titleResolver, data: { pageTitle: 'Editar Club' }
            },
            {
                path: 'admin/temporadas',
                loadComponent: () => import('./components/admin/seasons-list/seasons-list.component').then(m => m.SeasonsListComponent),
                canActivate: [managerGuard, gamificationGuard],
                title: titleResolver, data: { pageTitle: 'Gestión de Temporadas' }
            },
            {
                path: 'admin/temporadas/nueva',
                loadComponent: () => import('./components/admin/season-form/season-form.component').then(m => m.SeasonFormComponent),
                canActivate: [managerGuard, gamificationGuard],
                title: titleResolver, data: { pageTitle: 'Nueva Temporada' }
            },
            {
                path: 'gestor/landing-page',
                loadComponent: () => import('./components/gestor/landing-page-request/landing-page-request.component').then(m => m.LandingPageRequestComponent),
                canActivate: [managerGuard],
                title: titleResolver, data: { pageTitle: 'Diseño Página Bienvenida' }
            },
            {
                path: 'reservas',
                loadComponent: () => import('./reservas/gestionar-reservas/gestionar-reservas.component').then(m => m.GestionarReservasComponent),
                canActivate: [memberGuard, featureGuard('reservas-pistas')],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'calendario',
                loadComponent: () => import('./components/calendario/calendario.component').then(m => m.CalendarioComponent),
                canActivate: [memberGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'admin/sugerencias',
                loadComponent: () => import('./components/admin-sugerencias/admin-sugerencias').then(m => m.AdminSugerencias),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'admin/videos',
                loadComponent: () => import('./components/admin-videos-stats/admin-videos-stats.component').then(m => m.AdminVideosStatsComponent),
                canActivate: [adminGuard, featureGuard('galeria-videos')],
                title: titleResolver, data: { pageTitle: 'Estadísticas de Vídeos' }
            },
            {
                path: 'admin/salud-monitor',
                loadComponent: () => import('./components/admin-salud-monitor/admin-salud-monitor').then(m => m.AdminSaludMonitorComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Monitor ACWR' }
            },
            {
                path: 'admin/rsce-monitor',
                loadComponent: () => import('./components/admin-rsce-monitor/admin-rsce-monitor').then(m => m.AdminRsceMonitorComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Monitor RSCE' }
            },
            {
                path: 'admin/scraper-monitor',
                loadComponent: () => import('./components/admin-scraper-monitor/admin-scraper-monitor').then(m => m.AdminScraperMonitorComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Monitor de Scraping' }
            },
            {
                path: 'admin/liga-norte',
                loadComponent: () => import('./components/admin-liga-norte/admin-liga-norte').then(m => m.AdminLigaNorteComponent),
                canActivate: [staffGuard, ligaNorteGuard],
                title: titleResolver, data: { pageTitle: 'Administrar Liga Norte' }
            },
            {
                path: 'admin/avatares',
                loadComponent: () => import('./components/admin-avatares/admin-avatares').then(m => m.AdminAvataresComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Gestión Avatares IA' }
            },
            {
                path: 'admin/onboarding-monitor',
                loadComponent: () => import('./components/admin-onboarding-monitor/admin-onboarding-monitor').then(m => m.AdminOnboardingMonitorComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Monitor de Onboarding' }
            },
            {
                path: 'admin/suscripciones',
                loadComponent: () => import('./components/admin-suscripciones/admin-suscripciones').then(m => m.AdminSuscripcionesComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: 'Planes y Funcionalidades' }
            },
            {
                path: 'gestionar-horarios',
                loadComponent: () => import('./reservas/gestionar-horarios/gestionar-horarios.component').then(m => m.GestionarHorariosComponent),
                canActivate: [staffGuard, featureGuard('reservas-pistas')],
                title: titleResolver, data: { pageTitle: 'Gestión de Horarios' }
            },
            {
                path: 'gestionar-pistas',
                loadComponent: () => import('./reservas/gestionar-pistas/gestionar-pistas.component').then(m => m.GestionarPistasComponent),
                canActivate: [managerGuard, featureGuard('reservas-pistas')],
                title: titleResolver, data: { pageTitle: 'Pistas de Entrenamiento' }
            },
            {
                path: 'gestionar-competiciones',
                loadComponent: () => import('./components/crud-competicion/crud-competicion.component').then(m => m.CrudCompeticionComponent),
                canActivate: [staffGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'tablon-anuncios',
                loadComponent: () => import('./components/tablon-anuncios/tablon-anuncios.component').then(m => m.TablonAnunciosComponent),
                canActivate: [memberGuard],
                title: titleResolver, data: { pageTitle: 'Tablón de Anuncios' }
            },
            {
                path: 'tablon-anuncios/redactar',
                loadComponent: () => import('./components/tablon-anuncios/crear-anuncio/crear-anuncio.component').then(m => m.CrearAnuncioComponent),
                canActivate: [staffGuard],
                title: titleResolver, data: { pageTitle: 'Redactar Anuncio' }
            },
            {
                path: 'gestionar-miembros',
                loadComponent: () => import('./components/gestionar-miembros/gestionar-miembros').then(m => m.GestionarMiembrosComponent),
                canActivate: [staffGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'info-reservas',
                loadComponent: () => import('./components/info-reservas/info-reservas.component').then(m => m.InfoReservasComponent),
                canActivate: [staffGuard, featureGuard('reservas-pistas')],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'perfil',
                loadComponent: () => import('./components/perfil/perfil').then(m => m.Perfil),
                canActivate: [authGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'gestionar-perros',
                canActivate: [memberGuard],
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./components/gestionar-perros').then(m => m.DogListComponent),
                        title: titleResolver, data: { pageTitle: 'Mi Manada' }
                    },
                    {
                        path: 'nuevo',
                        loadComponent: () => import('./components/gestionar-perros').then(m => m.DogFormComponent),
                        title: titleResolver, data: { pageTitle: 'Nuevo Perro' }
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./components/gestionar-perros').then(m => m.DogDashboardComponent),
                        title: titleResolver, data: { pageTitle: 'Perfil del Perro' },
                        children: [
                            { path: '', redirectTo: 'resumen', pathMatch: 'full' },
                            { path: 'resumen', loadComponent: () => import('./components/gestionar-perros').then(m => m.DogSummaryComponent) },
                            { path: 'entrenamiento', loadComponent: () => import('./components/gestionar-perros').then(m => m.DogTrainingComponent) },
                            // Pestaña "Salud" retirada por ahora (solo placeholder). El componente
                            // DogHealthComponent se conserva para reactivarla cuando tenga contenido.
                            { path: 'documentacion', loadComponent: () => import('./components/gestionar-perros').then(m => m.DogDocsComponent) },
                            { path: 'familia', loadComponent: () => import('./components/gestionar-perros').then(m => m.DogFamilyComponent) },
                            { path: 'ajustes', loadComponent: () => import('./components/gestionar-perros').then(m => m.DogSettingsComponent) }
                        ]
                    }
                ]
            },
            {
                path: 'admin/usuarios',
                loadComponent: () => import('./components/admin-usuarios/admin-usuarios').then(m => m.AdminUsuariosComponent),
                canActivate: [adminGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'admin/patrocinadores',
                loadComponent: () => import('./components/patrocinadores/crud-patrocinadores').then(m => m.CrudPatrocinadoresComponent),
                canActivate: [staffGuard],
                title: titleResolver, data: { pageTitle: 'Gestionar Patrocinadores' }
            },
            {
                path: 'ranking',
                loadComponent: () => import('./components/ranking/ranking.component').then(m => m.RankingComponent),
                canActivate: [memberGuard, gamificationGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'admin/asistencia',
                loadComponent: () => import('./components/attendance-verification/attendance-verification.component').then(m => m.AttendanceVerificationComponent),
                canActivate: [staffGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'staff/historial-asistencia',
                loadComponent: () => import('./components/historial-asistencia/historial-asistencia.component').then(m => m.HistorialAsistenciaComponent),
                canActivate: [staffGuard],
                title: titleResolver, data: { pageTitle: 'Historial de Asistencia' }
            },
            {
                path: 'admin/puntos-extra',
                loadComponent: () => import('./components/modificar-puntos/modificar-puntos.component').then(m => m.ModificarPuntosComponent),
                canActivate: [staffGuard, gamificationGuard],
                title: titleResolver, data: { pageTitle: 'Modificar Puntos' }
            },
            {
                path: 'galeria-videos',
                loadComponent: () => import('./components/galeria-videos/video-list/video-list.component').then(m => m.VideoListComponent),
                canActivate: [memberGuard, featureGuard('galeria-videos')],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'galeria-videos/subir',
                loadComponent: () => import('./components/galeria-videos/upload-video/upload-video.component').then(m => m.UploadVideoComponent),
                canActivate: [memberGuard, featureGuard('galeria-videos')],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'galeria-fotos',
                loadComponent: () => import('./components/galeria-fotos/photo-list/photo-list.component').then(m => m.PhotoListComponent),
                canActivate: [memberGuard],
                title: titleResolver, data: { pageTitle: 'Fotos del Club' }
            },
            {
                path: 'galeria-fotos/subir',
                loadComponent: () => import('./components/galeria-fotos/upload-photos/upload-photos.component').then(m => m.UploadPhotosComponent),
                canActivate: [memberGuard],
                title: titleResolver, data: { pageTitle: 'Subir Fotos' }
            },
            {
                path: 'recursos',
                loadComponent: () => import('./components/recursos/recursos-list/recursos-list.component').then(m => m.RecursosListComponent),
                canActivate: [memberGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'recursos/nuevo',
                loadComponent: () => import('./components/recursos/recursos-form/recursos-form.component').then(m => m.RecursosFormComponent),
                canActivate: [staffGuard, featureGuard('recursos')],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'recursos/editar/:id',
                loadComponent: () => import('./components/recursos/recursos-form/recursos-form.component').then(m => m.RecursosFormComponent),
                canActivate: [staffGuard, featureGuard('recursos')],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'novedades',
                loadComponent: () => import('./components/novedades/novedades.component').then(m => m.NovedadesComponent),
                canActivate: [memberGuard],
                title: titleResolver, data: { pageTitle: '' }
            },
            {
                path: 'finanzas',
                loadComponent: () => import('./components/finanzas-socio/finanzas-socio.component').then(m => m.FinanzasSocioComponent),
                canActivate: [memberGuard, provisionFondosGuard],
                title: titleResolver, data: { pageTitle: 'Provisión de Fondos' }
            },
            {
                path: 'admin/finanzas',
                loadComponent: () => import('./components/finanzas-gestor/finanzas-gestor.component').then(m => m.FinanzasGestorComponent),
                canActivate: [managerGuard, provisionFondosGuard],
                title: titleResolver, data: { pageTitle: 'Administrar Finanzas' }
            },
            {
                path: 'explorar/salud-deportiva',
                loadComponent: () => import('./components/explorar/salud-deportiva/salud-deportiva').then(m => m.SaludDeportivaComponent),
                canActivate: [memberGuard, featureGuard('salud-canina')],
                title: titleResolver, data: { pageTitle: 'Salud Deportiva' }
            },
            {
                path: 'explorar/liga-norte',
                loadComponent: () => import('./components/clasificacion-liga-norte/clasificacion-liga-norte').then(m => m.ClasificacionLigaNorteComponent),
                canActivate: [memberGuard, ligaNorteGuard],
                title: titleResolver, data: { pageTitle: 'Clasificación Liga Norte' }
            },
            {
                path: 'bitacora-rsce',
                loadComponent: () => import('./components/rsce-tracker/rsce-tracker.component').then(m => m.RsceTrackerComponent),
                canActivate: [memberGuard, featureGuard('modulo-canina')],
                title: titleResolver, data: { pageTitle: 'Seguimiento RSCE' }
            },
            {
                path: 'bitacora-rfec',
                loadComponent: () => import('./components/rfec-tracker/rfec-tracker.component').then(m => m.RfecTrackerComponent),
                canActivate: [memberGuard, featureGuard('modulo-caza')],
                title: titleResolver, data: { pageTitle: 'Seguimiento RFEC' }
            }
        ]
    }
];
