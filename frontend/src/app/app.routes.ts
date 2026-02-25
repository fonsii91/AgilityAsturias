import { Routes } from '@angular/router';
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
        title: 'Inicio | Agility Asturias'
    },
    {
        path: 'reservas',
        loadComponent: () => import('./reservas/gestionar-reservas/gestionar-reservas.component').then(m => m.GestionarReservasComponent),
        canActivate: [memberGuard],
        title: 'Reservas | Agility Asturias'
    },
    {
        path: 'mis-reservas',
        loadComponent: () => import('./components/mis-reservas/mis-reservas.component').then(m => m.MisReservasComponent),
        canActivate: [memberGuard],
        title: 'Mis Reservas | Agility Asturias'
    },
    {
        path: 'contacto',
        loadComponent: () => import('./components/contacto/contacto.component').then(m => m.ContactoComponent),
        title: 'Contacto | Agility Asturias'
    },
    {
        path: 'galeria',
        loadComponent: () => import('./components/galeria/galeria.component').then(m => m.GaleriaComponent),
        title: 'Galería | Agility Asturias'
    },
    {
        path: 'calendario',
        loadComponent: () => import('./components/calendario/calendario.component').then(m => m.CalendarioComponent),
        canActivate: [memberGuard],
        title: 'Calendario | Agility Asturias'
    },
    {
        path: 'gestionar-competiciones',
        loadComponent: () => import('./components/crud-competicion/crud-competicion.component').then(m => m.CrudCompeticionComponent),
        canActivate: [staffGuard],
        title: 'Gestión Competiciones | Agility Asturias'
    },
    {
        path: 'gestionar-miembros',
        loadComponent: () => import('./components/gestionar-miembros/gestionar-miembros').then(m => m.GestionarMiembrosComponent),
        canActivate: [staffGuard],
        title: 'Gestión Miembros | Agility Asturias'
    },
    {
        path: 'info-reservas',
        loadComponent: () => import('./components/info-reservas/info-reservas.component').then(m => m.InfoReservasComponent),
        canActivate: [staffGuard],
        title: 'Info Reservas | Agility Asturias'
    },
    {
        path: 'perfil',
        loadComponent: () => import('./components/perfil/perfil').then(m => m.Perfil),
        canActivate: [authGuard],
        title: 'Mi Perfil | Agility Asturias'
    },
    {
        path: 'admin/usuarios',
        loadComponent: () => import('./components/admin-usuarios/admin-usuarios').then(m => m.AdminUsuariosComponent),
        canActivate: [adminGuard],
        title: 'Admin Usuarios | Agility Asturias'
    },
    {
        path: 'ranking',
        loadComponent: () => import('./components/ranking/ranking.component').then(m => m.RankingComponent),
        canActivate: [memberGuard],
        title: 'Ranking | Agility Asturias'
    },
    {
        path: 'admin/asistencia',
        loadComponent: () => import('./components/attendance-verification/attendance-verification.component').then(m => m.AttendanceVerificationComponent),
        canActivate: [staffGuard],
        title: 'Verificar Asistencia | Agility Asturias'
    },
    {
        path: 'login',
        component: LoginComponent,
        title: 'Iniciar Sesión | Agility Asturias'
    },
    {
        path: 'register',
        loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
        title: 'Registrarse | Agility Asturias'
    }
];
