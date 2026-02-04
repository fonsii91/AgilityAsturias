import { Injectable, signal, OnDestroy } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, deleteDoc, query, where, onSnapshot, Unsubscribe, Firestore } from 'firebase/firestore';
import { Reservation } from '../models/reservation.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReservationService implements OnDestroy {
    private firestore: Firestore;
    private reservationsSignal = signal<Reservation[]>([]);
    private unsubscribe: Unsubscribe | null = null;

    constructor() {
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(environment.firebase);
        }
        this.firestore = getFirestore(app);

        // Listen to ALL reservations initially (filtering could be improved for scale later)
        const colRef = collection(this.firestore, 'reservations');

        this.unsubscribe = onSnapshot(colRef, (snapshot) => {
            const res = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reservation[];
            this.reservationsSignal.set(res);
        }, (error) => {
            console.error("Error reading reservations:", error);
        });
    }

    ngOnDestroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    getReservations() {
        return this.reservationsSignal;
    }

    async addReservation(res: Omit<Reservation, 'id'>) {
        const colRef = collection(this.firestore, 'reservations');
        return await addDoc(colRef, res);
    }

    async deleteReservation(id: string) {
        const docRef = doc(this.firestore, `reservations/${id}`);
        return await deleteDoc(docRef);
    }
}
