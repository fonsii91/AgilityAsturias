import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcwrData } from '../../../models/dog-workload.model';
import { WorkloadGaugeComponent } from '../../explorar/salud-deportiva/workload-gauge/workload-gauge';

@Component({
  selector: 'app-athletic-profile-card',
  standalone: true,
  imports: [CommonModule, WorkloadGaugeComponent],
  templateUrl: './athletic-profile-card.component.html',
  styleUrls: ['./athletic-profile-card.component.css']
})
export class AthleticProfileCardComponent {
  dogName = input.required<string>();
  heroImageUrl = input.required<string>();
  acwrData = input.required<AcwrData>();
}
