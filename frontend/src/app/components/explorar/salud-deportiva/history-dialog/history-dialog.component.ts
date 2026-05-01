import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DogWorkload } from '../../../../models/dog-workload.model';

export interface HistoryData {
  history: DogWorkload[];
}

@Component({
  selector: 'app-history-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './history-dialog.component.html',
  styleUrls: ['./history-dialog.component.css']
})
export class HistoryDialogComponent {
  dialogRef = inject(MatDialogRef<HistoryDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: HistoryData) {}

  translateSourceType(type: string): string {
    const translations: Record<string, string> = {
      'attendance': 'Clase',
      'competition': 'Competición',
      'manual': 'Agility'
    };
    
    for (const key in translations) {
      if (type.toLowerCase().includes(key)) {
        return translations[key];
      }
    }
    return type;
  }

  getIconForIntensity(level: number): string {
    if (level <= 3) return 'pets'; 
    if (level <= 7) return 'directions_run'; 
    return 'local_fire_department'; 
  }

  edit(workload: DogWorkload) {
    this.dialogRef.close({ action: 'edit', workload });
  }

  delete(id: number) {
    this.dialogRef.close({ action: 'delete', id });
  }

  close() {
    this.dialogRef.close();
  }
}
