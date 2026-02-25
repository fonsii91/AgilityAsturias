import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface AddPhotoDialogData {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-add-photo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './add-photo-dialog.html',
  styleUrl: './add-photo-dialog.css'
})
export class AddPhotoDialog {
  dialogRef = inject(MatDialogRef<AddPhotoDialog>);
  data: AddPhotoDialogData = inject(MAT_DIALOG_DATA);

  altText: string = 'Foto de galería';

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.dialogRef.close(this.altText);
  }
}
