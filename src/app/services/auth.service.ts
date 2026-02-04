import { Injectable, signal, computed } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, onAuthStateChanged, Auth } from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth;
    currentUserSignal = signal<User | null>(null);
    checkAuthLoading = signal<boolean>(true);

    constructor() {
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(environment.firebase);
        }
        this.auth = getAuth(app);

        // Listen for auth state changes
        onAuthStateChanged(this.auth, (user) => {
            this.currentUserSignal.set(user);
            this.checkAuthLoading.set(false);
        });
    }

    getAuthState(): Promise<User | null> {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(this.auth, provider);
            return result.user;
        } catch (error) {
            console.error('Error logging in with Google', error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            this.currentUserSignal.set(null);
        } catch (error) {
            console.error('Error logging out', error);
            throw error;
        }
    }

    isLoggedIn = computed(() => !!this.currentUserSignal());
}
