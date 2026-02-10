import { Injectable, signal, OnDestroy } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, deleteDoc, query, where, onSnapshot, Unsubscribe, Firestore } from 'firebase/firestore';
import { Dog } from '../models/dog.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class DogService implements OnDestroy {
    private firestore: Firestore;
    // Signal para almacenar los perros del usuario actual
    private dogsSignal = signal<Dog[]>([]);
    private unsubscribe: Unsubscribe | null = null;

    constructor() {
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(environment.firebase);
        }
        this.firestore = getFirestore(app);
    }

    // Iniciar escucha de perros para un usuario específico
    subscribeToUserDogs(userId: string) {
        // Limpiar suscripción anterior si existe
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const colRef = collection(this.firestore, 'dogs');
        const q = query(colRef, where('userId', '==', userId));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const dogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Dog[];
            this.dogsSignal.set(dogs);
        }, (error) => {
            console.error("Error reading dogs:", error);
        });
    }

    ngOnDestroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    getDogs() {
        return this.dogsSignal;
    }

    async addDog(dog: Omit<Dog, 'id'>) {
        const colRef = collection(this.firestore, 'dogs');
        return await addDoc(colRef, dog);
    }

    async deleteDog(id: string) {
        const docRef = doc(this.firestore, `dogs/${id}`);
        return await deleteDoc(docRef);
    }
}
