# Session1_mobile

Ionic React app demonstrating geolocation (one-shot + continuous tracking) with Capacitor.

Author: Fakher Neila  
Class: ING-A3-GL-AL-04   
Module: Mobile Development  
```
Repository: https://github.com/fakherneila/Session1_mobile.git 
``` 
License: MIT

---

## Features

- One-shot position retrieval
- Continuous tracking with live counter and duration
- Platform detection (web vs native)
- Web fallback to the browser Geolocation API
- Responsive UI (portrait, tablet, desktop)
- Light and dark mode support

---

## Tech Stack

Ionic React 7, Capacitor 8, TypeScript, @capacitor/geolocation, CSS3.

---

## Installation

```
git clone https://github.com/fakherneila/Session1_mobile.git
cd Session1_mobile
npm install
```

---

## Running

Web: 
```
ionic serve (open http://localhost:8100)
```

Web on phone: 
```
ionic serve --external
``` 
then
```
 adb reverse tcp:8100 tcp:8100
```
  and 
  ```
  open http://localhost:8100
   ```

Android: 
===============
```
npm run build && npx cap sync android && npx cap run android
```

# iOS: 
```
npm run build && npx cap sync ios && npx cap open ios
```

---

## Geolocation

Uses @capacitor/geolocation on native and navigator.geolocation on web, selected at runtime with Capacitor.isNativePlatform().

Error codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.

---

## Permissions

Android: ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, and android.hardware.location.gps in AndroidManifest.xml.

iOS: NSLocationWhenInUseUsageDescription in Info.plist.

---

## License

MIT License - Copyright (c) 2026 Fakher Neila