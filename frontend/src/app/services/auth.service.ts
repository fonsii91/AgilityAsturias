import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap, catchError, of, Observable, firstValueFrom, map } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'member' | 'staff' | 'manager' | 'admin';
    photo_url?: string;
    google_id?: string;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
    rfec_license?: string;
    rfec_expiration_date?: string;
    // Compatibility fields
    uid?: number; // alias for id
    displayName?: string; // alias for name
    photoURL?: string; // alias for photo_url
}

export type UserProfile = User;

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private apiUrl = environment.apiUrl;

    currentUserSignal = signal<User | null>(null);
    isLoading = signal<boolean>(false);
    checkAuthLoading = signal<boolean>(true);

    // Compatibility Signal
    userProfileSignal = computed(() => this.currentUserSignal());

    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        const handoff = urlParams.get('handoff');
        if (handoff) {
            this.consumeClubHandoff(handoff);
            return;
        }

        this.checkAuth();
    }

    private consumeClubHandoff(handoff: string) {
        this.checkAuthLoading.set(true);

        this.http.post<AuthResponse>(`${this.apiUrl}/club-handoff`, { handoff }).subscribe({
            next: (response) => {
                localStorage.setItem('access_token', response.access_token);
                this.currentUserSignal.set(this.mapUser(response.user));
                this.isLoading.set(false);
                this.removeUrlParam('handoff');
                this.checkAuthLoading.set(false);
            },
            error: () => {
                this.handleAuthLogout();
                this.isLoading.set(false);
                this.removeUrlParam('handoff');
                this.checkAuthLoading.set(false);
            }
        });
    }

    private removeUrlParam(param: string) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete(param);
        const newSearch = urlParams.toString();
        const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
    }

    private checkAuth() {
        const token = localStorage.getItem('access_token');
        if (token) {
            this.fetchUser().subscribe({
                next: () => this.checkAuthLoading.set(false),
                error: () => this.checkAuthLoading.set(false)
            });
        } else {
            this.checkAuthLoading.set(false);
        }
    }

    login(credentials: { email: string, password: string }): Observable<AuthResponse> {
        this.isLoading.set(true);
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                this.handleAuthSuccess(response);
            }),
            catchError(error => {
                this.isLoading.set(false);
                throw error;
            })
        );
    }

    register(data: { name: string, email: string, password: string }): Observable<AuthResponse> {
        this.isLoading.set(true);
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
            tap(response => {
                this.handleAuthSuccess(response);
            }),
            catchError(error => {
                this.isLoading.set(false);
                throw error;
            })
        );
    }

    logout(): Promise<void> {
        const token = localStorage.getItem('access_token');
        if (token) {
            this.http.post(`${this.apiUrl}/logout`, {}, {
                headers: new HttpHeaders({
                    'Authorization': `Bearer ${token}`
                })
            }).subscribe();
        }

        this.handleAuthLogout();
        this.router.navigate(['/login']);
        return Promise.resolve();
    }

    private fetchUser(): Observable<User> {
        const token = localStorage.getItem('access_token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        return this.http.get<User>(`${this.apiUrl}/user`, { headers }).pipe(
            map(user => this.mapUser(user)),
            tap(user => {
                this.currentUserSignal.set(user);
                this.isLoading.set(false);
            }),
            catchError(error => {
                this.handleAuthLogout();
                this.isLoading.set(false);
                return of(null as any);
            })
        );
    }

    // Add compatibility mapping
    private mapUser(user: User): User {
        return {
            ...user,
            uid: user.id,
            displayName: user.name,
            photoURL: user.photo_url
        };
    }

    private handleAuthSuccess(response: AuthResponse) {
        localStorage.setItem('access_token', response.access_token);
        const mappedUser = this.mapUser(response.user);
        this.currentUserSignal.set(mappedUser);
        this.isLoading.set(false);
        
        if (['member', 'staff', 'manager', 'admin'].includes(mappedUser.role)) {
            this.router.navigate(['/calendario']);
        } else {
            this.router.navigate(['/perfil']);
        }
    }

    private handleAuthLogout() {
        localStorage.removeItem('access_token');
        this.currentUserSignal.set(null);
    }

    refreshUserState(): Observable<User> {
        return this.fetchUser();
    }

    // Admin / Member management methods
    getAllUsers(): Promise<User[]> {
        return firstValueFrom(this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
            map(users => users.map(u => this.mapUser(u)))
        ));
    }

    getMinimalUsers(): Promise<{id: number, name: string, email: string}[]> {
        return firstValueFrom(this.http.get<{id: number, name: string, email: string}[]>(`${this.apiUrl}/users/minimal`));
    }

    updateUserRole(userId: number, role: string): Promise<any> {
        return firstValueFrom(this.http.post(`${this.apiUrl}/users/${userId}/role`, { role }));
    }

    deleteUser(userId: number): Promise<any> {
        return firstValueFrom(this.http.post(`${this.apiUrl}/users/${userId}/delete`, {}));
    }

    async updateProfile(name: string, photo?: File, rfec_license?: string, rfec_expiration_date?: string): Promise<void> {
        const formData = new FormData();
        formData.append('name', name);
        if (photo) {
            formData.append('photo', photo);
        }
        if (rfec_license !== undefined) {
            formData.append('rfec_license', rfec_license);
        }
        if (rfec_expiration_date !== undefined) {
            formData.append('rfec_expiration_date', rfec_expiration_date);
        }

        // The server was occasionally blocking PUT/DELETE, so the backend was updated to explicitly expect POST.
        // We no longer need to spoof with _method=PUT.

        await firstValueFrom(this.http.post(`${this.apiUrl}/user/profile`, formData));
        // Refresh user
        this.fetchUser().subscribe();
    }

    generateResetLink(userId: number): Promise<{ link: string, message: string }> {
        return firstValueFrom(this.http.post<{ link: string, message: string }>(`${this.apiUrl}/users/${userId}/generate-reset-link`, {}));
    }

    resetPassword(data: { token: string, password: string, password_confirmation: string }): Promise<{ message: string }> {
        return firstValueFrom(this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, data));
    }

    // Deprecated alias, kept for compatibility if needed, but redirected to new method
    async updateDisplayName(name: string): Promise<void> {
        return this.updateProfile(name);
    }

    getAuthState(): Promise<User | null> {
        return new Promise((resolve) => {
            // If loading, wait? Or just return current logic?
            // Simple version:
            resolve(this.currentUserSignal());
        });
    }

    isLoggedIn = computed(() => !!this.currentUserSignal());

    isMember = computed(() => {
        const user = this.currentUserSignal();
        return ['member', 'staff', 'manager', 'admin'].includes(user?.role || '');
    });

    isStaff = computed(() => {
        const user = this.currentUserSignal();
        return ['staff', 'manager', 'admin'].includes(user?.role || '');
    });

    isAdmin = computed(() => {
        const user = this.currentUserSignal();
        return user?.role === 'admin';
    });

    isManager = computed(() => {
        const user = this.currentUserSignal();
        return ['manager', 'admin'].includes(user?.role || '');
    });
}
