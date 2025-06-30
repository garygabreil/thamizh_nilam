// import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
// import { provideRouter } from '@angular/router';

// import { routes } from './app.routes';
// import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
// import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideZoneChangeDetection({ eventCoalescing: true }),
//     provideRouter(routes),
//     provideFirebaseApp(() =>
//       initializeApp({
//         projectId: 'thamizh-nilam',
//         appId: '1:301787311180:web:7acf8d2d856d679995d8e9',
//         storageBucket: 'thamizh-nilam.firebasestorage.app',
//         apiKey: 'AIzaSyDzMYxWNGSpelreItEjAdEdaNacioRn3aE',
//         authDomain: 'thamizh-nilam.firebaseapp.com',
//         messagingSenderId: '301787311180',
//         measurementId: 'G-H8TG1NHX0E',
//       })
//     ),
//     provideFirestore(() => getFirestore()),
//   ],
// };

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// Recommended: Move this to environment.ts
const firebaseConfig = {
  projectId: 'thamizh-nilam',
  appId: '1:301787311180:web:7acf8d2d856d679995d8e9',
  storageBucket: 'thamizh-nilam.firebasestorage.app',
  apiKey: 'AIzaSyDzMYxWNGSpelreItEjAdEdaNacioRn3aE',
  authDomain: 'thamizh-nilam.firebaseapp.com',
  messagingSenderId: '301787311180',
  measurementId: 'G-H8TG1NHX0E',
  // Add if you use Realtime Database
  // databaseURL: 'https://thamizh-nilam.firebaseio.com'
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => {
      try {
        return initializeApp(firebaseConfig);
      } catch (error) {
        console.error('Firebase initialization error', error);
        throw error;
      }
    }),
    provideFirestore(() => {
      try {
        return getFirestore();
      } catch (error) {
        console.error('Firestore initialization error', error);
        throw error;
      }
    }),
  ],
};
