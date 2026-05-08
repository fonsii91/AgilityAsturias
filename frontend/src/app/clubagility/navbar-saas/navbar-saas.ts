import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar-saas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar-saas.html',
  styleUrl: './navbar-saas.css',
})
export class NavbarSaas {
  @Input() currentView: string = 'home';
  @Output() viewChange = new EventEmitter<string>();

  isMenuOpen: boolean = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  changeView(view: string) {
    this.isMenuOpen = false;
    this.viewChange.emit(view);
  }
}
