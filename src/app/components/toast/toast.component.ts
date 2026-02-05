import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [ngClass]="toast.type" (click)="toastService.remove(toast.id)">
          <div class="toast-icon">
            @if (toast.type === 'success') { <span>✓</span> }
            @else if (toast.type === 'error') { <span>✕</span> }
            @else if (toast.type === 'warning') { <span>⚠</span> }
            @else { <span>ℹ</span> }
          </div>
          <div class="toast-content">
            {{ toast.message }}
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none; /* Let clicks pass through context */
    }

    .toast {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px 24px;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
      border-left: 6px solid #ccc;
      transition: transform 0.2s, opacity 0.2s;
    }

    .toast:hover {
      transform: translateY(-2px);
      opacity: 0.95;
    }

    .toast.success { border-left-color: #10b981; }
    .toast.success .toast-icon { color: #10b981; background: rgba(16, 185, 129, 0.1); }

    .toast.error { border-left-color: #ef4444; }
    .toast.error .toast-icon { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

    .toast.warning { border-left-color: #f59e0b; }
    .toast.warning .toast-icon { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }

    .toast.info { border-left-color: #3b82f6; }
    .toast.info .toast-icon { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

    .toast-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-family: monospace;
    }

    .toast-content {
      color: #333;
      font-weight: 500;
      font-size: 0.95rem;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
  `]
})
export class ToastComponent {
    toastService = inject(ToastService);
}
