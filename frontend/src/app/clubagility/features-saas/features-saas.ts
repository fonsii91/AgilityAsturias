import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-features-saas',
  standalone: true,
  imports: [],
  templateUrl: './features-saas.html',
  styleUrl: './features-saas.css',
})
export class FeaturesSaas {
  showDetails = signal(false);

  toggleDetails() {
    this.showDetails.update(v => !v);
  }
}
