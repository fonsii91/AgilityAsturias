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

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'reservas', component: GestionarReservasComponent, canActivate: [authGuard] },
    { path: 'contacto', component: ContactoComponent },
    { path: 'galeria', component: GaleriaComponent },
    { path: 'calendario', component: CalendarioComponent, canActivate: [authGuard] },
    { path: 'gestionar-competiciones', component: CrudCompeticionComponent, canActivate: [authGuard] },
    { path: 'perfil', component: Perfil, canActivate: [authGuard] },
    { path: 'login', component: LoginComponent }
];
