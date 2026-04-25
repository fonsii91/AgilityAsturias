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

  changeView(view: string) {
    this.viewChange.emit(view);
  }
}
