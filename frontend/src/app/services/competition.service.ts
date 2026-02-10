import { Injectable, signal, OnDestroy } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, Unsubscribe, Firestore } from 'firebase/firestore';
import { Competition } from '../models/competition.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CompetitionService implements OnDestroy {
    private firestore: Firestore;
    private competitionsSignal = signal<Competition[]>([]);
    private unsubscribe: Unsubscribe | null = null;

    constructor() {
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(environment.firebase);
        }
        this.firestore = getFirestore(app);

        const colRef = collection(this.firestore, 'competitions');
        // Subscribe to real-time updates
        this.unsubscribe = onSnapshot(colRef, (snapshot) => {
            const comps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Competition[];
            this.competitionsSignal.set(comps);
        }, (error) => {
            console.error("Error reading competitions:", error);
        });
    }

    ngOnDestroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    getCompetitions() {
        return this.competitionsSignal;
    }

    addCompetition(comp: Omit<Competition, 'id'>) {
        const colRef = collection(this.firestore, 'competitions');
        return addDoc(colRef, comp);
    }

    updateCompetition(updatedComp: Competition) {
        const compDoc = doc(this.firestore, `competitions/${updatedComp.id}`);
        const { id, ...data } = updatedComp;
        return updateDoc(compDoc, data as any);
    }

    deleteCompetition(id: string) {
        const compDoc = doc(this.firestore, `competitions/${id}`);
        return deleteDoc(compDoc);
    }
}
