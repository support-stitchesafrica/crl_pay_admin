import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const databaseURL = this.configService.get<string>('FIREBASE_DATABASE_URL');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase configuration. Please check your environment variables.');
      }

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });

      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  getFirestore(): admin.firestore.Firestore {
    return this.firebaseApp.firestore();
  }

  getAuth(): admin.auth.Auth {
    return this.firebaseApp.auth();
  }

  getStorage(): admin.storage.Storage {
    return this.firebaseApp.storage();
  }

  getApp(): admin.app.App {
    return this.firebaseApp;
  }
}
