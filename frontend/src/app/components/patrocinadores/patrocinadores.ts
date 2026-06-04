import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SponsorService } from '../../services/sponsor.service';

@Component({
    selector: 'app-patrocinadores',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
    template: `
        <div class="sponsors-container">
            <div class="sponsors-header">
                <h2>Nuestros Patrocinadores</h2>
                <p class="subtitle">Marcas y colaboradores que apoyan al club y hacen posible el deporte.</p>
            </div>

            @if (sponsors().length === 0) {
                <div class="empty-state">
                    <div class="empty-icon-wrapper">
                        <span class="material-icons">handshake</span>
                    </div>
                    <p>Aún no se han registrado patrocinadores en este club.</p>
                    <a routerLink="/" class="btn btn-primary">Volver a Inicio</a>
                </div>
            } @else {
                <div class="sponsors-grid">
                    @for (sponsor of sponsors(); track sponsor.id) {
                        <div class="sponsor-card">
                            <div class="sponsor-img-wrapper">
                                @if (sponsor.imagen) {
                                    <img [src]="sponsor.imagen" [alt]="sponsor.nombre" class="sponsor-img">
                                } @else {
                                    <div class="sponsor-placeholder">
                                        <span class="material-icons placeholder-icon">handshake</span>
                                    </div>
                                }
                            </div>
                            <div class="sponsor-info">
                                <h3>{{ sponsor.nombre }}</h3>
                                <p class="sponsor-desc">{{ sponsor.descripcion || 'Sin descripción disponible.' }}</p>
                                @if (sponsor.enlace) {
                                    <a [href]="sponsor.enlace" target="_blank" rel="noopener noreferrer" class="sponsor-link-btn">
                                        <span>Visitar Sitio Web</span>
                                        <span class="material-icons link-arrow">arrow_forward</span>
                                    </a>
                                }
                            </div>
                        </div>
                    }
                </div>
            }
        </div>
    `,
    styles: [`
        :host {
            display: block;
            background-color: var(--surface-background);
            min-height: calc(100vh - 64px);
            padding: 2.5rem 1.5rem;
            font-family: 'Inter', Roboto, sans-serif;
        }

        .sponsors-container {
            max-width: 1100px;
            margin: 0 auto;
        }

        .sponsors-header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .sponsors-header h2 {
            font-size: 2.25rem;
            font-weight: 800;
            color: var(--text-main);
            margin: 0 0 0.5rem 0;
            letter-spacing: -0.025em;
        }

        .sponsors-header .subtitle {
            color: var(--text-secondary);
            font-size: 1.125rem;
            margin: 0;
        }

        .sponsors-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 2rem;
        }

        .sponsor-card {
            background-color: var(--surface-card);
            border-radius: 1.25rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sponsor-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            border-color: #cbd5e1;
        }

        .sponsor-img-wrapper {
            position: relative;
            width: 100%;
            height: 180px;
            background-color: var(--surface-background);
            border-bottom: 1px solid #f1f5f9;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sponsor-img {
            max-width: 85%;
            max-height: 80%;
            object-fit: contain;
            transition: transform 0.3s ease;
        }

        .sponsor-card:hover .sponsor-img {
            transform: scale(1.05);
        }

        .sponsor-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--surface-background);
            color: var(--text-light, #94a3b8);
        }

        .placeholder-icon {
            font-size: 4rem;
        }

        .sponsor-info {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }

        .sponsor-info h3 {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-main);
            margin: 0 0 0.75rem 0;
        }

        .sponsor-desc {
            font-size: 0.95rem;
            color: var(--text-secondary);
            line-height: 1.6;
            margin: 0 0 1.5rem 0;
            flex-grow: 1;
        }

        .sponsor-link-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background-color: var(--primary-color, #0073CF);
            color: #ffffff;
            font-weight: 600;
            font-size: 0.9rem;
            padding: 0.75rem 1.25rem;
            border-radius: 0.75rem;
            text-decoration: none;
            transition: background-color 0.2s, transform 0.1s;
            cursor: pointer;
            margin-top: auto;
            border: none;
        }

        .sponsor-link-btn:hover {
            background-color: var(--primary-blue-dark);
        }

        .sponsor-link-btn:active {
            transform: scale(0.98);
        }

        .link-arrow {
            font-size: 1.1rem;
            transition: transform 0.2s;
        }

        .sponsor-link-btn:hover .link-arrow {
            transform: translateX(3px);
        }

        /* Empty state */
        .empty-state {
            background-color: var(--surface-card);
            border-radius: 1.5rem;
            padding: 4rem 2rem;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            max-width: 500px;
            margin: 2rem auto;
        }

        .empty-icon-wrapper {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background-color: var(--surface-background);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem auto;
        }

        .empty-icon-wrapper span {
            font-size: 3rem;
        }

        .empty-state p {
            font-size: 1.1rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
        }

        .btn-primary {
            background-color: var(--primary-color, #0073CF);
            color: #ffffff;
        }

        .btn-primary:hover {
            background-color: var(--primary-blue-dark);
        }
    `]
})
export class PatrocinadoresComponent {
    private sponsorService = inject(SponsorService);
    sponsors = this.sponsorService.getSponsors();
}
