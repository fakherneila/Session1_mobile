# Session1_mobile

Application Ionic React de géolocalisation avec position ponctuelle, suivi continu, carte interactive et historique local.

Author: Fakher Neila  
Class: ING-A3-GL-AL-04  
Module: Mobile Development  
Repository: https://github.com/fakherneila/Session1_mobile.git  
License: MIT

## Features

- Position actuelle avec géolocalisation native ou navigateur
- Suivi continu, durée, points et distance parcourue
- Carte Leaflet avec destination, itinéraire et marqueurs de début/fin
- Historique local filtrable, suppression et distances entre positions
- Synchronisation Firebase optionnelle avec authentification anonyme
- Interface responsive web, Android et iOS

## Tech Stack

Ionic React 7, Capacitor 8, TypeScript, Leaflet, Firebase, Capacitor Preferences et Geolocation.

## Installation

```bash
git clone https://github.com/fakherneila/Session1_mobile.git
cd Session1_mobile
npm install
npm install firebase
```

## Running

```bash
npm start
npm run build
npx cap sync android && npx cap run android
npx cap sync ios && npx cap open ios

Error codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.

---

## Permissions

Android: ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, and android.hardware.location.gps in AndroidManifest.xml.

iOS: NSLocationWhenInUseUsageDescription in Info.plist.

---

## License

MIT License - Copyright (c) 2026 Fakher Neila
```
