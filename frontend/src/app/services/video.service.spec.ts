import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoService } from './video.service';
import { environment } from '../../environments/environment';
import { of } from 'rxjs';
import { HttpParams } from '@angular/common/http';

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';

describe('VideoService', () => {
    let service: VideoService;
    let mockHttpClient: any;
    const apiUrl = `${environment.apiUrl}/videos`;

    beforeEach(() => {
        mockHttpClient = {
            get: vi.fn(),
            post: vi.fn(),
            delete: vi.fn(),
            put: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                VideoService,
                { provide: HttpClient, useValue: mockHttpClient }
            ]
        });

        service = TestBed.inject(VideoService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch videos with pagination and filters', () => {
        const dummyResponse = {
            data: [{ id: 1, title: 'Test Video' }],
            counts: { vertical: 1, horizontal: 0 }
        };
        
        mockHttpClient.get.mockReturnValue(of(dummyResponse));

        service.getVideos(2, { search: 'test', category: 'my_videos' }).subscribe(res => {
            expect(res.data.length).toBe(1);
            expect(res.data[0].title).toBe('Test Video');
        });

        expect(mockHttpClient.get).toHaveBeenCalled();
        const callArgs = mockHttpClient.get.mock.calls[0];
        expect(callArgs[0]).toBe(apiUrl);
        expect(callArgs[1].params.get('page')).toBe('2');
        expect(callArgs[1].params.get('search')).toBe('test');
        expect(callArgs[1].params.get('category')).toBe('my_videos');
    });

    it('should upload a video', () => {
        const mockFormData = new FormData();
        mockFormData.append('title', 'My Video');
        
        const dummyVideo = { id: 1, title: 'My Video', status: 'local' };
        mockHttpClient.post.mockReturnValue(of(dummyVideo));

        service.uploadVideo(mockFormData).subscribe(video => {
            expect(video.id).toBe(1);
            expect(video.title).toBe('My Video');
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith(apiUrl, mockFormData);
    });

    it('should toggle like', () => {
        mockHttpClient.post.mockReturnValue(of({ message: 'Video liked successfully', liked: true }));

        service.toggleLike(1).subscribe(res => {
            expect(res.liked).toBe(true);
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith(`${apiUrl}/1/toggle-like`, {});
    });

    it('should delete a video', () => {
        mockHttpClient.post.mockReturnValue(of({ message: 'Deleted' }));

        service.deleteVideo(1).subscribe(res => {
            expect(res).toBeDefined();
        });

        expect(mockHttpClient.post).toHaveBeenCalledWith(`${apiUrl}/1/delete`, {});
    });
});
