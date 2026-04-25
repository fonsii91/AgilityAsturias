import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-home-saas',
  standalone: true,
  imports: [],
  templateUrl: './home-saas.html',
  styleUrl: './home-saas.css',
})
export class HomeSaas {
  @Output() viewChange = new EventEmitter<string>();

  goToJoin() {
    this.viewChange.emit('join');
  }
}
