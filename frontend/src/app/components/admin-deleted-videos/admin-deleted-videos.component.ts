import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { VideoService } from '../../services/video.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-admin-deleted-videos',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    DatePipe
  ],
  templateUrl: './admin-deleted-videos.component.html',
  styleUrls: ['./admin-deleted-videos.component.css']
})
export class AdminDeletedVideosComponent implements OnInit {
  historyList = signal<any[]>([]);
  totalItems = signal<number>(0);
  pageSize = signal<number>(20);
  currentPage = signal<number>(1);
  isLoading = signal<boolean>(true);

  displayedColumns: string[] = ['date', 'video_date', 'title', 'competition', 'manga', 'dog', 'uploader', 'deleted_by', 'status'];

  constructor(private videoService: VideoService) {}

  ngOnInit() {
    this.loadHistory(1);
  }

  loadHistory(page: number) {
    this.isLoading.set(true);
    this.videoService.getDeletedVideosHistory(page).subscribe({
      next: (res) => {
        this.historyList.set(res.data);
        this.totalItems.set(res.total);
        this.pageSize.set(res.per_page);
        this.currentPage.set(res.current_page);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading deleted videos history', err);
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.loadHistory(event.pageIndex + 1);
  }
}
