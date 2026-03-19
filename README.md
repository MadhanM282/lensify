# lensify

React Native (Expo) app for an eye care hospital with **per-user login** and contact lens features. Includes a **Node.js backend** for auth and lens records.

## Features

- **Individual user login** – Sign in / register; backend stores users and issues JWT.
- **Contact lens details** – Record and store (HVID, DIA, BC, power, tint/colored lens, etc.).
- **Spectacle → contact lens power conversion** (rules: ±4.00 no change; above ±4.00 converted).
- **Records** – View and delete saved lens records (per user, from server).
- **Dashboard**, **Profile**, **Power converter**.

## Run the backend

```bash
cd server
npm install
npm start
```

API runs at **http://localhost:3000**.

Server env variables (see `server/.env.example`):
- `PORT`
- `JWT_SECRET`
- `MONGODB_URI`
- `CORS_ORIGIN` (`*` for dev, comma-separated allow-list for production)

## Run the app

```bash
npm install
npm start
```

`npm start` now launches both:
- backend (`server/index.js`)
- Expo frontend

Then open in Expo Go or a simulator. The app talks to the backend at:

- **iOS Simulator**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000`
- **Physical device (Expo Go)**: set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:3000` (e.g. in `.env`) so the device can reach your machine.

### Important for installed APK

When you install an APK, it cannot reach `localhost` on your computer.  
Set `EXPO_PUBLIC_API_URL` to a reachable backend URL before building the APK (LAN IP for same network testing, or a public server URL for real use).

## Share APK With Others

1. Deploy backend publicly (Render/Railway/EC2, etc.) and keep it running 24/7.
2. Set app API URL for build:
   - copy `.env.example` to `.env`
   - set `EXPO_PUBLIC_API_URL=https://your-public-backend.example.com`
3. Build APK:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
4. Share the generated APK link/file.
5. Anyone installing the APK can use the app as long as your backend URL is live.

## Tech stack

- **App**: Expo (SDK 54), Expo Router, TypeScript, AsyncStorage (for token + user).
- **Backend**: Node.js, Express, MongoDB Atlas (Mongoose), JWT (jsonwebtoken), bcrypt.

## Notes

- Backend must be running for login, register, and lens records.
- Backend persists data to MongoDB Atlas (`MONGODB_URI` in `server/.env`).
