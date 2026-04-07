import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

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
  releases: ReleaseNote[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<ReleaseNote[]>('novedades.json').subscribe({
      next: (data) => {
        this.releases = data;
      },
      error: (err) => {
        console.error('Error loading Novedades', err);
      }
    });
  }
}
