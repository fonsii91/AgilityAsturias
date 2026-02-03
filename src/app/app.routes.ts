import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { HomeComponent } from './components/home/home.component';
import { GestionarReservasComponent } from './reservas/gestionar-reservas/gestionar-reservas.component';
import { ContactoComponent } from './components/contacto/contacto.component';
import { GaleriaComponent } from './components/galeria/galeria.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'reservas', component: GestionarReservasComponent },
    { path: 'contacto', component: ContactoComponent },
    { path: 'galeria', component: GaleriaComponent }
];
