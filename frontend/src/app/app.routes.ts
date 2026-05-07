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

export const routes: Routes = [
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
        path: 'gestor/landing-page',
        loadComponent: () => import('./components/gestor/landing-page-request/landing-page-request.component').then(m => m.LandingPageRequestComponent),
        canActivate: [managerGuard],
        title: titleResolver, data: { pageTitle: 'Diseño Página Bienvenida' }
    },
    {
        path: '',
        component: HomeComponent,
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'reservas',
        loadComponent: () => import('./reservas/gestionar-reservas/gestionar-reservas.component').then(m => m.GestionarReservasComponent),
        canActivate: [memberGuard, featureGuard('reservas-pistas')],
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
                    { path: 'salud', loadComponent: () => import('./components/gestionar-perros').then(m => m.DogHealthComponent) },
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
        path: 'ranking',
        loadComponent: () => import('./components/ranking/ranking.component').then(m => m.RankingComponent),
        canActivate: [memberGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'admin/asistencia',
        loadComponent: () => import('./components/attendance-verification/attendance-verification.component').then(m => m.AttendanceVerificationComponent),
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'admin/puntos-extra',
        loadComponent: () => import('./components/modificar-puntos/modificar-puntos.component').then(m => m.ModificarPuntosComponent),
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: 'Modificar Puntos' }
    },
    {
        path: 'login',
        component: LoginComponent,
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./components/reset-password/reset-password').then(m => m.ResetPasswordComponent),
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'register',
        loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
        title: titleResolver, data: { pageTitle: '' }
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
        path: 'explorar/salud-deportiva',
        loadComponent: () => import('./components/explorar/salud-deportiva/salud-deportiva').then(m => m.SaludDeportivaComponent),
        canActivate: [memberGuard, featureGuard('salud-canina')],
        title: titleResolver, data: { pageTitle: 'Salud Deportiva' }
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
];
