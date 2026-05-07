import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { AnalyticsService } from '../../services/analytics.service';

export interface ReleaseNote {
  version: string;
  date: string;
  features: string[];
  bugfixes: string[];
  warnings?: string[];
}

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './novedades.component.html',
  styleUrls: ['./novedades.component.css']
})
export class NovedadesComponent implements OnInit {
  releases = signal<ReleaseNote[]>([]);
  clubConfig = environment.clubConfig;

  constructor(
    private http: HttpClient,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.analytics.logSystemAction('changelog_viewed');
    this.http.get<ReleaseNote[]>('novedades.json').subscribe({
      next: (data) => {
        this.releases.set(data);
      },
      error: (err) => {
        console.error('Error loading Novedades', err);
      }
    });
  }
}
