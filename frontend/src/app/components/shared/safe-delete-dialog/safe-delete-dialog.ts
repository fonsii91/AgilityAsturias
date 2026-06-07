import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface SafeDeleteDialogData {
  title: string;
  message: string;
  expectedValue: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-safe-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule
  ],
  templateUrl: './safe-delete-dialog.html',
  styleUrl: './safe-delete-dialog.css'
})
export class SafeDeleteDialog {
  dialogRef = inject(MatDialogRef<SafeDeleteDialog>);
  data: SafeDeleteDialogData = inject(MAT_DIALOG_DATA);

  userInput: string = '';

  get isValid(): boolean {
    return this.userInput.trim().toLowerCase() === this.data.expectedValue.trim().toLowerCase();
  }

  onConfirm(): void {
    if (this.isValid) {
      this.dialogRef.close(true);
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
