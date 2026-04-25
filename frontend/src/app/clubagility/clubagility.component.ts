import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarSaas } from './navbar-saas/navbar-saas';
import { HomeSaas } from './home-saas/home-saas';
import { FeaturesSaas } from './features-saas/features-saas';
import { JoinSaas } from './join-saas/join-saas';

@Component({
  selector: 'app-clubagility',
  standalone: true,
  imports: [CommonModule, NavbarSaas, HomeSaas, FeaturesSaas, JoinSaas],
  templateUrl: './clubagility.component.html',
  styleUrl: './clubagility.component.css'
})
export class ClubagilityComponent {
  // Manejo del estado de la vista actual (por defecto 'home')
  currentView = signal<string>('home');
}
