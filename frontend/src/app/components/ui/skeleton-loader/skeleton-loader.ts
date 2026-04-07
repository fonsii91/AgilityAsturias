import { Component, input } from '@angular/core';


@Component({
  selector: 'app-skeleton-loader',
  imports: [],
  templateUrl: './skeleton-loader.html',
  styleUrl: './skeleton-loader.css',
})
export class SkeletonLoader {
  readonly width = input<string>('100%');
  readonly height = input<string>('20px');
  readonly shape = input<'rect' | 'circle'>('rect');
}
