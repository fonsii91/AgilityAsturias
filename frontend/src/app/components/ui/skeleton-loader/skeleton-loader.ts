import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  imports: [CommonModule],
  templateUrl: './skeleton-loader.html',
  styleUrl: './skeleton-loader.css',
})
export class SkeletonLoader {
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() shape: 'rect' | 'circle' = 'rect';
}
