import { Routes, ResolveFn } from '@angular/router';
import { environment } from '../environments/environment';

const titleResolver: ResolveFn<string> = (route, state) => {
    return `${route.data?.['pageTitle']} | ${environment.clubConfig.name}`;
};
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { staffGuard } from './guards/staff.guard';
import { adminGuard } from './guards/admin.guard';
import { memberGuard } from './guards/member.guard';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'reservas',
        loadComponent: () => import('./reservas/gestionar-reservas/gestionar-reservas.component').then(m => m.GestionarReservasComponent),
        canActivate: [memberGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'mis-reservas',
        loadComponent: () => import('./components/mis-reservas/mis-reservas.component').then(m => m.MisReservasComponent),
        canActivate: [memberGuard],
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
        canActivate: [adminGuard],
        title: 'Estadísticas de Vídeos | Agility Asturias'
    },
    {
        path: 'gestionar-horarios',
        loadComponent: () => import('./reservas/gestionar-horarios/gestionar-horarios.component').then(m => m.GestionarHorariosComponent),
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: 'Gestión de Horarios' }
    },
    {
        path: 'gestionar-competiciones',
        loadComponent: () => import('./components/crud-competicion/crud-competicion.component').then(m => m.CrudCompeticionComponent),
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: '' }
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
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'perfil',
        loadComponent: () => import('./components/perfil/perfil').then(m => m.Perfil),
        canActivate: [authGuard],
        title: titleResolver, data: { pageTitle: '' }
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
        canActivate: [authGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'galeria-videos/subir',
        loadComponent: () => import('./components/galeria-videos/upload-video/upload-video.component').then(m => m.UploadVideoComponent),
        canActivate: [authGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'recursos',
        loadComponent: () => import('./components/recursos/recursos-list/recursos-list.component').then(m => m.RecursosListComponent),
        canActivate: [authGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'recursos/nuevo',
        loadComponent: () => import('./components/recursos/recursos-form/recursos-form.component').then(m => m.RecursosFormComponent),
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'recursos/editar/:id',
        loadComponent: () => import('./components/recursos/recursos-form/recursos-form.component').then(m => m.RecursosFormComponent),
        canActivate: [staffGuard],
        title: titleResolver, data: { pageTitle: '' }
    },
    {
        path: 'novedades',
        loadComponent: () => import('./components/novedades/novedades.component').then(m => m.NovedadesComponent),
        canActivate: [memberGuard],
        title: titleResolver, data: { pageTitle: '' }
    }
];
