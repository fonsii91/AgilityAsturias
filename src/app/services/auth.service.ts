import { Injectable, signal, computed } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, Firestore, collection, getDocs, updateDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: 'user' | 'member' | 'staff' | 'admin';
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth;
    private firestore: Firestore;

    currentUserSignal = signal<User | null>(null);
    userProfileSignal = signal<UserProfile | null>(null);
    checkAuthLoading = signal<boolean>(true);

    constructor() {
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(environment.firebase);
        }
        this.auth = getAuth(app);
        this.firestore = getFirestore(app);

        // Listen for auth state changes
        onAuthStateChanged(this.auth, async (user) => {
            this.currentUserSignal.set(user);

            if (user) {
                await this.fetchUserProfile(user);
            } else {
                this.userProfileSignal.set(null);
            }

            this.checkAuthLoading.set(false);
        });
    }

    private async fetchUserProfile(user: User) {
        const userRef = doc(this.firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            this.userProfileSignal.set(userSnap.data() as UserProfile);
        } else {
            // Create default profile for new user
            const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                role: 'user' // Default role
            };
            await setDoc(userRef, newProfile);
            this.userProfileSignal.set(newProfile);
        }
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
            this.userProfileSignal.set(null);
        } catch (error) {
            console.error('Error logging out', error);
            throw error;
        }
    }

    isLoggedIn = computed(() => !!this.currentUserSignal());

    isMember = computed(() => {
        const profile = this.userProfileSignal();
        return ['member', 'staff', 'admin'].includes(profile?.role || '');
    });

    isStaff = computed(() => {
        const profile = this.userProfileSignal();
        return ['staff', 'admin'].includes(profile?.role || '');
    });

    isAdmin = computed(() => {
        const profile = this.userProfileSignal();
        return profile?.role === 'admin';
    });

    async getAllUsers(): Promise<UserProfile[]> {
        // Warning: This reads ALL users. In a large app, you'd want pagination.
        const usersRef = collection(this.firestore, 'users');
        const snapshot = await getDocs(usersRef);
        return snapshot.docs.map(doc => doc.data() as UserProfile);
    }

    async updateUserRole(uid: string, newRole: 'user' | 'member' | 'staff' | 'admin') {
        const userRef = doc(this.firestore, 'users', uid);
        await updateDoc(userRef, { role: newRole });

        // If updating self, update local signal
        const currentUser = this.currentUserSignal();
        if (currentUser && currentUser.uid === uid) {
            const currentProfile = this.userProfileSignal();
            if (currentProfile) {
                this.userProfileSignal.set({ ...currentProfile, role: newRole });
            }
        }
    }

    async updateDisplayName(newName: string) {
        const user = this.auth.currentUser;
        if (!user) throw new Error('No user logged in');

        // 1. Update Firestore
        const userRef = doc(this.firestore, 'users', user.uid);
        await updateDoc(userRef, { displayName: newName });

        // 2. Update Firebase Auth Profile (so currentUserSignal eventually reflects it, though we might need to reload)
        // Note: we need to import updateProfile from firebase/auth
        await import('firebase/auth').then(m => m.updateProfile(user, { displayName: newName }));

        // 3. Update local signals immediately for UI responsiveness
        const currentProfile = this.userProfileSignal();
        if (currentProfile) {
            this.userProfileSignal.set({ ...currentProfile, displayName: newName });
        }

        // Force signal update for currentUser if needed, or just let it be. 
        // Typically updateProfile doesn't trigger onAuthStateChanged immediately. 
        // We can manually emit a new value if we want strict consistency, 
        // but easier to rely on userProfileSignal for UI.
    }
}
