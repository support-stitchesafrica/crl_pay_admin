import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.config';

@Global()
@Module({
  providers: [
    FirebaseService,
    {
      provide: 'FIRESTORE',
      useFactory: (firebaseService: FirebaseService) => {
        return firebaseService.getFirestore();
      },
      inject: [FirebaseService],
    },
  ],
  exports: [FirebaseService, 'FIRESTORE'],
})
export class FirebaseModule {}
