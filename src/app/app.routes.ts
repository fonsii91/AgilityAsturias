import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { GestionarReservasComponent } from './reservas/gestionar-reservas/gestionar-reservas.component';
import { ContactoComponent } from './components/contacto/contacto.component';
import { GaleriaComponent } from './components/galeria/galeria.component';
import { CalendarioComponent } from './components/calendario/calendario.component';
import { CrudCompeticionComponent } from './components/crud-competicion/crud-competicion.component';
import { Perfil } from './components/perfil/perfil';
import { authGuard } from './guards/auth.guard';
import { staffGuard } from './guards/staff.guard';
import { adminGuard } from './guards/admin.guard';
import { memberGuard } from './guards/member.guard';
import { AdminUsuariosComponent } from './components/admin-usuarios/admin-usuarios';
import { GestionarMiembrosComponent } from './components/gestionar-miembros/gestionar-miembros';
import { InfoReservasComponent } from './components/info-reservas/info-reservas.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'reservas', component: GestionarReservasComponent, canActivate: [memberGuard] },
    { path: 'contacto', component: ContactoComponent },
    { path: 'galeria', component: GaleriaComponent },
    { path: 'calendario', component: CalendarioComponent, canActivate: [memberGuard] },
    { path: 'gestionar-competiciones', component: CrudCompeticionComponent, canActivate: [staffGuard] },
    { path: 'gestionar-miembros', component: GestionarMiembrosComponent, canActivate: [staffGuard] },
    { path: 'info-reservas', component: InfoReservasComponent, canActivate: [staffGuard] },
    { path: 'perfil', component: Perfil, canActivate: [authGuard] },
    { path: 'admin/usuarios', component: AdminUsuariosComponent, canActivate: [adminGuard] },
    { path: 'login', component: LoginComponent }
];
